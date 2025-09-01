import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

const SITE = 'https://www.resumetuner.app';

const meta = {
  '/': {
    title: 'ResumeTuner — Tailor your resume to any job',
    description:
      'Paste a job description and your resume. Our AI tailors bullets, summary, and keywords so you pass ATS screens and catch recruiter attention.',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'ResumeTuner',
      url: `${SITE}/`,
      applicationCategory: 'Productivity',
      operatingSystem: 'Web',
      description:
        'Paste a job description and your resume. Our AI tailors bullets, summary, and keywords so you pass ATS screens and catch recruiter attention.',
    },
  },
  '/how': {
    title: 'How ResumeTuner works — AI resume optimization',
    description:
      'See how ResumeTuner aligns your resume to a specific job: analysis, rewrite suggestions, and ATS-optimized output.',
  },
  '/example': {
    title: 'Resume before & after — targeted rewrite example',
    description:
      'Compare a generic resume vs. a targeted version for a Senior Frontend Engineer role and see why it ranks better.',
  },
  '/faq': {
    title: 'ResumeTuner FAQ — accuracy, ATS, pricing',
    description:
      'Answers to common questions about ResumeTuner’s AI resume optimization, accuracy, and how to get the best results.',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does this tool do?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'It tailors your resume to a specific job by rewriting bullets, highlighting relevant skills, and improving keyword coverage for ATS.',
          },
        },
        {
          '@type': 'Question',
          name: 'Will it make things up?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'No. You approve every change and can copy only what you want.',
          },
        },
      ],
    },
  },
  '/optimize': {
    title: 'Optimize your resume — ResumeTuner',
    description:
      'Paste your resume and a job description; get tailored bullets, summary, and keywords that align with recruiter and ATS scans.',
  },
  '/ai-resume-optimizer': {
    title: 'AI Resume Optimizer — Pass ATS and Impress Recruiters',
    description:
      'Optimize your resume for a specific job posting with keyword alignment, quantified achievements, and clean structure for fast scanning.',
  },
  '/ats-resume-optimizer': {
    title: 'ATS Resume Optimizer — Increase Your Match Rate',
    description:
      'Tailor your resume for screening algorithms by mirroring job terminology, organizing sections for parsing, and maintaining accuracy.',
  },
  '/resume-keywords-analyzer': {
    title: 'Resume Keywords Analyzer — Match The Job Description',
    description:
      'Find missing and weak keywords, map phrasing to the job post, and strengthen resume relevance without fabricating experience.',
  },
  '/resume-ats-checker': {
    title: 'Resume ATS Checker — Check Your Resume for ATS',
    description:
      'Evaluate your resume for ATS parsing, keyword coverage, and structure. Identify fixes that increase recruiter visibility.',
  },
  '/resume-achievements-generator': {
    title: 'Resume Achievements Generator — Turn Work Into Impact',
    description:
      'Transform tasks into quantified accomplishment bullets with scope, action, and measurable outcomes.',
  },
  '/software-engineer-resume-optimizer': {
    title: 'Software Engineer Resume Optimizer — Stand Out to Hiring Teams',
    description:
      'Tune engineering resumes with stack alignment, impact metrics, and structure optimized for ATS and recruiters.',
  },
};

function injectHead(html, route) {
  const m = meta[route] || meta['/'];
  const canonical = `${SITE}${route === '/' ? '/' : route}`;
  const image = `${SITE}/og-image.png`;
  // Replace title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(m.title)}</title>`);
  // Replace or insert description
  if (html.match(/<meta\s+name=["']description["'][^>]*>/i)) {
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeAttr(m.description)}">`
    );
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${escapeAttr(m.description)}">\n</head>`);
  }
  // Canonical
  if (html.match(/<link\s+rel=["']canonical["'][^>]*>/i)) {
    html = html.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeAttr(canonical)}">`
    );
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${escapeAttr(canonical)}">\n</head>`);
  }
  // OG/Twitter
  const og = [
    ['og:url', canonical],
    ['og:title', m.title],
    ['og:description', m.description],
    ['og:image', image],
  ];
  for (const [prop, val] of og) {
    const re = new RegExp(`<meta\\s+property=["']${prop}["'][^>]*>`, 'i');
    if (re.test(html)) {
      html = html.replace(re, `<meta property="${prop}" content="${escapeAttr(val)}">`);
    } else {
      html = html.replace('</head>', `  <meta property="${prop}" content="${escapeAttr(val)}">\n</head>`);
    }
  }
  const tw = [
    ['twitter:title', m.title],
    ['twitter:description', m.description],
    ['twitter:image', image],
  ];
  for (const [name, val] of tw) {
    const re = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
    if (re.test(html)) {
      html = html.replace(re, `<meta name="${name}" content="${escapeAttr(val)}">`);
    } else {
      html = html.replace('</head>', `  <meta name="${name}" content="${escapeAttr(val)}">\n</head>`);
    }
  }
  // JSON-LD route-specific
  let routeJson = '';
  if (m.jsonld) {
    routeJson = `\n<script type="application/ld+json" id="ldjson-route">${JSON.stringify(m.jsonld)}</script>`;
  }
  if (html.includes('id="ldjson-route"')) {
    html = html.replace(/<script[^>]*id=["']ldjson-route["'][\s\S]*?<\/script>/i, routeJson);
  } else if (routeJson) {
    html = html.replace('</head>', `${routeJson}\n</head>`);
  }
  return html;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escapeAttr(s) {
  return s.replace(/[&"]/g, (c) => ({ '&': '&amp;', '"': '&quot;' }[c]));
}

async function main() {
  if (!existsSync(indexPath)) {
    console.error('dist/index.html not found. Run vite build first.');
    process.exit(1);
  }
  const baseHtml = await readFile(indexPath, 'utf8');
  const routes = ['/', '/how', '/example', '/faq', '/optimize', '/ai-resume-optimizer', '/ats-resume-optimizer', '/resume-keywords-analyzer', '/resume-ats-checker', '/resume-achievements-generator', '/software-engineer-resume-optimizer'];
  for (const route of routes) {
    const outHtml = injectHead(baseHtml, route);
    if (route === '/') {
      await writeFile(indexPath, outHtml, 'utf8');
    } else {
      const dir = path.join(distDir, route.replace(/^\//, ''));
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), outHtml, 'utf8');
    }
  }
  console.log('Prerendered head tags for routes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
