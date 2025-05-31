import React, { useState } from "react";

const UploadForm = () => {
  const [resume, setResume] = useState<File | null>(null);
  const [job, setJob] = useState<File | null>(null);
  const [latexFormat, setLatexFormat] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [downloadReady, setDownloadReady] = useState(false);
  const [useLatex, setUseLatex] = useState(false);

  const handleSubmit = async () => {
    if (!resume || !job) {
      alert("Please upload both resume.txt and job.txt");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("job", job);
    if (latexFormat) formData.append("latex_format", latexFormat);

    setLoading(true);
    setOutput("");
    setDownloadReady(false);

    try {
      const response = await fetch(`http://localhost:8000/analyze/?latex=${useLatex}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

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
    <div className="max-w-3xl mx-auto bg-white p-8 mt-10 rounded-lg shadow-lg space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🎯 ResumeTuner</h1>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">📂 Upload Files</legend>

        <div>
          <label className="block font-medium mb-1">
            Resume (resume.txt) <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => setResume(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Job Description (job.txt) <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => setJob(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">
            LaTeX Format (format_template.txt) – Optional
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => setLatexFormat(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>
      </fieldset>

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => setUseLatex(false)}
          className={`px-4 py-2 rounded border ${
            !useLatex ? "bg-blue-600 text-white" : "bg-white border-gray-300"
          }`}
        >
          📄 Plain Text
        </button>
        <button
          onClick={() => setUseLatex(true)}
          className={`px-4 py-2 rounded border ${
            useLatex ? "bg-blue-600 text-white" : "bg-white border-gray-300"
          }`}
        >
          🧪 LaTeX
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : "Generate Optimized Resume"}
      </button>

      {output && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">📄 Output</h2>
          {useLatex ? (
            <pre className="bg-gray-100 p-4 rounded border max-h-[60vh] overflow-y-auto text-sm font-mono whitespace-pre-wrap break-words">
              {output}
            </pre>
          ) : (
            <textarea
              readOnly
              value={output}
              className="w-full bg-gray-100 p-4 rounded border text-sm font-mono h-[60vh] resize-none whitespace-pre-wrap break-words"
            />
          )}

          {downloadReady && (
            <button
              onClick={handleDownload}
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              ⬇️ Download .tex File
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadForm;
