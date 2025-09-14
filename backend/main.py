from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Optional, List
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import httpx
import logging
import uuid
import os
from pydantic import BaseModel
import re
import tempfile
from markitdown import MarkItDown

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

def get_origin_header(request: Request):
    return request.headers.get("origin")

default_origins = [
    "https://resumetuner.app",
    "https://www.resumetuner.app",
    "http://localhost:5173",  # local development
]

# Allow overriding origins via env var CORS_ALLOW_ORIGINS (comma-separated)
_env_origins = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
origins: List[str] = (
    [o.strip() for o in _env_origins.split(",") if o.strip()] if _env_origins else default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory File Store ---
memory_store: Dict[str, str] = {}


# --- Section Handling Utilities ---
CANONICAL_HEADERS = {
    "SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATIONS",
    "PROJECTS",
}

# Map common variants to canonical forms
SECTION_ALIASES = {
    "PROFESSIONAL EXPERIENCE": "EXPERIENCE",
    "WORK EXPERIENCE": "EXPERIENCE",
    "EXPERIENCE": "EXPERIENCE",
    "SUMMARY": "SUMMARY",
    "PROFESSIONAL SUMMARY": "SUMMARY",
    "SKILLS": "SKILLS",
    "CORE SKILLS": "SKILLS",
    "TECHNICAL SKILLS": "SKILLS",
    "EDUCATION": "EDUCATION",
    "CERTIFICATION": "CERTIFICATIONS",
    "CERTIFICATIONS": "CERTIFICATIONS",
    "PROJECT": "PROJECTS",
    "PROJECTS": "PROJECTS",
}

def _canon_header(line: str) -> Optional[str]:
    name = re.sub(r"\s+", " ", (line or "").strip()).upper()
    if name.endswith(":"):
        name = name[:-1]
    return SECTION_ALIASES.get(name)

def _normalize_headers(text: str) -> str:
    lines = (text or "").splitlines()
    out: List[str] = []
    for ln in lines:
        canon = _canon_header(ln)
        if canon:
            out.append(canon)
        else:
            out.append(ln)
    return "\n".join(out)

def _split_into_sections(text: str):
    """Return (preamble, [(header, content_str), ...]) preserving order.
    Only known canonical or alias headers start sections; other ALL-CAPS headings are ignored.
    """
    text = text or ""
    lines = text.splitlines()
    preamble_lines: List[str] = []
    sections: List[tuple[str, List[str]]] = []
    current_header: Optional[str] = None
    current_body: List[str] = []

    def flush_current():
        nonlocal current_header, current_body
        if current_header is not None:
            sections.append((current_header, current_body))
        current_header, current_body = None, []

    for ln in lines:
        canon = _canon_header(ln)
        if canon:
            flush_current()
            current_header = canon
            current_body = []
        else:
            if current_header is None:
                preamble_lines.append(ln)
            else:
                current_body.append(ln)

    flush_current()
    return "\n".join(preamble_lines).rstrip(), sections

def _join_sections(preamble: str, sections: List[tuple[str, List[str]]]) -> str:
    parts: List[str] = []
    pre = (preamble or "").rstrip()
    if pre:
        parts.append(pre)
    for hdr, body_lines in sections:
        if parts:
            parts.append("")  # blank line before each section
        parts.append(hdr)
        body = "\n".join(body_lines).rstrip()
        if body:
            parts.append(body)
        else:
            # leave section blank (no placeholders)
            pass
    return "\n".join(parts).rstrip() + "\n"

def _original_section_presence(text: str) -> Dict[str, bool]:
    t = _normalize_headers(text or "")
    _, secs = _split_into_sections(t)
    present = {h: False for h in CANONICAL_HEADERS}
    for hdr, _ in secs:
        present[hdr] = True
    return present

def enforce_section_policies(final_text: str, original_text: str) -> str:
    """Enforce mandatory and conditional section rules deterministically.
    - Always include SUMMARY, SKILLS, EXPERIENCE, EDUCATION
    - Include CERTIFICATIONS/PROJECTS only if present in original
    - If EDUCATION missing in original, keep header but force content blank
    - Normalize header variants to canonical
    """
    normalized = _normalize_headers(final_text or "")
    pre, sections = _split_into_sections(normalized)

    # Build ordered dict of sections for easy updates
    ordered: List[tuple[str, List[str]]] = []
    seen = set()
    for hdr, body in sections:
        if hdr in seen:
            # Merge duplicate headers by appending with a blank line
            for i, (h, b) in enumerate(ordered):
                if h == hdr:
                    if b and body:
                        b.append("")
                    b.extend(body)
                    break
        else:
            ordered.append((hdr, body[:]))
            seen.add(hdr)

    orig_presence = _original_section_presence(original_text or "")

    # Remove conditional sections if not present originally
    filtered: List[tuple[str, List[str]]] = []
    for hdr, body in ordered:
        if hdr in ("CERTIFICATIONS", "PROJECTS") and not orig_presence.get(hdr, False):
            continue
        filtered.append((hdr, body))

    # Ensure mandatory sections exist
    present_now = {hdr for hdr, _ in filtered}
    for mandatory in ("SUMMARY", "SKILLS", "EXPERIENCE", "EDUCATION"):
        if mandatory not in present_now:
            filtered.append((mandatory, []))

    # If EDUCATION absent in original, force blank content (header only)
    if not orig_presence.get("EDUCATION", False):
        filtered = [
            (hdr, [] if hdr == "EDUCATION" else body) for hdr, body in filtered
        ]

    # Rebuild text
    return _join_sections(pre, filtered)


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
    # Avoid logging file contents to protect sensitive data
    logger.info(
        f"Uploaded {file.filename} | ID: {file_id} | size={len(decoded)} chars"
    )
    return {"message": "Upload successful", "file_id": file_id}


# --- Retrieve File Content ---
@app.get("/file/{file_id}")
async def get_file_content(file_id: str):
    content = memory_store.get(file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found in memory.")
    return JSONResponse(content={"file_id": file_id, "content": content})


# --- Shared pipeline helper ---
async def _run_resume_pipeline(
    resume_text: str,
    job_text: str,
    *,
    latex: bool = False,
    latex_template: str = "",
):
    prompts = ResumePrompts()

    # Compute original section presence (for downstream prompts and enforcement)
    orig_presence = _original_section_presence(resume_text)

    # --- Step 2: Analyze the Job Description ---
    step1 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.job_description_analysis_prompt},
            {"role": "user", "content": f"Job:\n{job_text}"},
        ],
        #temperature=0.2,
    )
    job_analysis = step1.choices[0].message.content
    logger.info("Step 1: Job Description Analysis Complete")

    # --- Step 3: Resume Matching ---
    step2 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.resume_matching_prompt},
            {
                "role": "user",
                "content": f"Current Resume:\n{resume_text}\n\nJob Description Analysis:\n{job_analysis}",
            },
        ],
        #temperature=0.2,
    )
    matching_analysis = step2.choices[0].message.content
    logger.info("Step 2: Resume Matching Complete")

    # --- Step 4: Rewrite Summary & Skills ---
    step3 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.resume_summary_skills_prompt},
            {
                "role": "user",
                "content": f"Current Resume:\n{resume_text}\n\nJob Description Analysis:\n{job_analysis}\n\nResume Matching Insights:\n{matching_analysis}",
            },
        ],
        #temperature=0.2,
    )
    summary_skills = step3.choices[0].message.content
    logger.info("Step 3: Summary & Skills Rewrite Complete")

    # --- Step 5: Refine Experience Section ---
    step4 = await client.chat.completions.create(
        model="gpt-5-nano",
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
        #temperature=0.2,
    )
    experience_section = step4.choices[0].message.content
    logger.info("Step 4: Experience Rewrite Complete")

    # --- Step 5: Education Formatting ---
    step5 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.resume_education_prompt},
            {
                "role": "user",
                "content": f"Current Resume:\n{resume_text}\n\nJob Description Analysis:\n{job_analysis}",
            },
        ],
    )
    education_entries = (step5.choices[0].message.content or "").strip()
    logger.info("Step 5: Education Section Formatting Complete")

    # --- Step 6: Certifications Formatting ---
    step6 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.resume_certifications_prompt},
            {"role": "user", "content": f"Current Resume:\n{resume_text}"},
        ],
    )
    certifications_entries = (step6.choices[0].message.content or "").strip()
    logger.info("Step 6: Certifications Section Formatting Complete")

    # --- Step 7: Assemble Final Resume ---
    step7 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.final_resume_assembly_prompt},
            {
                "role": "user",
                "content": (
                    "Summary and Skills section:\n" + summary_skills +
                    "\n\nExperience section:\n" + experience_section +
                    ("\n\nEducation entries (one per line):\n" + education_entries if education_entries else "\n\nEducation entries: NONE") +
                    ("\n\nCertification entries (one per line):\n" + certifications_entries if certifications_entries else "\n\nCertification entries: NONE") +
                    "\n\nOriginal section presence (for strict policy):\n"
                    f"- EDUCATION: {'YES' if orig_presence.get('EDUCATION') else 'NO'}\n"
                    f"- CERTIFICATIONS: {'YES' if orig_presence.get('CERTIFICATIONS') else 'NO'}\n"
                    f"- PROJECTS: {'YES' if orig_presence.get('PROJECTS') else 'NO'}\n"
                ),
            },
        ],
        #temperature=0.2,
    )
    def sanitize_resume_output(text: str) -> str:
        if not text:
            return text
        cleaned = text
        # Remove placeholder-only sections like "EDUCATION\nDetails available upon request"
        for section in ("EDUCATION", "CERTIFICATIONS"):
            pattern = re.compile(
                rf"(?ims)^({section})\s*\n(?:-\s*)?(?:details|information|info)\s+(?:available|upon)\s+request\.?\s*(?:\n\n|\Z)",
                re.IGNORECASE | re.MULTILINE | re.DOTALL,
            )
            cleaned = pattern.sub("", cleaned)
        return cleaned.strip()

    final_resume = sanitize_resume_output(step7.choices[0].message.content)
    logger.info("Step 7: Resume Assembly Complete")

    # --- Step 8: Optimize for All Screeners ---
    step8 = await client.chat.completions.create(
        model="gpt-5-nano",
        messages=[
            {"role": "system", "content": prompts.final_resume_optimization_prompt},
            {
                "role": "user",
                "content": (
                    f"Full Resume (use EXACT headers):\n{final_resume}\n\n"
                    f"Original section presence (for strict policy):\n"
                    f"- EDUCATION: {'YES' if orig_presence.get('EDUCATION') else 'NO'}\n"
                    f"- CERTIFICATIONS: {'YES' if orig_presence.get('CERTIFICATIONS') else 'NO'}\n"
                    f"- PROJECTS: {'YES' if orig_presence.get('PROJECTS') else 'NO'}\n\n"
                    f"Job Description Analysis:\n{job_analysis}"
                ),
            },
        ],
        #temperature=0.2,
    )
    optimized_resume = sanitize_resume_output(step8.choices[0].message.content)
    # Enforce deterministic section policies irrespective of model behavior
    optimized_resume = enforce_section_policies(optimized_resume, resume_text)
    logger.info("Step 8: Final Optimization Complete")

    # --- Optional: LaTeX Formatting ---
    if latex:
        format_prompt = f"Format the resume in LaTeX using this style:\n{latex_template}"
        latex_result = await client.chat.completions.create(
            model="gpt-5-nano",
            messages=[
                {"role": "system", "content": format_prompt},
                {"role": "user", "content": f"Current Version:\n{optimized_resume}"},
            ],
            temperature=0.3,
        )
        return {"latex": True, "content": latex_result.choices[0].message.content}

    return {"latex": False, "content": optimized_resume}


