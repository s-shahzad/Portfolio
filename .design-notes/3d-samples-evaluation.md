# 3D portfolio redesign — three working samples

Three standalone, runnable HTML files. Each is a complete page: open it, it works.
All copy is placeholder. No career facts, no research findings, no statistics.

| File | Direction | Technique |
|---|---|---|
| `sample-1-measurement-globe.html` | Point-cloud globe in a bounded hero panel, drag to spin | `THREE.Points` + animated `LineSegments` arcs + wire rings |
| `sample-2-lattice-scroll.html` | Full-viewport lattice, scrolling flies the camera between sections | `InstancedMesh` + merged edges + CatmullRom camera path |
| `sample-3-crt-depth.html` | Full-viewport CRT grid, monospace, DOM parallax | ONE full-screen quad, hand-written fragment shader |

---

## Verified, not asserted

Everything below was measured in a real browser on the real target hardware, not estimated.

- **GPU under test:** `ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x0000A7A0) Direct3D11)` — his actual integrated GPU, `devicePixelRatio: 2`.
- **Frame rate:** all three sustained the rAF ceiling (**119–120 fps**) at desktop viewport. rAF is capped, so the real finding is *frame budget is well under 8.3 ms* — roughly 4x headroom against the 60 fps requirement.
- **Console:** zero errors, zero warnings on all three (one `favicon.ico` 404, which is an artifact of the test server).
- **Mobile (390x844):** low tier engaged automatically, canvas backing store 375x375, DPR capped to 1, **no horizontal overflow**.
- **Reduced motion:** confirmed to render exactly one still frame; `aria-pressed="false"`; nothing animates.
- **No-WebGL fallback:** confirmed by disabling the live class — the page remains a clean, complete, fully readable portfolio (screenshot-verified, not assumed).
- **Accessibility spot-check:** first focusable element is the skip link, canvas is `aria-hidden="true"` with `tabIndex -1` and **out of the tab order**, single `h1`, `lang` set.

Two real bugs were found and fixed by looking at rendered output rather than trusting the code:

