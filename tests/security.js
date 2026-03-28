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
const blankLinks = [...html.matchAll(/target="_blank"[^>]*/g)].map(m => m[0]);
const unsafeBlank = blankLinks.filter(attr => !/rel="[^"]*noopener[^"]*"/.test(attr));
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
const inlineHandlers = [...html.matchAll(/\bon\w+\s*=/gi)].map(m => m[0]);
check(
  'No inline event handlers (onclick, onerror, etc.) in HTML',
  inlineHandlers.length === 0,
  inlineHandlers.length ? `Found: ${[...new Set(inlineHandlers)].join(', ')}` : ''
);

// ── 4. All external URLs use HTTPS ──────────────────────────────────────────
// Mixed content breaks secure pages and exposes users to MITM
const httpLinks = [...html.matchAll(/(?:href|src|action)\s*=\s*["']http:\/\/(?!www\.sloppinout\.com)[^"']+["']/gi)]
  .map(m => m[0]);
check(
  'All external URLs use HTTPS (no mixed content)',
  httpLinks.length === 0,
  httpLinks.length ? httpLinks.join('\n       ') : ''
);

// ── 5. No eval() in JavaScript ─────────────────────────────────────────────
const evalUsage = [...js.matchAll(/\beval\s*\(/g)];
check(
  'No eval() in script.js',
  evalUsage.length === 0,
  evalUsage.length ? `${evalUsage.length} instance(s) found` : ''
);

// ── 6. No innerHTML assignments in JavaScript ───────────────────────────────
// innerHTML with dynamic data is the #1 XSS vector
const innerHTMLUsage = [...js.matchAll(/\.innerHTML\s*=/g)];
check(
  'No innerHTML assignments in script.js',
  innerHTMLUsage.length === 0,
  innerHTMLUsage.length ? `${innerHTMLUsage.length} instance(s) found` : ''
);

// ── 7. No document.write() in JavaScript ────────────────────────────────────
const docWriteUsage = [...js.matchAll(/document\.write\s*\(/g)];
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

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed + failed} checks: \x1b[32m${passed} passed\x1b[0m, ${failed ? `\x1b[31m${failed} failed\x1b[0m` : `${failed} failed`}\n`);

if (failed > 0) process.exit(1);