# --- Resume Analyzer ---
@app.post("/analyze/")
async def analyze_resume_and_job(
    resume: UploadFile = File(...),
    job: Optional[UploadFile] = File(None),
    latex_format: Optional[UploadFile] = File(None),
    job_url: Optional[str] = Form(None),
    latex: bool = Query(default=False, description="Return LaTeX formatted output"),
    plain: bool = Query(default=False, description="If true, return text/plain"),
    request: Request = None,
):
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

        result = await _run_resume_pipeline(
            resume_text=resume_text,
            job_text=job_text,
            latex=latex,
            latex_template=latex_template,
        )

        if result.get("latex"):
            return PlainTextResponse(
                content=result["content"],
                media_type="application/x-latex",
                headers={
                    "Content-Disposition": 'attachment; filename="optimized_resume.tex"'
                },
            )

        accept = (request.headers.get("accept") or "").lower() if request else ""
        if plain or "text/plain" in accept:
            return PlainTextResponse(content=result["content"], media_type="text/plain")

        return JSONResponse(content={"optimized_resume": result["content"]})

    except Exception as e:
        logger.exception("Resume optimization workflow failed.")
        raise HTTPException(
            status_code=500, detail=f"Failed to complete resume analysis: {str(e)}"
        )


# --- JSON Optimize Endpoint ---
class OptimizeRequest(BaseModel):
    resume: str
    jobDescription: str