1. **Sample 1:** `gl_PointSize` is in *pixels*. My first size formula produced ~85px points and the globe rendered as a solid white disc.
2. **Sample 3:** grid line width was expressed in cell units, so near-camera lines blew out into glowing bars. Fixed with `fwidth()` for true screen-space antialiasing. (Confirmed: `fwidth` is core in WebGL2 and compiles in three's default GLSL ES 1.00 shaders with no extension pragma.)

---

## BLOCKER — read before integrating any of these

**The live site's CSP will block the Three.js CDN.** `netlify.toml` line 14:

```
script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com
```

A `cdn.jsdelivr.net` script is not on that list. Loading three from a CDN on the real site means **either** the 3D silently never loads (the samples degrade gracefully, so you would not necessarily notice), **or** you widen the CSP — which weakens a header you deliberately tightened.

**Do not widen the CSP.** Vendor the library instead:

1. Download `three@0.170.0/build/three.module.min.js` (~470 KB raw, ~120 KB br) to `/assets/vendor/three.module.min.js`.
2. In the sample, change one line: `const THREE_URL = '/assets/vendor/three.module.min.js';`

`'self'` then covers it, the CSP stays as-is, and you drop a third-party dependency from the critical path. Also note: **three r163+ dropped WebGL1 and the UMD build entirely** — there is no `three.min.js` script tag any more, ES modules only. All three samples already test for `webgl2` specifically for this reason.

---

## Comparison

### Visual impression

**Sample 1 — Globe.** The most *legible* of the three. A bounded square panel next to the headline, reading clearly as "probe points across a sphere" within about a second. It looks like an instrument, not a screensaver. Because it is contained, the hero still reads as a document with a figure in it — which is the correct register for an audience that also reads papers. Drag-to-spin gives one moment of interactivity without demanding any.

**Sample 2 — Lattice.** The most impressive on first load and the most cinematic: scrolling genuinely flies you under and around a lattice. Also the most *demanding* — every word of the page sits on top of moving geometry. Getting the lattice to a weight where it read as structure without fighting the headline took three tuning passes (too heavy → too faint → correct), and that tension never fully goes away; it just gets managed with scrims.

**Sample 3 — CRT.** The most restrained and, honestly, the best-looking per unit of effort. Horizon low, upper two-thirds quiet, receding grid anchoring the bottom. The caveat is register: full-page CRT-terminal is a well-worn look, and it reads "hacker aesthetic." A retro grid is also one of the most common shader-portfolio clichés, so it risks reading as templated even though it is not.

### Performance cost

| | Draw calls | Geometry | Runtime cost |
|---|---|---|---|
| **1 — Globe** | 3 | ~1,500 points, ~2,400 line verts | Low. Confined to a ~560px panel, so fragment cost is bounded by panel size, not viewport. Loop stops when the panel scrolls off screen. |
| **2 — Lattice** | 3 | 216 instances (1,728 tris) + 540 edges | Low-moderate. Full-viewport, so fragment cost scales with window. **Render-on-demand**: rAF only runs while the smoothed scroll is converging. On the low tier idle rotation is off, so a phone renders *nothing* when you stop scrolling. |
| **3 — CRT** | **1** | **2 triangles** | Lowest by a wide margin. Pure fragment cost, ~60 ALU ops/pixel, rendered at 0.7x and upscaled. Idles out after 8s of no input. |

Shared budget work across all three: no lights, no shadow maps, no post-processing, DPR hard-capped, `alpha:false`, `powerPreference:'high-performance'`, `matrixAutoUpdate=false` on statics, loop stopped on `visibilitychange`, one-shot adaptive downgrade if median frame time exceeds 20 ms, reduced counts on small screens, full teardown on `pagehide`.

Sources for the technique choices: [discoverthreejs — tips and tricks](https://discoverthreejs.com/tips-and-tricks/) (DPR cap of 2–3 on high-density screens, transparency and direct lights are the expensive things, render-on-demand for battery, `powerPreference`, keep draw calls low, and the counter-intuitive one — built-in MSAA beats an FXAA/SMAA post pass on low-power hardware, so none of these use post-processing AA); [three.js manual — optimize lots of objects](https://threejs.org/manual/en/optimize-lots-of-objects.html) (merge into one geometry rather than one object per datum); [web.dev — prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) (the CSS + `matchMedia` pattern, including the "no-preference" branch).

### SEO risk

**All three keep 100% of content in crawlable DOM.** The canvas is decorative in every case and carries no text. That was a hard constraint and it holds.

Residual risk, honestly ranked:

- **Sample 1 — lowest.** The 3D is one panel below/beside the LCP element. The LCP candidate is the `h1`, which renders immediately from CSS with no dependency on the library. You can defer the whole 3D boot until after load without changing anything the crawler sees.
- **Sample 3 — low.** One quad, tiny shader, but it is a full-viewport fixed element, so it is painting behind the LCP element. Because the CSS fallback backdrop renders instantly, the visual is complete before three arrives.
- **Sample 2 — highest.** Full-viewport backdrop plus scrims plus translucent panels on every section. Most likely of the three to move CLS/LCP in the wrong direction, and the most JS on the path to a complete first view.

**The blunt part.** *None of this helps him outrank the ca.bold.pro impersonation.* Search engines do not rank a page higher for having a nicer canvas. A 3D layer is, at best, SEO-neutral, and at worst a Core Web Vitals regression. The things that would actually move that needle are not in scope of this task and should be tracked separately:

1. **A custom domain.** `azhadshahzadshaik.netlify.app` is a subdomain on a shared host. `bold.pro` is a real product domain with its own authority. This is likely the single biggest lever and it costs about $12/year.
2. **`sameAs` reciprocity** — the existing JSON-LD already lists GitHub, LinkedIn, ORCID and Scholar. Every one of those profiles should link *back* to the site. Entity consolidation is what teaches a search engine which "Azhad Shaik" is real.
3. **Inbound links** from ORCID, Scholar, a DOI landing page, a university page.
4. **Content volume.** The impersonation is a thin profile page. A site with substantive, regularly updated writing outranks a thin profile eventually.

If the goal of this redesign is "outrank the fake," the 3D is the wrong instrument. It is the right instrument for "do not look like a template when a hiring manager opens the tab."

### Implementation effort to integrate into the real site

| | Effort | What actually has to change |
|---|---|---|
| **1 — Globe** | **Small.** ~half a day | Drop a `.stage` div into the existing hero grid, add one script block, vendor three. `styles.css` is untouched below the hero. Nothing else on the page moves. |
| **2 — Lattice** | **Large.** 2–3 days | Every section needs a translucent panel treatment and a re-check of contrast against a moving backdrop. The scrim has to be tuned per section. The camera path has to be re-keyed whenever a section is added, moved or removed. Touches the whole stylesheet. |
| **3 — CRT** | **Medium.** ~1 day | Backdrop and vignette are additive, but the sample commits the page to a monospace-first type system, which is a different design language from the current Fraunces/Bricolage pairing. Either accept that shift or spend the time re-marrying the shader to the existing type. |

All three keep the vanilla-static, no-build, `deploy.ps1`/Netlify flow intact. None introduce npm.

### Maintenance burden

- **Sample 1 — lowest.** Self-contained in one panel. Content changes cannot break it, because it has no relationship to the content. If three ever breaks, the CSS ring shows and the page is still fine.
- **Sample 3 — low, but lumpy.** Nothing to maintain day to day. However, the shader is hand-written maths: if he wants a visual change in a year, editing it means re-deriving the grid, and shader debugging has no stack trace. It is cheap to keep and expensive to change.
- **Sample 2 — highest, and it is coupled to content.** The camera path has one waypoint per section. **Add a section and the camera path is wrong until someone re-keys it.** That is a maintenance trap: the failure is silent and cosmetic, so it will ship broken. For a portfolio that should get a new project every few months, coupling the 3D to the section count is the wrong architecture.

---

## Recommendation

### Pursue Sample 1 — the measurement globe.

Reasoning, in priority order for this specific audience:

1. **It is the only one where text never sits on moving geometry.** For recruiters, hiring managers and admissions committees, readability is not a tie-breaker, it is the product. Samples 2 and 3 both spend ongoing effort defending contrast; sample 1 never has the problem.
2. **The metaphor lands instantly and it is honest.** Probe points on a globe reads as internet-scale measurement in about a second. It says something true about the work, which is what a 6-second scan needs to catch. The lattice is a *cleverer* fit for lattice-based PQC, but nobody decodes it in 6 seconds; the CRT says nothing about the work at all.
3. **It is decoupled from content.** Add a project, add a paper, restructure the page — the globe does not care. Sample 2 breaks silently when the section count changes.
4. **Cheapest to ship and cheapest to reverse.** Half a day, one hero block, and it can be deleted in one commit if it does not test well.
5. **Its failure mode is invisible.** No WebGL, reduced motion, blocked CDN, ancient corporate laptop — you get a clean CSS ring and a page nobody can tell was supposed to do something else.

**Second choice: Sample 3**, if he wants maximum visual return for minimum runtime cost, and is willing to accept the aesthetic risk. Tone the terminal register down — keep the shader, drop the monospace-everything and the `>` prompt affectations, keep Fraunces for headings. The CRT grid under a serif headline is a much less common and more grown-up combination than the full terminal cosplay.

### Do not pursue Sample 2.

It is the best demo and the worst product. Three specific reasons, not taste:

- **The camera path is coupled to the section list.** New project → wrong camera path → silent cosmetic breakage. This is precisely the class of bug that ships and sits there.
- **It puts 100% of his content on top of moving geometry**, permanently, and buys a contrast-tuning problem that never closes. It took three passes to get the hero alone right.
- **It is the highest CWV risk on the page a recruiter loads first**, for a benefit that is invisible on the mobile devices where a meaningful share of first views happen.

It is the sample most likely to impress another developer and least likely to help him get an interview. For a job-search and PhD-application portfolio, that is the wrong trade.

---

## Notes on the research

The WebSearch budget for this session was exhausted (200/200) before I could run it, so I could **not** survey live showcase portfolios. Rather than fabricate a survey, I fetched primary sources directly and designed against those plus the measured hardware:

- [discoverthreejs.com/tips-and-tricks](https://discoverthreejs.com/tips-and-tricks/) — performance, renderer and lighting guidance.
- [threejs.org/manual/en/optimize-lots-of-objects.html](https://threejs.org/manual/en/optimize-lots-of-objects.html) — geometry merging, render-on-demand.
- [web.dev/articles/prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) — reduced-motion handling from CSS and JS.
- [three.js docs — WebGL compatibility check](https://threejs.org/docs/index.html#manual/en/introduction/WebGL-compatibility-check).
- `three@0.170.0` package manifest on jsDelivr — confirmed the available build files and that only ES module builds ship.
- One attempt at `bruno-simon.com` failed to parse (HTML-to-markdown error), so no live-portfolio example was reviewed.

The performance conclusions above do not rest on that reading anyway. They rest on running all three on the actual Iris Xe at DPR 2 and measuring.

---

## Running them

Double-click should work in Chrome/Edge — the samples use dynamic `import()` of an HTTPS URL, and jsDelivr sends `Access-Control-Allow-Origin: *`. If a browser refuses the cross-origin module from `file://`, the import rejects, the catch fires, and you get the static fallback rather than a broken page. To see the 3D guaranteed, serve the folder over HTTP:

```powershell
& "C:\Users\shaik\.bun\bin\bun.exe" -e "Bun.serve({port:8777, fetch:r=>new Response(Bun.file('.'+new URL(r.url).pathname))})"
```

Then open `http://localhost:8777/sample-1-measurement-globe.html`.

Press **`d`** on any sample for a live frame-time / fps / draw-call / DPR readout. The **Motion** button, bottom right, cycles auto → off → on and persists, so the reduced-motion path can be checked without changing OS settings.
