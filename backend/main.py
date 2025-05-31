from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Optional
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import httpx
import logging
import uuid
import os

from openai import AsyncOpenAI
from prompts import ResumePrompts

# --- Load environment ---
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# --- Setup OpenAI Client ---
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# --- Configure Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[logging.FileHandler("file_uploads.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# --- FastAPI App ---
app = FastAPI(title="ResumeTuner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://resume-tuner-two.vercel.app", 
                    "https://resume-tuner-0xcompileerrors-projects.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory File Store ---
memory_store: Dict[str, str] = {}


# --- Utility to extract job description from HTML ---
def extract_job_text_flexibly(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    known = soup.select_one("[data-testid='job-detail-page__job-body']")
    if known:
        return known.get_text(separator="\n", strip=True)

    for candidate in soup.find_all(["section", "div", "article"], recursive=True):
        text = candidate.get_text(separator="\n", strip=True)
        if (
            len(text) > 500
            and "apply" in text.lower()
            and "responsibilities" in text.lower()
        ):
            return text

    raise ValueError("Could not reliably extract job description from HTML.")


# --- Upload File API ---
@app.post("/upload/")
async def upload_txt_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are allowed.")

    content = await file.read()
    try:
        decoded = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded.")

    file_id = str(uuid.uuid4())
    memory_store[file_id] = decoded
    logger.info(f"Uploaded {file.filename} | ID: {file_id}\n{decoded}")
    return {"message": "Upload successful", "file_id": file_id}


# --- Retrieve File Content ---
@app.get("/file/{file_id}")
async def get_file_content(file_id: str):
    content = memory_store.get(file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found in memory.")
    return JSONResponse(content={"file_id": file_id, "content": content})


# --- Resume Analyzer ---
@app.post("/analyze/")
async def analyze_resume_and_job(
    resume: UploadFile = File(...),
    job: Optional[UploadFile] = File(None),
    latex_format: Optional[UploadFile] = File(None),
    job_url: Optional[str] = Form(None),
    latex: bool = Query(default=False, description="Return LaTeX formatted output"),
):
    prompts = ResumePrompts()

    try:
        # --- Step 0: Read Resume ---
        resume_text = (await resume.read()).decode("utf-8")

        # --- Step 1: Load Job Description ---
        job_text = None
        if job:
            if not job.filename.endswith(".txt"):
                raise HTTPException(status_code=400, detail="Expected 'job.txt'")
            job_bytes = await job.read()
            if not job_bytes:
                raise HTTPException(status_code=400, detail="Job file is empty.")
            job_text = job_bytes.decode("utf-8")
        elif job_url:
            async with httpx.AsyncClient() as http:
                response = await http.get(job_url, timeout=20)
                response.raise_for_status()
                job_text = extract_job_text_flexibly(response.text)
        else:
            raise HTTPException(
                status_code=400, detail="Provide a job file or job_url."
            )

        logger.info(f"Job description loaded successfully")

        # --- Optional LaTeX template ---
        latex_template = ""
        if latex_format:
            try:
                latex_template = (await latex_format.read()).decode("utf-8")
            except:
                raise HTTPException(
                    status_code=400, detail="Could not read LaTeX template."
                )

        # --- Step 2: Analyze the Job Description ---
        step1 = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompts.job_description_analysis_prompt},
                {"role": "user", "content": f"Job:\n{job_text}"},
            ],
            temperature=0.2,
        )
        job_analysis = step1.choices[0].message.content
        logger.info("Step 1: Job Description Analysis Complete")

        # --- Step 3: Resume Matching ---
        step2 = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompts.resume_matching_prompt},
                {
                    "role": "user",
                    "content": f"Current Resume:\n{resume_text}\n\nJob Description Analysis:\n{job_analysis}",
                },
            ],
            temperature=0.2,
        )
        matching_analysis = step2.choices[0].message.content
        logger.info("Step 2: Resume Matching Complete")

        # --- Step 4: Rewrite Summary & Skills ---
        step3 = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompts.resume_summary_skills_prompt},
                {
                    "role": "user",
                    "content": f"Current Resume:\n{resume_text}\n\nJob Description Analysis:\n{job_analysis}\n\nResume Matching Insights:\n{matching_analysis}",
                },
            ],
            temperature=0.2,
        )
        summary_skills = step3.choices[0].message.content
        logger.info("Step 3: Summary & Skills Rewrite Complete")

        # --- Step 5: Refine Experience Section ---
        step4 = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": prompts.resume_experience_refinement_prompt,
                },
                {
                    "role": "user",
                    "content": f"Current Resume:\n{resume_text}\n\nJob Description Analysis:\n{job_analysis}\n\nResume Matching Insights:\n{matching_analysis}",
                },
            ],
            temperature=0.2,
        )
        experience_section = step4.choices[0].message.content
        logger.info("Step 4: Experience Rewrite Complete")

        # --- Step 6: Assemble Final Resume ---
        step5 = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompts.final_resume_assembly_prompt},
                {
                    "role": "user",
                    "content": f"Summary and Skills section:\n{summary_skills}\n\nExperience section:\n{experience_section}",
                },
            ],
            temperature=0.2,
        )
        final_resume = step5.choices[0].message.content
        logger.info("Step 5: Resume Assembly Complete")

        # --- Step 7: Optimize for All Screeners ---
        step6 = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompts.final_resume_optimization_prompt},
                {
                    "role": "user",
                    "content": f"Full Resume:\n{final_resume}\n\nJob Description Analysis:\n{job_analysis}",
                },
            ],
            temperature=0.2,
        )
        optimized_resume = step6.choices[0].message.content
        logger.info("Step 6: Final Optimization Complete")

        # --- Optional: LaTeX Formatting ---
        if latex:
            format_prompt = f'Format the resume in LaTeX using this style:\n{latex_template}'
            latex_result = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": format_prompt},
                    {
                        "role": "user",
                        "content": f"Current Version:\n{optimized_resume}",
                    },
                ],
                temperature=0.3,
            )
            return PlainTextResponse(
                content=latex_result.choices[0].message.content,
                media_type="application/x-latex",
                headers={
                    "Content-Disposition": 'attachment; filename="optimized_resume.tex"'
                },
            )

        return JSONResponse(content={"optimized_resume": optimized_resume})

    except Exception as e:
        logger.exception("Resume optimization workflow failed.")
        raise HTTPException(
            status_code=500, detail=f"Failed to complete resume analysis: {str(e)}"
        )