@app.post("/optimize")
async def optimize_json(payload: OptimizeRequest, request: Request, plain: bool = Query(default=False)):
    try:
        result = await _run_resume_pipeline(
            resume_text=payload.resume, job_text=payload.jobDescription, latex=False
        )
        accept = (request.headers.get("accept") or "").lower()
        if plain or "text/plain" in accept:
            return PlainTextResponse(content=result["content"], media_type="text/plain")
        return JSONResponse(content={"optimized_resume": result["content"]})
    except Exception as e:
        logger.exception("JSON optimize workflow failed.")
        raise HTTPException(
            status_code=500, detail=f"Failed to optimize resume: {str(e)}"
        )


# --- PDF → Markdown conversion endpoint ---
@app.post("/convert/pdf-to-md")
async def convert_pdf_to_markdown(file: UploadFile = File(...)):
    try:
        filename = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()
        if not (filename.endswith(".pdf") or content_type == "application/pdf"):
            raise HTTPException(status_code=400, detail="Please upload a PDF file.")

        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        # Write to a temporary file so MarkItDown can infer type reliably
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name

        try:
            md = MarkItDown()
            result = md.convert(tmp_path)
            text = getattr(result, "text_content", None) or ""
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

        return JSONResponse(content={"markdown": text})
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PDF to Markdown conversion failed.")
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")
