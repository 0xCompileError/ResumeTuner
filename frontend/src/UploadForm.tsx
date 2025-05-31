import React, { useState } from "react";
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
      const response = await fetch(`http://localhost:8000/analyze/?latex=${useLatex}`, {
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
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="md:col-span-2 space-y-8">
          <h1 className="text-4xl font-bold tracking-tight">ResumeTuner</h1>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button type="button" onClick={() => setUseJobUrl(false)} className={`px-4 py-2 text-sm font-medium border ${!useJobUrl ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-gray-300'} rounded-l-md border-zinc-700`}>Upload File</button>
              <button type="button" onClick={() => setUseJobUrl(true)} className={`px-4 py-2 text-sm font-medium border ${useJobUrl ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-gray-300'} rounded-r-md border-zinc-700`}>Paste URL</button>
            </div>

            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button type="button" onClick={() => setUseLatex(false)} className={`px-4 py-2 text-sm font-medium border ${!useLatex ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-gray-300'} rounded-l-md border-zinc-700`}>Plain Text</button>
              <button type="button" onClick={() => setUseLatex(true)} className={`px-4 py-2 text-sm font-medium border ${useLatex ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-gray-300'} rounded-r-md border-zinc-700`}>LaTeX</button>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Resume File (.txt)</label>
              <input type="file" onChange={(e) => setResume(e.target.files?.[0] || null)} className="block w-full text-sm text-white bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Job Description</label>
              {useJobUrl ? (
                <input type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="Paste URL here" className="block w-full text-sm text-white bg-zinc-800 border border-zinc-700 rounded-lg p-2" />
              ) : (
                <input type="file" onChange={(e) => setJob(e.target.files?.[0] || null)} className="block w-full text-sm text-white bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer" />
              )}
            </div>
            {useLatex && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Optional LaTeX Format</label>
                <input type="file" onChange={(e) => setLatexFormat(e.target.files?.[0] || null)} className="block w-full text-sm text-white bg-zinc-800 border border-zinc-700 rounded-lg cursor-pointer" />
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col space-y-6 md:mt-10">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded text-lg font-semibold disabled:opacity-50"
          >
            {loading ? <ClipLoader size={24} color="#fff" /> : "Generate Optimized Resume"}
          </button>

          {output && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Output</h2>
              {useLatex ? (
                <pre className="bg-zinc-800 p-4 rounded overflow-y-auto max-h-[40vh] whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="prose prose-invert bg-zinc-800 p-4 rounded max-h-[40vh] overflow-y-auto">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {downloadReady && (
                  <button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white">Download .tex</button>
                )}
                <button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white">Copy</button>
                <button onClick={resetForm} className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded text-white">Reset</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeTunerApp;
