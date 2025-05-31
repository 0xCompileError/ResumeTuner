from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from typing import Dict
import uuid
import logging
from dotenv import load_dotenv
import os
import openai
from prompts import ResumePrompts
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler("file_uploads.log"),  # Logs to a file
        logging.StreamHandler(),  # Also prints to console
    ],
)
logger = logging.getLogger(__name__)

load_dotenv()  # Load .env if present
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


app = FastAPI(title="ResumeTuner")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for uploaded files: {file_id: file_content}
memory_store: Dict[str, str] = {}


@app.post("/upload/")
async def upload_txt_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are allowed.")

    content = await file.read()
    try:
        decoded_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding must be UTF-8.")

    file_id = str(uuid.uuid4())
    memory_store[file_id] = decoded_content

    # Log file content
    logger.info(
        f"File ID: {file_id}, Filename: {file.filename}, Content:\n{decoded_content}"
    )

    return {"message": "File uploaded successfully.", "file_id": file_id}


@app.get("/file/{file_id}")
async def get_file_content(file_id: str):
    content = memory_store.get(file_id)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found in memory.")
    return JSONResponse(content={"file_id": file_id, "content": content})


@app.post("/analyze/")
async def analyze_resume_and_job(
    resume: UploadFile = File(...),
    job: UploadFile = File(...),
    latex: bool = Query(
        default=False, description="Return optimized resume in LaTeX format"
    ),
    latex_format: Optional[UploadFile] = File(None),
):
    if not resume.filename.endswith(".txt"): 
        raise HTTPException(
            status_code=400, detail="Expected 'resume.txt'"
        )
    if not job.filename.endswith(".txt"): 
        raise HTTPException(
            status_code=400, detail="Expected 'job.txt'"
        )

    resume_text = (await resume.read()).decode("utf-8")
    job_text = (await job.read()).decode("utf-8")
    prompts = ResumePrompts()

    # Optional LaTeX format example
    latex_example = ""
    if latex_format:
        try:
            latex_example = (await latex_format.read()).decode("utf-8")
        except Exception:
            raise HTTPException(
                status_code=400, detail="Could not read LaTeX format file."
            )

    try:
        # 1. Generate AI resume
        messages_generate = [
            {"role": "system", "content": prompts.skill_prompt},
            {"role": "user", "content": f"Job:\n{job_text}"},
        ]
        response_generate = client.chat.completions.create(
            model="gpt-4o-mini", messages=messages_generate, temperature=0.2
        )
        ideal_resume = response_generate.choices[0].message.content
        logger.info('OpenAI Call 1 completed')
        
        
        # 2. Optimize the original resume using the AI one
        optimizer_prompt = prompts.resume_optimizer_prompt
        if latex:
            optimizer_prompt += "\n\nFormat the output in LaTeX using the style shown in this example:\n"
            optimizer_prompt += f"\n{latex_example}\n"

        messages_optimize = [
            {"role": "system", "content": optimizer_prompt},
            {
                "role": "user",
                "content": f"Current Resume:\n{resume_text}\n\nAI-Generated Resume:\n{ideal_resume}",
            },
        ]
        response_optimize = client.chat.completions.create(
            model="gpt-4o-mini", messages=messages_optimize, temperature=0.3
        )
        optimized_resume = response_optimize.choices[0].message.content
        logger.info('OpenAI Call 2 completed')
        
        logger.info(f'{optimized_resume}')
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    if latex:
        return PlainTextResponse(
            content=optimized_resume,
            media_type="application/x-latex",
            headers={
                "Content-Disposition": 'attachment; filename="optimized_resume.tex"'
            },
        )

    return JSONResponse(content={"optimized_resume": optimized_resume})
