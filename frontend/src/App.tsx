import { useEffect, useState } from "react";
import "./App.css";
import Toast from "./Toast";
import { ClipLoader } from "react-spinners";
import WebglCameraExample from "./WebglCameraExample";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

type OptimizeResponse = {
  output?: string;
  content?: string;
  result?: string;
  text?: string;
};

function Nav() {
  return (
    <nav className="topnav" aria-label="Primary">
      <a href="#/" className="brand" aria-label="Go to home">ResumeTuner</a>
      <div className="links">
        <a href="#/how" className="link">How it works</a>
        <a href="#/example" className="link">See an example</a>
        <a href="#/faq" className="link">FAQ</a>
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
            href="#/optimize"
            className="cta-primary-lift"
            aria-label="Go to optimizer"
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
      <WebglCameraExample />
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="#/" className="cta secondary" aria-label="Back to home">← Back</a>
      </header>
      <section className="section hiw" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">How it works</h2>
        <ol className="steps">
          <li>
            <strong>Paste job description:</strong> paste the full job post or a link.
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
        <a href="#/" className="cta secondary" aria-label="Back to home">← Back</a>
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
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);

  const canSubmit = resume.trim() && job.trim() && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        <a href="#/" className="cta secondary" aria-label="Back to home">← Back</a>
        <h1 className="hero-title">Optimize your resume</h1>
        <p className="hero-sub">Paste the job description and your resume. Approve the suggestions you like.</p>
      </header>

      <form className="grid" onSubmit={onSubmit} aria-busy={loading}>
        <label className="field">
          <span className="field-title">Your resume</span>
          <textarea
            className="textarea"
            placeholder="Paste your resume text"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            aria-label="Resume content"
          />
        </label>

        <label className="field">
          <span className="field-title">Job description</span>
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
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
          }}
          aria-modal="true"
          role="dialog"
          aria-label="Optimizing your resume"
        >
          <div
            style={{
              background: "#111",
              color: "#eee",
              padding: "16px 20px",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              textAlign: "center",
              maxWidth: 360,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
              <ClipLoader size={26} color="#7aa2ff" />
            </div>
            <div style={{ fontWeight: 600 }}>Optimizing your resume…</div>
            <div style={{ fontSize: 13, color: "#9aa0a6", marginTop: 4 }}>
              This can take 30–90 seconds. Please don’t close the tab.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Example() {
  return (
    <div className="page">
      <Nav />
      <header className="hero" style={{ marginBottom: 6 }}>
        <a href="#/" className="cta secondary" aria-label="Back to home">← Back</a>
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

export default function App() {
  const [route, setRoute] = useState<string>(window.location.hash || "#/");
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route.startsWith("#/optimize")) return <Optimizer />;
  if (route.startsWith("#/how")) return <HowItWorks />;
  if (route.startsWith("#/example")) return <Example />;
  if (route.startsWith("#/faq")) return <FAQ />;
  return <Landing />;
}
