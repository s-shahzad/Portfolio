# Contributing

This is a personal portfolio site, so contributions look different from a
typical open-source project. Code improvements are welcome. Content is not
open to edit — the writing, biography, and project descriptions are personal
material.

## What is useful

- Accessibility fixes (contrast, focus order, ARIA, keyboard navigation)
- Performance improvements (bundle size, image handling, Core Web Vitals)
- Browser compatibility bugs
- Broken links, broken builds, security issues
- Typos in code comments or documentation

## What will be declined

- Rewrites of prose, biography, or project descriptions
- Design overhauls not asked for
- Framework migrations
- Anything adding a tracker or third-party script

## Before opening a pull request

```sh
npm run build:css        # regenerate styles.min.css
python -m pytest         # the small test suite
```

CI enforces two required checks: **Min files fresh** and **Static checks**.
Minified assets are served in production, so a change to source CSS or JS
without regenerating the minified output will fail. Bump the `?v=` query string
when assets change, or the browser will serve a cached copy.

## Hard rules

**Never commit a CV or resume PDF.** `reports/assets/*.pdf` is gitignored. These
are generated from a single source of truth and must not be hand-added — a
hand-committed CV is exactly how a false employer name ended up on the live site
and stayed there.

**Never commit an absolute local path.** No `C:\Users\<you>\...`. It leaks a
username and machine layout into a public repository. Use repo-relative paths.

**Never commit a secret**, including in an example file. Secret scanning and
push protection are enabled and will block the push, but do not rely on them as
the control.

## Reporting a security issue

Do not open a public issue. Use
[private vulnerability reporting](https://github.com/s-shahzad/Portfolio/security/advisories/new),
which is enabled on this repository, or email the address on the site.
