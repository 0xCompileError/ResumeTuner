import { useState } from "react";
import "./App.css";
import Toast from "./Toast";
import { ClipLoader } from "react-spinners";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

type OptimizeResponse = {
  output?: string;
  content?: string;
  result?: string;
  text?: string;
};

export default function App() {
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
    // Announce start
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
        text =
          data.output ??
          data.content ??
          data.result ??
          data.text ??
          JSON.stringify(data, null, 2);
      } else {
        text = await res.text();
      }
      setOutput(text);
      // Announce completion
      setToast("Optimization complete");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } catch (err: any) {
      setOutput(`Error: ${err?.message ?? "Failed to generate."}`);
      // Announce failure
      setToast("Optimization failed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <form className="grid" onSubmit={onSubmit} aria-busy={loading}>
        <label className="field">
          <span className="field-title">
            Copy and paste here your resume content
          </span>
          <textarea
            className="textarea"
            placeholder="Copy and paste here your resume content"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            aria-label="Resume content"
          />
        </label>

        <label className="field">
          <span className="field-title">
            Copy and paste here the job description
          </span>
          <textarea
            className="textarea"
            placeholder="Copy and paste here the job description"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            aria-label="Job description"
          />
        </label>

        <div className="actions">
          <button className="primary" type="submit" disabled={!canSubmit}>
            {loading ? "Generating…" : "Generate optimized resume"}
          </button>
        </div>
      </form>
      {/* Accessible live region for screen readers */}
      <span
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {loading ? "Optimizing your resume…" : "Ready"}
      </span>

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
