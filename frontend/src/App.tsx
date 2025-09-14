import { lazy, Suspense, useEffect, useRef, useState } from "react";
import "./App.css";
import Toast from "./Toast";
import { ClipLoader } from "react-spinners";
import { track } from "@vercel/analytics";
import LoadingOverlay from "./LoadingOverlay";
const WebglCameraExample = lazy(() => import("./WebglCameraExample"));

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const SITE_ORIGIN = "https://www.resumetuner.app";

function setHeadForRoute(route: string) {
  const meta = {
    "/": {
      title: "ResumeTuner — Tailor your resume to any job",
      description:
        "Paste a job description and your resume. Our AI tailors bullets, summary, and keywords so you pass ATS screens and catch recruiter attention.",
    },
    "/how": {
      title: "How ResumeTuner works — AI resume optimization",
      description:
        "See how ResumeTuner aligns your resume to a specific job: analysis, rewrite suggestions, and ATS-optimized output.",
    },
    "/example": {
      title: "Resume before & after — targeted rewrite example",
      description:
        "Compare a generic resume vs. a targeted version for a Senior Frontend Engineer role and see why it ranks better.",
    },
    "/faq": {
      title: "ResumeTuner FAQ — accuracy, ATS, pricing",
      description:
        "Answers to common questions about ResumeTuner’s AI resume optimization, accuracy, and how to get the best results.",
    },
    "/optimize": {
      title: "Optimize your resume — ResumeTuner",
      description:
        "Paste your resume and a job description; get tailored bullets, summary, and keywords that align with recruiter and ATS scans.",
    },
  } as Record<string, { title: string; description: string }>;

  const match = meta[route] ?? meta["/"];
  const canonical = `${SITE_ORIGIN}${route === "/" ? "/" : route}`;
  const image = `${SITE_ORIGIN}/vite.svg`;
  // Title
  if (typeof document !== "undefined") {
    document.title = match.title;
    // Meta description
    let desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!desc) {
      desc = document.createElement("meta");
      desc.setAttribute("name", "description");
      document.head.appendChild(desc);
    }
    desc.setAttribute("content", match.description);

    // Canonical
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canon) {
      canon = document.createElement("link");
      canon.setAttribute("rel", "canonical");
      document.head.appendChild(canon);
    }
    canon.setAttribute("href", canonical);

    // Open Graph
    const setOg = (p: string, v: string) => {
      let el = document.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", p);
        document.head.appendChild(el);
      }
      el.setAttribute("content", v);
    };
    setOg("og:url", canonical);
    setOg("og:title", match.title);
    setOg("og:description", match.description);
    setOg("og:image", image);

    // Twitter
    const setTw = (n: string, v: string) => {
      let el = document.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", n);
        document.head.appendChild(el);
      }
      el.setAttribute("content", v);
    };
    setTw("twitter:title", match.title);
    setTw("twitter:description", match.description);
    setTw("twitter:image", image);

    // JSON-LD per route (minimal)
    const existing = document.getElementById("ldjson-route");
    const script = existing || Object.assign(document.createElement("script"), { type: "application/ld+json", id: "ldjson-route" });
    let jsonLd: any = null;
    if (route === "/") {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "ResumeTuner",
        url: canonical,
        applicationCategory: "Productivity",
        operatingSystem: "Web",
        description: match.description,
      };
    } else if (route === "/faq") {
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What does this tool do?",
            acceptedAnswer: { "@type": "Answer", text: "It tailors your resume to a specific job by rewriting bullets, highlighting relevant skills, and improving keyword coverage for ATS." },
          },
          {
            "@type": "Question",
            name: "Will it make things up?",
            acceptedAnswer: { "@type": "Answer", text: "No. You approve every change and can copy only what you want." },
          },
        ],
      };
    }
    if (jsonLd) {
      script.textContent = JSON.stringify(jsonLd);
      if (!existing) document.head.appendChild(script);
    } else if (existing) {
      existing.remove();
    }
  }
}

