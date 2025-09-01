# 🎯 ResumeTuner – AI-Powered Resume Optimizer

**ResumeTuner** is a FastAPI-based backend service that uses OpenAI's GPT-4o-mini model to generate and optimize resumes tailored to specific job descriptions. It helps align resumes with modern hiring systems, including ATS (Applicant Tracking Systems), recruiter filters, and AI resume screeners.

✨ Resume generation from job posting using AI

🧠 Resume optimization for ATS and AI hiring pipelines

🖥️ User-friendly web interface built with React and Tailwind CSS

---

## 📁 1. Clone the Repository

```bash
git clone https://github.com/0xCompileError/resume-tuner.git
cd resume-tuner
```

## 🖥️ 2. Backend Setup (FastAPI)

#### ✅ 2.1 Create a virtual environment and install dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 🔐 2.2 Set Up Your API Key
Create a .env file in the backend root:
```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### ▶️ 2.3 Run the API Server
Use the included Makefile for easy startup:
```bash
make run
```
The server will be available at http://127.0.0.1:8000.

Swagger docs: http://127.0.0.1:8000/docs

#### ✨ 2.4 Example of CLI
```bash 
curl -X POST "http://127.0.0.1:8000/analyze/?latex=true" \
  -F "resume=@resume.txt" \
  -F "job=@job.txt" \
  -F "latex_format=@format_template.txt"
```

## 🌐 3. Frontend Setup (React + Vite + Tailwind CSS)

#### ✅ 3.1 Install dependencies
```bash
cd ../frontend
npm install
```

#### ▶️ 3.2 Run the development server
```bash
VITE_API_BASE=http://127.0.0.1:8000 npm run dev
```
The frontend will be available at http://localhost:5173.

<!-- ##  4. Required Input Files
You can upload these via the UI or using the API:

- **resume.txt**: *Your current resume (factual work experience)*

- **job.txt**: *The job description for the role you’re targeting*

- **format_template.txt** (optional): *A LaTeX template to style the generated output* -->


## 📬 4. Contributions & Support
Feel free to open an issue or submit a pull request with improvements. Feature ideas, bug reports, and feedback are always welcome!

## 📄 5. License
MIT License © 2025 – 0xCompileError