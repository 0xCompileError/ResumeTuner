import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ClipLoader } from "react-spinners";

const ResumeTunerApp = () => {
  const [resume, setResume] = useState<File | null>(null);
  const [job, setJob] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [useJobUrl, setUseJobUrl] = useState(false);
  const [latexFormat, setLatexFormat] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [useLatex, setUseLatex] = useState(false);

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
      alert("Output copied to clipboard.");
    } catch {
      alert("Failed to copy.");
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

    try {
      const response = await fetch(`https://resumetuner-backend.onrender.com/analyze/?latex=${useLatex}`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());

      if (useLatex) {
        const latexText = await response.text();
        setOutput(latexText);
        setDownloadReady(true);
      } else {
        const data = await response.json();
        setOutput(data.optimized_resume || "No result found.");
      }
    } catch (error: any) {
      setOutput("Something went wrong:\n" + error.message);
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
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 relative">
      {/* Maltese icon in top-left corner */}
      <img src="/maltese.png" alt="Maltese dog logo" className="absolute top-4 left-4 h-10 w-10" />

      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-center">ResumeTuner</h1>

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
              {useLatex ? (
                <pre className="bg-gray-100 text-gray-800 p-4 rounded max-h-[40vh] overflow-y-auto whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="prose bg-gray-100 text-gray-800 p-4 rounded max-h-[40vh] overflow-y-auto">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {downloadReady && (
                  <button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white">Download .tex</button>
                )}
                <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">Copy</button>
                <button onClick={resetForm} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white">Reset</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeTunerApp;