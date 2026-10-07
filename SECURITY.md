# Security Policy

## Scope

This is a static fan site: one HTML page, one stylesheet, one script, no backend and no user
data. The only things that can realistically go wrong are a tabnabbing or XSS vector in the
page, a compromised third-party asset, or a misconfigured workflow.

## Supported versions

Only what is deployed from `main` is supported.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Use GitHub's private reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** and fill in the form.

You should get an acknowledgement within a week. Fixes ship through the normal PR process and
deploy to GitHub Pages automatically.

## What is already checked

Every pull request and every push to `main` runs:

- `tests/security.js` — tabnabbing, inline handlers, mixed content, XSS sinks, SRI and workflow
  permissions
- `html-validate` with the recommended and accessibility rule sets
- Semgrep (SAST), Syft + Grype (SBOM and vulnerability scan), TruffleHog (secrets), lychee (dead
  links) and a ZAP baseline scan (DAST), via
  [binbashburns/security-pipelines](https://github.com/binbashburns/security-pipelines)

The security workflow also runs weekly so that problems in third-party links or dependencies
surface without waiting for a PR.
