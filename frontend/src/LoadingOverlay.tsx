import React, { useEffect, useRef, useState } from "react";

type Props = {
  show: boolean;
  onClose?: () => void;
  steps?: string[];
  tickMs?: number; // advance every N ms
  holdOnLast?: boolean; // remain on last step until hidden
  title?: string;
  subtitle?: string;
};

const DEFAULT_STEPS = [
  "Analyze job description",
  "Compare against your resume",
  "Rewrite summary & skills",
  "Refine experience bullets",
  "Format education",
  "Format certifications",
  "Assemble final resume",
  "Optimize for screeners",
];

export default function LoadingOverlay({
  show,
  onClose,
  steps = DEFAULT_STEPS,
  tickMs = 10000,
  holdOnLast = true,
  title = "Optimizing your resume…",
  subtitle = "This usually takes 30–90 seconds.",
}: Props) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  const DETAILS: string[][] = [
    [
      "Extract required skills, responsibilities, and seniority signals.",
      "Identify keywords and domain terms recruiters/ATS scan for.",
      "Structure insights for downstream rewriting steps.",
    ],
    [
      "Find missing or weak keywords in your resume.",
      "Map phrasing to match the job’s language.",
      "Flag sections that need alignment.",
    ],
    [
      "Refresh summary to reflect the target role.",
      "Integrate relevant hard/soft skills truthfully.",
      "Improve clarity and keyword coverage.",
    ],
    [
      "Tighten bullets: action → scope → measurable impact.",
      "Weave in job‑specific terminology without fabricating.",
      "Normalize tense, voice, and style.",
    ],
    [
      "Extract degrees, institutions, and years from your resume.",
      "Normalize and sort entries reverse‑chronologically.",
      "Omit the section if no education is present.",
    ],
    [
      "Pull certification name, issuer, and dates from your resume.",
      "Normalize naming and order by recency.",
      "Omit the section if no certifications are present.",
    ],
    [
      "Merge updated sections into a clean structure.",
      "Ensure consistent headers, spacing, and ATS‑friendly layout.",
      "Prepare content for final polish.",
    ],
    [
      "Tune keywords and synonyms for ATS/AI screeners.",
      "Polish readability for recruiter skim.",
      "Final grammar and concision pass.",
    ],
  ];

  useEffect(() => {
    if (!show) return;
    setIdx(0);
    let i = 0;
    const scheduleNext = () => {
      if (holdOnLast && i >= steps.length - 1) return; // stay on last step
      timerRef.current = window.setTimeout(() => {
        i = Math.min(i + 1, steps.length - 1);
        setIdx(i);
        scheduleNext();
      }, tickMs) as unknown as number;
    };
    scheduleNext();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [show, steps, tickMs, holdOnLast]);

  // Briefly auto-expand the first step to teach interactivity
  useEffect(() => {
    if (!show) return;
    setOpenIdx(0);
    const t = window.setTimeout(() => {
      if (!userInteracted) setOpenIdx(null);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [show, userInteracted]);

  if (!show) return null;

  return (
    <div className="loading-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="loading-card">
        <div className="spinner" aria-hidden />
        <div className="loading-title">{title}</div>
        <div className="loading-sub">{subtitle}</div>
        <div className="loading-hint" aria-live="polite">Tip: click a step to see details</div>

        <ol className="loading-steps" aria-label="Progress steps">
          {steps.map((s, i) => {
            const stateClass = i === idx ? "active" : i < idx ? "done" : "";
            const expanded = openIdx === i;
            const lines = DETAILS[i] || [];
            return (
              <li key={i} className={stateClass}>
                <button
                  type="button"
                  className="step-btn"
                  aria-expanded={expanded}
                  onClick={() => { setOpenIdx(expanded ? null : i); setUserInteracted(true); }}
                >
                  <span className="dot" aria-hidden />
                  <span className="label">{s}</span>
                  <span className="chev" aria-hidden />
                </button>
                {expanded && lines.length ? (
                  <div className="loading-step-detail" role="region" aria-label={`${s} details`}>
                    {lines.slice(0, 3).map((ln, j) => (
                      <div key={j} className="line">{ln}</div>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="progress">
          <div
            className="bar"
            style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
            aria-hidden
          />
        </div>

        {onClose ? (
          <button className="link-btn" onClick={onClose} style={{ marginTop: 10 }}>Hide</button>
        ) : null}
      </div>
    </div>
  );
}
