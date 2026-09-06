#!/usr/bin/env node
/**
 * Security checks for sloppinout.com
 * Pure Node.js — no dependencies required.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js   = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
const css  = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

// Strip comments and text nodes before pattern-matching, so checks that look for
// code constructs cannot be tripped by prose or by a commented-out example.
const htmlTags = (html.replace(/<!--[\s\S]*?-->/g, '').match(/<[a-zA-Z][^>]*>/g) || []).join('\n');

// Blank out JS comments while preserving string literals, so a construct merely
// *described* in a comment isn't reported as if it were live code.
const jsCode = js.replace(
  /(['"`])(?:\\.|(?!\1)[^\\])*?\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
  m => (m[0] === '"' || m[0] === "'" || m[0] === '`') ? m : ' '
);

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  \x1b[32m✓\x1b[0m  ${msg}`);
  passed++;
}

function fail(msg, detail = '') {
  console.log(`  \x1b[31m✗\x1b[0m  ${msg}${detail ? `\n       ${detail}` : ''}`);
  failed++;
}

function check(label, ok, detail) {
  ok ? pass(label) : fail(label, detail);
}

console.log('\nSecurity checks\n');

// ── 1. target="_blank" must have rel="noopener noreferrer" ──────────────────
// Tabnapping: a new tab can navigate the opener via window.opener
// Match the whole tag so attribute order doesn't matter, and accept single,
// double, or unquoted target= forms.
const blankLinks = [...htmlTags.matchAll(/<(?:a|area|form)\s[^>]*target\s*=\s*["']?_blank\b[^>]*>/gi)].map(m => m[0]);
const unsafeBlank = blankLinks.filter(tag => !/\brel\s*=\s*["']?[^"'>]*noopener/i.test(tag));
check(
  'All target="_blank" links have rel="noopener noreferrer"',
  unsafeBlank.length === 0,
  unsafeBlank.length ? `${unsafeBlank.length} unsafe link(s) found` : ''
);

// ── 2. No javascript: URLs ──────────────────────────────────────────────────
const jsUrls = [...html.matchAll(/href\s*=\s*["']javascript:/gi)];
check(
  'No javascript: URLs in HTML',
  jsUrls.length === 0,
  jsUrls.length ? `${jsUrls.length} instance(s) found` : ''
);

// ── 3. No inline event handlers in HTML ────────────────────────────────────
// Inline handlers are a CSP anti-pattern and can enable XSS
const inlineHandlers = [...htmlTags.matchAll(/[\s"']on(?:click|error|load|mouse\w+|key\w+|focus|blur|change|submit|input|touch\w+)\s*=/gi)].map(m => m[0].trim());
check(
  'No inline event handlers (onclick, onerror, etc.) in HTML',
  inlineHandlers.length === 0,
  inlineHandlers.length ? `Found: ${[...new Set(inlineHandlers)].join(', ')}` : ''
);

// ── 4. All external URLs use HTTPS ──────────────────────────────────────────
// Mixed content breaks secure pages and exposes users to MITM
const httpLinks = [
  ...htmlTags.matchAll(/(?:href|src|srcset|poster|action|data)\s*=\s*["']http:\/\/[^"']+["']/gi),
  ...css.matchAll(/url\(\s*['"]?http:\/\/[^)'"]+/gi),
  ...css.matchAll(/@import\s+(?:url\()?['"]http:\/\/[^'"]+/gi),
].map(m => m[0]);
check(
  'All external URLs use HTTPS (no mixed content, HTML + CSS)',
  httpLinks.length === 0,
  httpLinks.length ? httpLinks.join('\n       ') : ''
);

// ── 5. No eval() in JavaScript ─────────────────────────────────────────────
const evalUsage = [...jsCode.matchAll(/\beval\s*\(|\bnew\s+Function\s*\(|\[\s*['"]eval['"]\s*\]/g)];
check(
  'No eval()/new Function() in script.js',
  evalUsage.length === 0,
  evalUsage.length ? `${evalUsage.length} instance(s) found` : ''
);

// ── 6. No innerHTML assignments in JavaScript ───────────────────────────────
// innerHTML with dynamic data is the #1 XSS vector
const innerHTMLUsage = [...jsCode.matchAll(/\.(?:inner|outer)HTML\s*\+?=|\.insertAdjacentHTML\s*\(/g)];
check(
  'No innerHTML/outerHTML/insertAdjacentHTML writes in script.js',
  innerHTMLUsage.length === 0,
  innerHTMLUsage.length ? `${innerHTMLUsage.length} instance(s) found` : ''
);

// ── 7. No document.write() in JavaScript ────────────────────────────────────
const docWriteUsage = [...jsCode.matchAll(/document\.write(?:ln)?\s*\(/g)];
check(
  'No document.write() in script.js',
  docWriteUsage.length === 0,
  docWriteUsage.length ? `${docWriteUsage.length} instance(s) found` : ''
);

// ── 8. iframes have a title attribute ──────────────────────────────────────
const iframes = [...html.matchAll(/<iframe[^>]*>/gi)].map(m => m[0]);
const untitledIframes = iframes.filter(tag => !/title\s*=\s*["'][^"']+["']/.test(tag));
check(
  'All iframes have a title attribute',
  untitledIframes.length === 0,
  untitledIframes.length ? `${untitledIframes.length} iframe(s) missing title` : ''
);

// ── 9. No hardcoded credentials or API keys ────────────────────────────────
// Crude but catches common patterns
const credPatterns = [
  /(?:password|passwd|secret|api[_-]?key|auth[_-]?token)\s*[:=]\s*["'][^"']{4,}/i,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/,
];
const credHits = credPatterns.filter(re => re.test(html) || re.test(js));
check(
  'No hardcoded credentials or API keys',
  credHits.length === 0,
  credHits.length ? 'Potential credential pattern detected' : ''
);

// ── 10. Required meta tags present ─────────────────────────────────────────
const hasCharset  = /charset\s*=\s*["']?utf-8/i.test(html);
const hasViewport = /name\s*=\s*["']viewport["']/i.test(html);
check('charset meta tag is set to UTF-8', hasCharset);
check('viewport meta tag is present', hasViewport);


// ── 12. window.open() must not hand the opener to the new tab ───────────────
// Unlike <a target="_blank">, window.open() does NOT imply noopener. A new tab
// opened this way can navigate its opener via window.opener (reverse tabnabbing).
// This is the JS counterpart to check 1 — without it, the suite enforces
// rel="noopener" on anchors while the same URLs are opened unsafely from script.
const openCalls = [...jsCode.matchAll(/window\.open\s*\(([^;]*?)\)/g)].map(m => m[0]);
const unsafeOpens = openCalls.filter(call => !/noopener/.test(call));
check(
  'window.open() calls specify noopener',
  unsafeOpens.length === 0,
  unsafeOpens.length ? unsafeOpens.join('\n       ') : ''
);

// ── 13. No target="_blank" assigned from script ────────────────────────────
// Same vector as above, reached by setting .target instead of calling open().
const jsBlankTargets = [...jsCode.matchAll(/\.target\s*=\s*["']_blank["']/g)];
check(
  'No target="_blank" assigned in script.js',
  jsBlankTargets.length === 0,
  jsBlankTargets.length ? `${jsBlankTargets.length} instance(s) found` : ''
);

// ── 14. External <script>/<link> must not be loaded without integrity ───────
// Nothing external is loaded today except a Google Fonts stylesheet; this guards
// against a future CDN <script> landing without SRI.
const extScripts = [...htmlTags.matchAll(/<script\s[^>]*src\s*=\s*["']https?:\/\/[^>]*>/gi)].map(m => m[0]);
const unpinnedScripts = extScripts.filter(tag => !/\bintegrity\s*=/i.test(tag));
check(
  'External <script> tags pin an integrity hash',
  unpinnedScripts.length === 0,
  unpinnedScripts.length ? `${unpinnedScripts.length} script(s) without SRI` : ''
);

// ── 15. Workflows must not grant blanket write permissions ─────────────────
// A workflow with no permissions: block inherits the repo default, which may be
// read/write for every scope.
const wfDir = path.join(ROOT, '.github', 'workflows');
const workflows = fs.existsSync(wfDir)
  ? fs.readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f))
  : [];
const wfNoPerms = workflows.filter(f => {
  const body = fs.readFileSync(path.join(wfDir, f), 'utf8');
  return !/^permissions:/m.test(body);
});
check(
  'Every workflow declares an explicit permissions: block',
  wfNoPerms.length === 0,
  wfNoPerms.length ? `Missing in: ${wfNoPerms.join(', ')}` : ''
);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed + failed} checks: \x1b[32m${passed} passed\x1b[0m, ${failed ? `\x1b[31m${failed} failed\x1b[0m` : `${failed} failed`}\n`);

if (failed > 0) process.exit(1);
