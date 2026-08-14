# Azhad Shahzad Shaik — Portfolio

Detection-engineering and applied-ML portfolio. Live site, hybrid NIDS case study, a detection-as-code library, and IEEE-published research.

**Live:** https://azhadshahzadshaik.netlify.app

---

## What's here

- **Fusion NIDS** — a hybrid network intrusion-detection system: live capture and PCAP replay with optional Suricata/Zeek ingest, feeding a supervised ensemble (Random Forest, ExtraTrees, HistGB, XGBoost) and unsupervised detection (IsolationForest, autoencoder) through a signature → ML → weighted-fusion pipeline. Soak-tested for pipeline stability (87,533 packet records, 0 emitted alerts under tuned thresholds), with the headline claim self-audited so it is not quoted as a detection-quality result. See `case-studies/`.
- **Detection-as-code** — rule library across `detections/`: Sigma, Splunk SPL, Suricata, and Zeek.
- **Research** — IEEE GCAIoT 2025 (first author, ML-based IoT intrusion detection) and JIST 2022 (IoT remote health monitoring).
- **Site** — a static frontend (`index.html`, `styles.css`, `script.js`, `assets/`). No backend, no build step, no runtime dependencies.

## Tech

- Frontend: vanilla HTML/CSS/JS, deployed on Netlify (`netlify.toml`).
- Build: esbuild (pinned via `package-lock.json`) minifies `styles.css` → `styles.min.css` and `script.js` → `script.min.js`. The deployed pages load the `.min` files.
- ML/detection: scikit-learn ensemble (Random Forest, ExtraTrees, HistGB), XGBoost, IsolationForest, Suricata, Zeek, Sigma, Splunk SPL.

## Repo layout

```
index.html, styles.css, script.js   # live site
assets/                              # images, screenshots
case-studies/                        # NIDS write-up
detections/                          # sigma · splunk · suricata · zeek
projects/                            # project pages
scripts/                             # build + sanity checks
```

## Run locally

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## The backend moved

The Python API that used to back the contact form now lives in
**[s-shahzad/portfolio-backend](https://github.com/s-shahzad/portfolio-backend)**,
split out on 2026-08-14 with its commit history intact. It was not deployed —
this site makes no API calls and `/api/health` has been 404 for some time.

`src/`, `admin.html`, `render.yaml`, `requirements*.txt`, `pytest.ini`, `ops/`
and the server `.ps1` wrappers went with it, along with `RUNBOOK.md`.

## Deploy pipeline

Netlify auto-builds and publishes on every push to `main`. There is no Netlify build step (`netlify.toml` runs a no-op); the repo is served as-is.

The one rule that matters: **the live pages load `styles.min.css` and `script.min.js`, not the source files.** Editing `styles.css` or `script.js` alone changes nothing on the live site. After any CSS/JS edit:

```bash
npm ci            # first time only — installs the pinned esbuild
npm run build     # regenerates styles.min.css and script.min.js
```

Then bump the `?v=` cache stamp on the changed file's tag in `index.html` (e.g. `styles.min.css?v=20260612-02`), so browsers and the Netlify CDN fetch the new asset instead of a cached one.

Stage the source, the regenerated `.min` file, and `index.html` together — never `git commit -a` (it renormalizes line endings and adds noise):

```bash
git add styles.css styles.min.css index.html   # example: a CSS change
git commit -m "feat(ui): <what changed>"
git push origin main
```

Verify the deploy landed the exact commit:

```bash
git rev-parse HEAD
# compare against the deployed commit_ref in the Netlify dashboard,
# or: gh api repos/s-shahzad/Portfolio/branches/main --jq '.commit.sha'
```

### CI guard

`.github/workflows/ci.yml` runs on every push and PR. The required `verify-min` job rebuilds the `.min` files with the pinned esbuild and **fails if the committed `.min` files are stale versus source** — so a forgotten `npm run build` can never ship a broken (blank-styled) site. `static-checks` validates JS syntax, HTML sanity, and link targets. Run the same checks locally before pushing:

```bash
node --check script.js
python scripts/static_sanity.py
python scripts/accessibility_perf_sanity.py
```

## Operations & security

- **Treat everything in this repo as public.** `netlify.toml` sets `publish = "."`, so the whole repo root is served, and its block rules are matched case-sensitively — `/Scripts/foo` bypasses a `/scripts/*` rule. The rules are defence in depth, not a boundary. Do not put anything here that must stay private.
- No secrets are committed, and there is nothing left to run: the site is static.
- Reporting and security guidance: `SECURITY.md`.
