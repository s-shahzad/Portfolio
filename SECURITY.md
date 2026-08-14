# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, email:
shaikazhadshahzad@gmail.com

Target response time: 48 hours.

## Scope

This repository is a **static site** — no server, no runtime, no request-time
code. The Python API, its admin authentication, contact-submission handling and
SMTP delivery moved to
[s-shahzad/portfolio-backend](https://github.com/s-shahzad/portfolio-backend)
on 2026-08-14. Controls for those belong in that repository, not this one.

## Current Security Controls

Response headers are set by Netlify (`netlify.toml`), not by application code:

- `Content-Security-Policy` (`default-src 'self'`; `object-src 'none'`;
  `frame-ancestors 'none'`; `base-uri 'self'`)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy` denying accelerometer, camera, geolocation, gyroscope,
  magnetometer, microphone, payment, USB and interest-cohort

## Secret Management

**No secrets are used by this repository.** There is nothing at request time to
authenticate, and no credential is read, stored or required to build or deploy
the site. Netlify deploys from `main` with no build step.

Credential handling for the API is documented in the `portfolio-backend` repo.

## Repository and CI Safeguards

- CI gate: `.github/workflows/ci.yml` — required jobs "Min files fresh" (fails
  if the committed `.min` bundles are stale versus source) and "Static checks"
- Security scans: `.github/workflows/security.yml` (CodeQL, pip-audit, npm audit)
- Automated dependency updates: `.github/dependabot.yml`
- Optional branch protection automation: `scripts/apply-branch-protection.ps1`
- Release chain: `.github/workflows/release.yml`

## Recommended Deployment Settings

For LAN/public deployment, use these minimum settings:

- `PORTFOLIO_ADMIN_REQUIRE_TOKEN=true`
- `PORTFOLIO_ADMIN_TOKEN_HASH=<pbkdf2_sha256$...>`
- `PORTFOLIO_ENABLE_HSTS=true` (only when TLS/HTTPS is active)
- `PORTFOLIO_STATIC_CACHE_MAX_AGE_SECONDS=604800`

## Operational Hardening

API hardening (reverse proxy, service install, DB backups, restore drills,
incident runbook) moved with the service to
[s-shahzad/portfolio-backend](https://github.com/s-shahzad/portfolio-backend)
on 2026-08-14. Nothing in this repository runs at request time.

The standing risk here is different: `netlify.toml` sets `publish = "."`, so
the entire repo root is served, and Netlify matches redirect `from` patterns
**case-sensitively** — `/Scripts/x` bypasses a `/scripts/*` block rule. The
block rules are defence in depth, not a boundary. **Treat every file in this
repository as publicly readable, and do not commit anything that must not be.**

## Verification

Run local checks before publishing:

```bash
node --check script.js
python scripts/static_sanity.py
python scripts/accessibility_perf_sanity.py
```
