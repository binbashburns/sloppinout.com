# CLAUDE.md

Guidance for Claude Code and other agents working in this repo.

## What this is

`sloppinout.com` — an **unofficial, open source fan site** for *Sloppin Out*, the Patreon bonus
content of *What's Our Podcast* (Beck Bennett & Kyle Mooney, a Headgum podcast). It is a single
static page deliberately styled as a **Windows 95 / Internet Explorer desktop**.

This is a **public repo**. Never commit anything private — no emails, no local paths, no tokens.

## Stack

Vanilla HTML, CSS and ES6. **No framework, no bundler, no build step.** The entire site is four
tracked files:

| File | Role |
| --- | --- |
| `index.html` | The whole page. All content is hardcoded here — no CMS, no data files, no fetches. |
| `style.css` | One stylesheet, organised into banner-comment sections, with the Win95 palette as `:root` custom properties. |
| `script.js` | Five small behaviours, all bound with `addEventListener`. |
| `tests/security.js` | Dependency-free Node script — see below, it is load-bearing. |

The only devDependency is `html-validate`.

## Commands

```bash
npm ci            # install (lockfile is committed — do not use npm install in CI)
npm test          # security checks + HTML validation
npm run test:security
npm run test:html

python3 -m http.server 8080    # serve locally
```

The YouTube embed and the visitor badge need a real HTTP server; they do not work over `file://`.

## `tests/security.js` is the style guide, not just a test

Its checks *constrain how you are allowed to write code here*. Before editing, know that CI fails on:

- any `target="_blank"` without `rel="noopener noreferrer"`
- any inline `on*=` handler in HTML — **bind events in `script.js` instead**
- `eval()`, `new Function()`, `.innerHTML`/`.outerHTML` writes, `insertAdjacentHTML`,
  `document.write()`/`writeln()` in `script.js`
- `window.open()` without `noopener`, or `.target = '_blank'` set from script
- `javascript:` URLs, or any `http://` external URL in HTML **or CSS**
- an `<iframe>` without a `title`
- an external `<script>` without an `integrity` hash
- a workflow file with no explicit `permissions:` block

It reads `index.html`, `script.js`, `style.css` and `.github/workflows/`. JS comments are stripped
before code-shape matching, so describing a forbidden construct in a comment is fine.

**If you fix a class of bug, add a check for it.** The suite previously enforced `rel="noopener"`
on anchors while `script.js` opened the same URLs unsafely via `window.open` — the check existed
but had no JS counterpart, so the one real tabnabbing vector was invisible to it.

## The inert retro UI is deliberate

The menu bar (File/Edit/View/Favorites/Help), the `_` and `□` title-bar buttons, the Start button,
the "Go" button and the address bar are **period decoration with no handlers**. This is the joke.

- **Do not wire them up.**
- They are marked `aria-hidden="true" tabindex="-1"` so they stay out of the tab order and off
  the accessibility tree. Keep it that way when adding more chrome.
- The `✕` close buttons *do* fire a joke `alert()`, so those stay focusable and keep an
  `aria-label`. The handler is scoped to `button.close-btn` on purpose — the five link cards
  carry decorative `.close-btn` **spans** that must just follow their parent link.

## Link cards

Each of the five cards is one `<a target="_blank" rel="noopener noreferrer">` wrapping a fake
window. Everything inside is non-interactive (`<span>`, not `<button>`) so that no interactive
element nests inside an anchor. **Do not add a `<button>` inside a link card** — it is invalid
HTML, breaks keyboard navigation, and `element-permitted-content` will fail the build.

The "CLICK HERE!!!!" element is intentionally not wired to any JS. The anchor already navigates.

## `.htmlvalidate.json`

Only **one** rule is disabled: `deprecated`, because `<marquee>` is the entire aesthetic.
`marquee` itself is declared in `.htmlvalidate-elements.json` so the structural rules still apply
to it. If you need to turn off another rule, treat that as a signal you are introducing a real
defect — nine previously-disabled rules were restored by fixing the markup instead.

## Accessibility

The retro styling must not cost real usability:

- Keep the heading outline (`h1` logo → `h2` section → `h3` link names) and the `<main>` landmark.
- Give any control that *does* something an `aria-label`. Note that text content beats `title=`
  in accessible-name computation, so `title="Play"` on a `▶` button does nothing useful.
- `prefers-reduced-motion` is honoured in both CSS and JS. `<marquee>` is not a CSS animation, so
  it can only be stopped from script by setting `scrollamount="0"` — see the end of `script.js`.
- Title-bar contrast is tuned to pass WCAG AA (`--win-blue-light` is `#0f78bd`, 4.73:1 against
  white). Do not lighten it without re-checking.

## Third-party runtime dependencies

The page loads from `fonts.googleapis.com`/`fonts.gstatic.com`, `win98icons.alexmeub.com`,
`visitor-badge.laobi.icu` and `www.youtube-nocookie.com`. All are keyless and unauthenticated.

Prefer self-hosting or inlining over hotlinking. The under-construction badge is an inline SVG
data URI precisely because the image it replaced was silently removed from imgur — and because
imgur served its "removed" placeholder with HTTP 200, the `onerror` fallback never fired.

## CI/CD

| Workflow | Trigger | Does |
| --- | --- | --- |
| `.github/workflows/pr.yml` | PRs to `main` | `npm ci` + full test suite |
| `.github/workflows/deploy.yml` | push to `main` | Runs tests, **then** publishes to GitHub Pages |
| `.github/workflows/security.yml` | PR, push, weekly cron | Calls the reusable pipelines in `binbashburns/security-pipelines` |

Notes:
- `deploy.yml` assembles a `_site/` directory rather than uploading the repo root, so `tests/`,
  `screenshots/` and build config are not published. The rsync step is an **exclude** list, so
  new assets ship automatically; anything that must *not* be published (tests, docs, config) has
  to be added to the excludes.
- `security.yml` deliberately has **no `paths:` filter**. An earlier version filtered to JS/TS
  files, which meant PRs touching `index.html` or `style.css` — most PRs — ran no security scan.
- `.lycheeignore` suppresses hosts that block bots, so the link check doesn't fail or open
  false-positive issues.
- Pages deploys use `cancel-in-progress: false`; never cancel an in-flight production deploy.

## Conventions

- 2-space indent. No linter or formatter is configured.
- Keep `script.js` guard-clause style: query elements once, null-check before binding.
- Drive UI state from the media element's own events, not from optimistic assumptions about
  whether `play()` succeeded.