function isInternalHref(href: string) {
  try {
    const u = new URL(href, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

type OptimizeResponse = {
  output?: string;
  content?: string;
  result?: string;
  text?: string;
};

function Nav() {
  return (
    <nav className="topnav" aria-label="Primary">
      <a href="/" className="brand" aria-label="Go to home">ResumeTuner</a>
      <div className="links">
        <a href="/how" className="link">How it<wbr /> works</a>
        <a href="/example" className="link">See an<wbr /> example</a>
        <a href="/faq" className="link">FAQ</a>
        <a href="/ai-resume-optimizer" className="link">AI<wbr /> Resume<wbr /> Optimizer</a>
      </div>
    </nav>
  );
}

function Landing() {
  return (
    <div className="page">
      <Nav />
      <header className="hero hero--room">
        <h1 className="hero-title font-heading text-balance">
          Tailor your resume to any job,<wbr /> with {" "}
          <span className="stage-word">
            <span aria-hidden className="stage-glow" />
            <span className="accent shimmer-once">AI</span>
          </span>
        </h1>
        <p className="hero-sub text-balance">
          Paste a job description and your resume. We rewrite and highlight your
          {" "}
          bullets &amp; keywords to
          {" "}
          <mark className="soft-underline">match what recruiters and ATS scan for.</mark>
        </p>
        <p className="hero-sub text-balance" aria-label="Why not ChatGPT?">
          Why not ChatGPT? Our AI models are not another chatbot — they are a resume specialist.
        </p>
        <div className="hero-actions">
          <a
            href="/optimize"
            className="cta-primary-lift"
            aria-label="Go to optimizer"
            onClick={() => { try { track('cta_click', { source: 'hero_optimize' }); } catch {} }}
          >
            Optimize my resume
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="cta-icon"
              aria-hidden
            >
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </header>
      <LazyWebgl />
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
      </header>
      <section className="section hiw" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">How it works</h2>
        <ol className="steps">
          <li>
            <strong>Paste job description:</strong> paste the full job post.
          </li>
          <li>
            <strong>Add your resume:</strong> paste your resume text.
          </li>
          <li>
            <strong>Get a tailored version:</strong> we suggest rewritten bullets, a summary,
            and targeted keywords. You can copy or export the results.
          </li>
        </ol>
      </section>
    </div>
  );
}

function FAQ() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
      </header>
      <section className="section faq" aria-labelledby="faq-title">
        <h2 id="faq-title" className="section-title">FAQ</h2>
        <div className="faq-item">
          <div className="faq-q">What does this tool do?</div>
          <div className="faq-a">
            It tailors your resume to a specific job by rewriting bullets, highlighting
            relevant skills, and improving keyword coverage for ATS.
          </div>
        </div>
        <div className="faq-item">
          <div className="faq-q">Will it make things up?</div>
          <div className="faq-a">No. You approve every change and can copy only what you want.</div>
        </div>
        <div className="faq-item">
          <div className="faq-q">Is my data stored?</div>
          <div className="faq-a">
            No. We only process your inputs to generate results.
          </div>
        </div>
        <div className="faq-item">
          <div className="faq-q">How is this different from general chatbots?</div>
          <div className="faq-a">
            Purpose-built prompts and structure for resumes, keyword coverage insights, and export-friendly output.
          </div>
        </div>
      </section>
    </div>
  );
}

function Optimizer() {
  const [resume, setResume] = useState("");
  const [job, setJob] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = resume.trim() && job.trim() && !loading && !converting;

  async function onUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setToast("Please select a PDF file"); setShowToast(true); setTimeout(() => setShowToast(false), 1500);
      return;
    }
    try { track('pdf_upload_attempt'); } catch {}
    setConverting(true);
    setToast("Converting PDF…"); setShowToast(true); setTimeout(() => setShowToast(false), 1500);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/convert/pdf-to-md`, { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Server error (${res.status})`);
      }
      const data = await res.json();
      const md = data.markdown || "";
      setResume(md);
      setToast("PDF converted"); setShowToast(true); setTimeout(() => setShowToast(false), 1500);
      try { track('pdf_upload_success'); } catch {}
    } catch (err: any) {
      setToast("PDF conversion failed"); setShowToast(true); setTimeout(() => setShowToast(false), 1800);
      setOutput(`PDF conversion error: ${err?.message || 'Unknown error'}`);
      try { track('pdf_upload_error'); } catch {}
    } finally {
      setConverting(false);
      // clear file input value so same file can be reselected
      e.target.value = '';
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try { track('optimize_submit'); } catch {}
    setLoading(true);
    setOutput("");
    setToast("Optimization started…");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);

    try {
      const res = await fetch(`${API_BASE}/optimize?plain=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/plain, application/json" },
        body: JSON.stringify({ resume, jobDescription: job }),
      });

      const ct = res.headers.get("content-type") || "";
      let text = "";
      if (ct.includes("application/json")) {
        const data: OptimizeResponse = await res.json();
        text = data.output ?? data.content ?? data.result ?? data.text ?? JSON.stringify(data, null, 2);
      } else {
        text = await res.text();
      }
      setOutput(text);
      setToast("Optimization complete");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } catch (err: any) {
      setOutput(`Error: ${err?.message ?? "Failed to generate."}`);
      setToast("Optimization failed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">Optimize your resume</h1>
        <p className="hero-sub">Paste the job description and your resume. Approve the suggestions you like.</p>
      </header>

      <form className="grid" onSubmit={onSubmit} aria-busy={loading}>
        <label className="field">
          <div className="field-head">
            <span className="field-title">Your resume</span>
            <div>
              <button
                type="button"
                className="link-btn"
                onClick={() => pdfInputRef.current?.click()}
                aria-label="Upload PDF resume to convert"
                disabled={converting}
              >
                {converting ? "Converting…" : "Upload PDF"}
              </button>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={onUploadPdf}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <textarea
            className="textarea"
            placeholder="Paste your resume text"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            aria-label="Resume content"
          />
          <div className="field-hint">Prefer a file? Upload a PDF and we’ll convert it to text automatically.</div>
        </label>

        <label className="field">
          <div className="field-head">
            <span className="field-title">Job description</span>
            <span />
          </div>
          <textarea
            className="textarea"
            placeholder="Paste the job description"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            aria-label="Job description"
          />
        </label>

        <div className="actions">
          <button className="primary" type="submit" disabled={!canSubmit}>
            {loading ? "Generating…" : "Optimize my resume"}
          </button>
        </div>
      </form>

      <span
        aria-live="polite"
        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}
      >
        {loading ? "Optimizing your resume…" : "Ready"}
      </span>

      {output && (
        <section className="output">
          <div className="output-title">Output</div>
          <div className="output-wrap">
            <button
              type="button"
              className="copy-btn"
              title="Copy output"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(output || "");
                  setToast("Copied to clipboard");
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 1500);
                } catch {
                  // no-op
                }
              }}
              disabled={!output}
              aria-disabled={!output}
              aria-label="Copy output to clipboard"
            >
              Copy
            </button>
            <pre className="output-box">{output || " "}</pre>
          </div>
        </section>
      )}

      <Toast message={toast} show={showToast} />
      <LoadingOverlay show={loading} />
    </div>
  );
}

function Example() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">Before and after: resume upgrade</h1>
        <p className="hero-sub">A focused rewrite aligned to a Senior Frontend Engineer (React/TypeScript) posting.</p>
      </header>

      <section className="kpi-band" aria-label="Outcome highlight">
        <div className="kpi">
          <span className="kpi-num">+99%</span>
          <span className="kpi-label">estimated increase in selection likelihood</span>
        </div>
        <div className="kpi-reason">Driven by keyword alignment, quantified impact, and improved structure for ATS parsing.</div>
      </section>

      <section className="example-grid" aria-label="Resume comparison">
        <article className="resume-card pre" aria-labelledby="pre-title">
          <div className="card-head">
            <span className="badge">Before</span>
            <h3 id="pre-title" className="card-title">Jordan Lee</h3>
          </div>
          <pre className="resume-text">{`SUMMARY
Full‑stack developer with experience building web apps. Team player and fast learner looking for new opportunities.

SKILLS
JavaScript, CSS, HTML, React, Node, Git, APIs

EXPERIENCE
Software Engineer, NovaTech — 2019–Present
- Responsible for frontend tasks on the main app using React.
- Worked on pages and fixed bugs as needed.
- Helped with some backend API endpoints.

Projects
- Internal dashboard for support team.
`}</pre>
        </article>

        <article className="resume-card post" aria-labelledby="post-title">
          <div className="card-head">
            <span className="badge badge-success">After</span>
            <h3 id="post-title" className="card-title">Jordan Lee — Senior Frontend Engineer (Targeted)</h3>
          </div>
          <pre className="resume-text">{`SUMMARY
Frontend engineer specializing in React and TypeScript, building performant, accessible interfaces at scale. Led migrations to modern tooling (Vite, SWC), reduced LCP by 38%, and shipped a reusable design system adopted across 6 product surfaces. Strengths in UX collaboration, a11y, and data‑informed iteration.

SKILLS
React, TypeScript, Next.js, Node, Vite, Redux Toolkit, React Query, Jest, Testing Library, Playwright, Zustand, CSS‑in‑JS, Tailwind, Storybook, Web Vitals, Lighthouse, REST/GraphQL, CI/CD (GitHub Actions), Feature Flags, Datadog, Sentry, LaunchDarkly

EXPERIENCE
Software Engineer → Senior Frontend Engineer, NovaTech — 2019–Present
- Reduced median LCP 3.8s → 2.35s (‑38%) by code‑splitting, route‑level prefetch, and image format upgrades (AVIF/WebP), improving conversion +14% on paid signup.
- Migrated legacy CRA to Vite + SWC, cutting cold start time 62% and CI build time 41%, accelerating release cadence from biweekly to weekly.
- Led design system initiative (35 components, tokens, a11y states); dropped implementation time of common flows ~30% and raised Lighthouse a11y 68 → 96.
- Introduced experiment framework (guarded by LaunchDarkly); shipped 7 A/B tests with statistically significant wins, including pricing toggle (+6.8% CTR).
- Co‑authored frontend error budget with SLOs; reduced P95 UI errors 47% via typed APIs, boundary patterns, and proactive logging with Sentry.

Projects
- Support Ops Console: consolidated tool increasing agent resolution speed 22%; role‑based access and audit trail, deployed via GitHub Actions.
`}</pre>
        </article>
      </section>

      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title" className="section-title">Why the “After” performs better</h2>
        <ul className="delta-list">
          <li><strong>Keyword alignment:</strong> Mirrors the job’s stack (React, TS, Next.js, testing, performance), boosting ATS match rate.</li>
          <li><strong>Quantified impact:</strong> Concrete metrics (‑38% LCP, +14% conversion) demonstrate outcomes, not tasks.</li>
          <li><strong>Structure & parseability:</strong> Clean sections and consistent patterns improve machine and human scanning.</li>
          <li><strong>A11y & quality signals:</strong> Lighthouse, SLOs, test tooling convey seniority and engineering rigor.</li>
          <li><strong>Scope & leadership:</strong> System ownership, migrations, and cross‑team adoption evidence higher‑level impact.</li>
        </ul>
      </section>
    </div>
  );
}

function AiResumeOptimizerPage() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">AI Resume Optimizer — Pass ATS and Impress Recruiters</h1>
        <p className="hero-sub">Optimize your resume for a specific job posting with keyword alignment, quantified achievements, and clean structure that machines and humans scan fast.</p>
      </header>

      <section className="section" aria-labelledby="why-ats-title">
        <h2 id="why-ats-title" className="section-title">Why optimize for ATS?</h2>
        <p>
          Most hiring pipelines start with Applicant Tracking Systems (ATS). Matching the language of the job post — tools, skills, and responsibilities — increases your search match, surfaces your profile to recruiters, and prevents qualified resumes from being filtered out.
        </p>
        <ul className="delta-list">
          <li><strong>Keyword coverage:</strong> Map your skills to the exact stack listed in the role.</li>
          <li><strong>Readable structure:</strong> Clean sections and consistent bullets for fast scanning.</li>
          <li><strong>Measurable impact:</strong> Highlight metrics that prove outcomes, not tasks.</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="how-title-ai">
        <h2 id="how-title-ai" className="section-title">How ResumeTuner’s AI works</h2>
        <ol className="steps">
          <li><strong>Analyze the job:</strong> extract required skills, responsibilities, and seniority signals.</li>
          <li><strong>Align your resume:</strong> rewrite summary, skills, and bullets — truthfully.</li>
          <li><strong>Optimize for screeners:</strong> structure and phrasing tuned for ATS + recruiters.</li>
        </ol>
      </section>

      <section className="section" aria-labelledby="cta-ai">
        <h2 id="cta-ai" className="section-title">Try it free</h2>
        <p><a className="cta primary" href="/optimize" aria-label="Go to optimizer">Optimize your resume →</a></p>
      </section>
    </div>
  );
}

function AtsResumePage() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">ATS Resume Optimizer — Increase Your Match Rate</h1>
        <p className="hero-sub">Tailor your resume for screening algorithms by mirroring the role’s terminology, organizing sections for easy parsing, and maintaining accuracy.</p>
      </header>
      <section className="section" aria-labelledby="ats-features">
        <h2 id="ats-features" className="section-title">What you’ll improve</h2>
        <ul className="delta-list">
          <li><strong>Skills mapping:</strong> ensure role-specific keywords (frameworks, tools, platforms).</li>
          <li><strong>Bullet clarity:</strong> action → scope → impact; one outcome per line.</li>
          <li><strong>Consistency:</strong> tense, punctuation, and headings standardized.</li>
        </ul>
      </section>
      <section className="section" aria-labelledby="ats-cta">
        <h2 id="ats-cta" className="section-title">Get started</h2>
        <p><a className="cta primary" href="/optimize">Optimize for ATS →</a></p>
      </section>
    </div>
  );
}

function KeywordsAnalyzerPage() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">Resume Keywords Analyzer — Match The Job Description</h1>
        <p className="hero-sub">Identify missing or weak keywords, map phrasing to the job post, and strengthen your resume’s relevance without fabricating experience.</p>
      </header>
      <section className="section" aria-labelledby="kw-how">
        <h2 id="kw-how" className="section-title">What you’ll get</h2>
        <ul className="delta-list">
          <li><strong>Missing keywords report:</strong> terms to add or reinforce.</li>
          <li><strong>Phrasing suggestions:</strong> swap generic wording for language from the post.</li>
          <li><strong>Section guidance:</strong> where to update summary, skills, and bullets.</li>
        </ul>
      </section>
      <section className="section" aria-labelledby="kw-cta">
        <h2 id="kw-cta" className="section-title">Analyze your resume</h2>
        <p><a className="cta primary" href="/optimize">Run keyword analysis →</a></p>
      </section>
    </div>
  );
}

function AchievementsGeneratorPage() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">Resume Achievements Generator — Turn Work Into Impact</h1>
        <p className="hero-sub">Convert responsibilities into quantified bullets that highlight scope, action, and measurable outcomes — without inventing facts.</p>
      </header>
      <section className="section" aria-labelledby="achv-how">
        <h2 id="achv-how" className="section-title">How to write high-impact bullets</h2>
        <ul className="delta-list">
          <li><strong>Pattern:</strong> Action → Scope → Result (with a metric).</li>
          <li><strong>Clarity:</strong> One outcome per line; start with a strong verb.</li>
          <li><strong>Proof:</strong> Use % change, time saved, revenue, reliability, or error rates.</li>
        </ul>
      </section>
      <section className="section" aria-labelledby="achv-cta">
        <h2 id="achv-cta" className="section-title">Generate achievement bullets</h2>
        <p><a className="cta primary" href="/optimize">Create quantified bullets →</a></p>
      </section>
    </div>
  );
}

function SoftwareEngineerOptimizerPage() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">Software Engineer Resume Optimizer — Stand Out to Hiring Teams</h1>
        <p className="hero-sub">Show impact and technical depth: align with the team’s stack, highlight performance, reliability, and DX wins, and surface leadership signals.</p>
      </header>
      <section className="section" aria-labelledby="se-focus">
        <h2 id="se-focus" className="section-title">What hiring teams look for</h2>
        <ul className="delta-list">
          <li><strong>Stack alignment:</strong> languages, frameworks, and tooling that match the JD.</li>
          <li><strong>Impact metrics:</strong> latency, throughput, reliability, cost, or developer velocity.</li>
          <li><strong>Ownership:</strong> migrations, design systems, observability, SLOs, and experiments.</li>
        </ul>
      </section>
      <section className="section" aria-labelledby="se-cta">
        <h2 id="se-cta" className="section-title">Optimize your engineering resume</h2>
        <p><a className="cta primary" href="/optimize">Tune for engineering roles →</a></p>
      </section>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<string>(typeof window !== "undefined" ? window.location.pathname || "/" : "/");

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);

    const onClick = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const anchor = t.closest && (t.closest("a") as HTMLAnchorElement | null);
      if (!anchor || !anchor.getAttribute) return;
      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
      if (!isInternalHref(href)) return;
      // Only handle same-origin internal links
      e.preventDefault();
      window.history.pushState({}, "", href);
      setRoute(window.location.pathname || "/");
    };
    document.addEventListener("click", onClick);
    setHeadForRoute(window.location.pathname || "/");
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    setHeadForRoute(route);
    // Track SPA page views on initial load and route changes
    try { track('pageview', { path: route }); } catch {}
  }, [route]);

  if (route.startsWith("/optimize")) return <Optimizer />;
  if (route.startsWith("/how")) return <HowItWorks />;
  if (route.startsWith("/example")) return <Example />;
  if (route.startsWith("/faq")) return <FAQ />;
  if (route.startsWith("/ai-resume-optimizer")) return <AiResumeOptimizerPage />;
  if (route.startsWith("/ats-resume-optimizer")) return <AtsResumePage />;
  if (route.startsWith("/resume-keywords-analyzer")) return <KeywordsAnalyzerPage />;
  if (route.startsWith("/resume-ats-checker")) return <AtsResumePage />;
  if (route.startsWith("/resume-achievements-generator")) return <AchievementsGeneratorPage />;
  if (route.startsWith("/software-engineer-resume-optimizer")) return <SoftwareEngineerOptimizerPage />;
  return <Landing />;
}

function LazyWebgl() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {visible ? (
        <Suspense fallback={null}>
          <WebglCameraExample />
        </Suspense>
      ) : null}
    </div>
  );
}
