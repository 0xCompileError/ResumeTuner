import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ClipLoader } from "react-spinners";
import Toast from "./Toast";

const ResumeTunerApp = () => {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || "/api";
  const [resume, setResume] = useState<File | null>(null);
  const [job, setJob] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [useJobUrl, setUseJobUrl] = useState(false);
  const [latexFormat, setLatexFormat] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [useLatex, setUseLatex] = useState(false);
  const [toast, setToast] = useState("");
  const [showToast, setShowToast] = useState(false);

  const resetForm = () => {
    setResume(null);
    setJob(null);
    setJobUrl("");
    setLatexFormat(null);
    setOutput("");
    setDownloadReady(false);
    setUseLatex(false);
    setUseJobUrl(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setToast("Copied to clipboard");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } catch {
      setToast("Failed to copy");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    }
  };

  const handleSubmit = async () => {
    if (!resume || (!useJobUrl && !job) || (useJobUrl && !jobUrl.trim())) {
      alert("Please fill all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    if (useJobUrl) formData.append("job_url", jobUrl.trim());
    else formData.append("job", job!);
    if (useLatex && latexFormat) formData.append("latex_format", latexFormat);

    setLoading(true);
    setOutput("");
    setDownloadReady(false);
    // Announce start
    setToast("Optimization started…");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);

    try {
      const response = await fetch(`${API_BASE}/analyze/?latex=${useLatex}&plain=${!useLatex}`, {
        method: "POST",
        headers: { Accept: useLatex ? "application/x-latex, text/plain" : "text/plain, application/json" },
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());

      const ct = response.headers.get("content-type") || "";
      if (useLatex) {
        const latexText = await response.text();
        setOutput(latexText);
        setDownloadReady(true);
      } else if (ct.includes("text/plain")) {
        const text = await response.text();
        setOutput(text);
      } else {
        const data = await response.json();
        setOutput(data.optimized_resume || "No result found.");
      }
      // Announce completion
      setToast("Optimization complete");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    } catch (error: any) {
      setOutput("Something went wrong:\n" + error.message);
      setToast("Optimization failed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/x-latex" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "optimized_resume.tex";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 relative" aria-busy={loading}>
      {/* Favicon is set to vite.svg in index.html; no UI display needed */}

      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-center">ResumeTuner</h1>
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

        <div className="flex justify-center gap-4 flex-wrap">
          <button onClick={() => setUseJobUrl(false)} className={`px-4 py-2 rounded ${!useJobUrl ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}>Upload File</button>
          <button onClick={() => setUseJobUrl(true)} className={`px-4 py-2 rounded ${useJobUrl ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}>Paste URL</button>
          <button onClick={() => setUseLatex(false)} className={`px-4 py-2 rounded ${!useLatex ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}>Plain Text</button>
          <button onClick={() => setUseLatex(true)} className={`px-4 py-2 rounded ${useLatex ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}>LaTeX</button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">Resume</h2>
          <input type="file" onChange={(e) => setResume(e.target.files?.[0] || null)} className="w-full border rounded px-4 py-2" />
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">Job Description</h2>
          {useJobUrl ? (
            <input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="Paste URL here" className="w-full border rounded px-4 py-2" />
          ) : (
            <input type="file" onChange={(e) => setJob(e.target.files?.[0] || null)} className="w-full border rounded px-4 py-2" />
          )}
        </div>

        {useLatex && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-xl font-semibold">LaTeX Format (Optional)</h2>
            <input type="file" onChange={(e) => setLatexFormat(e.target.files?.[0] || null)} className="w-full border rounded px-4 py-2" />
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">Output</h2>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded text-lg font-semibold disabled:opacity-50"
          >
            {loading ? <ClipLoader size={24} color="#fff" /> : "Generate Optimized Resume"}
          </button>

          {output && (
            <>
              <div className="relative">
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-white text-sm"
                  aria-label="Copy output to clipboard"
                  title="Copy output"
                >
                  Copy
                </button>
                {useLatex ? (
                  <pre className="bg-gray-100 text-gray-800 p-4 rounded max-h-[40vh] overflow-y-auto whitespace-pre-wrap">{output}</pre>
                ) : (
                  <div className="prose bg-gray-100 text-gray-800 p-4 rounded max-h-[40vh] overflow-y-auto">
                    <ReactMarkdown>{output}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {downloadReady && (
                  <button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white">Download .tex</button>
                )}
                <button onClick={resetForm} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white">Reset</button>
              </div>
            </>
          )}
      </div>
      </div>
      <Toast message={toast} show={showToast} />
      {loading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Optimizing your resume">
          <div className="bg-white text-gray-900 rounded-xl shadow-lg p-6 w-[92%] max-w-md text-center border border-gray-200">
            <div className="mb-3 flex justify-center">
              <ClipLoader size={28} color="#2563eb" />
            </div>
            <div className="text-lg font-semibold">Optimizing your resume…</div>
            <div className="text-sm text-gray-600 mt-1">
              This can take 30–90 seconds. Please don’t close the tab.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeTunerApp;
