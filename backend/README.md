# 🎯 ResumeTuner – AI-Powered Resume Optimizer (Backend)

**ResumeTuner** is a FastAPI-based backend service that uses OpenAI's `gpt-5-nano` model to generate and optimize resumes tailored to specific job descriptions. It helps align resumes with modern hiring systems, including ATS (Applicant Tracking Systems), recruiter filters, and AI resume screeners.

---

## 📁 1. Clone the Repository

```bash
git clone https://github.com/0xCompileError/resume-tuner.git
cd resume-tuner/backend
```

## 📦 2. Install Requirements
```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 📝 3. Add Required Input Files
Place the following files in the project folder or upload them via the API/UI:

- resume.txt – your current resume with real job experiences
- job.txt – the job description or posting you want to target
- format_template.txt (optional) – a LaTeX formatting example that will guide the structure of the output

## 🔐 4. Set Up Your API Key
Create a .env file in the backend root:
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Optionally override allowed CORS origins (comma-separated)
CORS_ALLOW_ORIGINS=https://your-frontend.example.com,http://localhost:5173
```

## ▶️ 5. Run the API Server
Use the included Makefile for easy startup:
```bash
make run
```

## ✨ 6. Example of CLI
```bash 
curl -X POST "http://127.0.0.1:8000/analyze/?latex=true" \
  -F "resume=@resume.txt" \
  -F "job=@job.txt" \
  -F "latex_format=@format_template.txt"
```

You can also POST JSON to `/optimize` (used by the sample React app):

```bash
curl -X POST "http://127.0.0.1:8000/optimize" \
  -H "Content-Type: application/json" \
  -d '{"resume": "...", "jobDescription": "..."}'
```


## 📬 7. Contributions & Support
Feel free to open an issue or submit a pull request with improvements. Feature ideas, bug reports, and feedback are always welcome!

## 📄 8. License
MIT License © 2025 – 0xCompileError
