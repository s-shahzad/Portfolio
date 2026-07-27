---
name: Content accuracy
about: A claim, number, or fact on the site looks wrong or outdated
title: "[accuracy] "
labels: content-accuracy
---

## What the site claims

Quote the exact text and where it appears.

## What the evidence says

Link the source: a CI run, a repository, a DOI, or `CAREER-FACTS.yaml`.

## Which direction is the error

- [ ] The site **overstates** (claims more than the evidence supports)
- [ ] The site **understates** (claims less than the evidence supports)
- [ ] The site is **stale** (was true, no longer is)

Overstating is the dangerous direction and should be fixed first. Understating
is worth fixing too — quietly underselling verified work has a cost.

## Notes

Every factual claim on this site should be derivable from a single source of
truth. If a number was typed by hand rather than generated, say so — that is
the actual defect, and fixing only the number leaves the mechanism intact.
