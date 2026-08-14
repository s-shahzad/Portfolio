(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const navLinks = Array.from(document.querySelectorAll(".nav-links a, .mobile-menu a"));
  const desktopNavLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const brandLogoBtn = document.getElementById("brandLogoBtn");
  const logoModal = document.getElementById("logoModal");
  const logoModalCard = logoModal?.querySelector(".logo-modal__card") || null;
  const logoFlip = document.getElementById("logoFlip");

  const mobileNavQuery = window.matchMedia("(max-width: 768px)");

  let lastFocusedElement = null;

  const initAnalytics = () => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = window.gtag || gtag;
    window.gtag("js", new Date());
    window.gtag("config", "G-3CN94DG5LY");
  };

  const closeMobileMenu = () => {
    if (!navToggle || !mobileMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    mobileMenu.hidden = true;
    document.body.classList.remove("menu-open");
  };

  const syncMobileMenuOverlayMetrics = () => {
    if (!nav || !mobileMenu) return;
    const navRect = nav.getBoundingClientRect();
    const topOffset = Math.max(0, Math.round(navRect.bottom));
    mobileMenu.style.setProperty("--mobile-menu-top", `${topOffset}px`);
    mobileMenu.style.setProperty("--mobile-menu-height", `calc(100dvh - ${topOffset}px)`);
  };

  const openMobileMenu = () => {
    if (!navToggle || !mobileMenu) return;
    lastFocusedElement = document.activeElement;
    syncMobileMenuOverlayMetrics();
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    mobileMenu.hidden = false;
    document.body.classList.add("menu-open");
    const firstFocusable = mobileMenu.querySelector(focusableSelector);
    if (firstFocusable) firstFocusable.focus();
  };

  const setupThemeToggle = () => {
    document.documentElement.setAttribute("data-theme", "dark");
  };
  const setupNavigation = () => {
    const scrollTargetWithMobileOffset = (target, { smooth = false } = {}) => {
      if (!(target instanceof Element)) return;

      target.scrollIntoView({
        behavior: smooth && !prefersReducedMotion ? "smooth" : "auto",
        block: "start",
      });

      // SHA-144: scrolling alone leaves document.activeElement on BODY, so the
      // next Tab dumps keyboard and screen-reader users back at the top of the
      // page instead of continuing from the section they just navigated to.
      // tabindex="-1" makes a non-interactive section programmatically
      // focusable without adding it to the tab order. WCAG 2.4.3.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };

    const syncHashOffset = ({ smooth = false } = {}) => {
      const hash = window.location.hash;
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      scrollTargetWithMobileOffset(target, { smooth });
    };

    const scheduleHashOffsetResync = () => {
      if (!mobileNavQuery.matches) return;
      const retryDelays = [180, 620];
      retryDelays.forEach((delay) => {
        window.setTimeout(() => {
          syncHashOffset({ smooth: false });
        }, delay);
      });
    };
    syncMobileMenuOverlayMetrics();

    const syncOpenMobileMenuOverlay = () => {
      if (mobileMenu.hidden) return;
      syncMobileMenuOverlayMetrics();
    };

    window.addEventListener("resize", syncOpenMobileMenuOverlay);
    window.addEventListener("scroll", syncOpenMobileMenuOverlay, { passive: true });

    if (typeof mobileNavQuery.addEventListener === "function") {
      mobileNavQuery.addEventListener("change", () => syncHashOffset({ smooth: false }));
    } else if (typeof mobileNavQuery.addListener === "function") {
      mobileNavQuery.addListener(() => syncHashOffset({ smooth: false }));
    }

    window.addEventListener("hashchange", () => syncHashOffset({ smooth: true }));
    window.setTimeout(() => syncHashOffset({ smooth: false }), 0);

    if (navToggle && mobileMenu) {
      navToggle.addEventListener("click", () => {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        if (expanded) closeMobileMenu();
        else openMobileMenu();
      });

      mobileMenu.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeMobileMenu();
          navToggle.focus();
        }

        if (event.key !== "Tab") return;
        const focusables = Array.from(mobileMenu.querySelectorAll(focusableSelector));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });

      document.addEventListener("click", (event) => {
        if (mobileMenu.hidden) return;
        const insideMenu = mobileMenu.contains(event.target);
        const insideToggle = navToggle.contains(event.target);
        if (!insideMenu && !insideToggle) closeMobileMenu();
      });
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        history.replaceState(null, "", href);
        closeMobileMenu();
        window.requestAnimationFrame(() => {
          scrollTargetWithMobileOffset(target, { smooth: true });
          scheduleHashOffsetResync();
        });
        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
          lastFocusedElement.focus();
        }
      });
    });

    const onScrollState = () => {
      if (!nav) return;
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScrollState();
    window.addEventListener("scroll", onScrollState, { passive: true });

    // SHA-142: the nav now contains page links ("research/"), not only in-page
    // anchors. document.querySelector("research/") THROWS a SyntaxError — "/" is
    // not valid selector syntax — and because this runs inside setupNavigation(),
    // the throw aborted bootstrapApp() and took analytics, reveal, search and the
    // carousel down with it. Scroll-spy only ever applied to in-page anchors, so
    // restrict the lookup to hrefs that are actually selectors.
    const sectionElements = desktopNavLinks
      .map((link) => {
        const id = link.getAttribute("href");
        const section = id && id.startsWith("#") && id.length > 1 ? document.querySelector(id) : null;
        return section ? { id, section } : null;
      })
      .filter(Boolean);

    if (sectionElements.length) {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!visible) return;
          const activeId = `#${visible.target.id}`;
          desktopNavLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === activeId);
          });
        },
        { rootMargin: "-32% 0px -52% 0px", threshold: [0.15, 0.35, 0.6] }
      );
      sectionElements.forEach(({ section }) => sectionObserver.observe(section));
    }
  };

  const setupReveal = () => {
    const revealTargets = document.querySelectorAll(
      ".section-head, .project-card, .skill-group, .edu-item, .exp-item, .contact-card"
    );
    revealTargets.forEach((node) => node.classList.add("reveal"));

    const revealAll = document.querySelectorAll(".reveal");
    if (prefersReducedMotion) {
      revealAll.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    revealAll.forEach((node) => revealObserver.observe(node));
  };

  const setupBrandBadge = () => {
    if (!brandLogoBtn || !logoModal || !logoModalCard || !logoFlip) return;

    const setLogoVisualState = (hostEl, { hasRichLogo = false, broken = false } = {}) => {
      if (!(hostEl instanceof HTMLElement)) return;
      hostEl.classList.toggle("has-rich-logo", Boolean(hasRichLogo));
      hostEl.classList.toggle("is-logo-fallback", Boolean(broken));
    };

    const initLogoFallback = (logoEl, hostEl, { requireVisibleSize = false } = {}) => {
      if (!(hostEl instanceof HTMLElement) || !(logoEl instanceof Element)) return;

      if (logoEl instanceof HTMLImageElement) {
        const sync = () => {
          const isMissing = logoEl.complete && logoEl.naturalWidth === 0;
          setLogoVisualState(hostEl, { hasRichLogo: !isMissing, broken: isMissing });
        };

        logoEl.addEventListener("load", () => {
          setLogoVisualState(hostEl, { hasRichLogo: true, broken: false });
        });
        logoEl.addEventListener("error", () => {
          setLogoVisualState(hostEl, { hasRichLogo: false, broken: true });
        });

        if (logoEl.complete) sync();
        return;
      }

      if (logoEl instanceof SVGElement) {
        const probe = () => {
          let ok = true;
          try {
            const vb = logoEl.viewBox?.baseVal;
            ok = ok && Boolean(vb && vb.width > 0 && vb.height > 0);
          } catch {
            ok = false;
          }

          if (requireVisibleSize) {
            const rect = logoEl.getBoundingClientRect();
            ok = ok && rect.width >= 20 && rect.height >= 20;
          }

          try {
            if (typeof logoEl.getBBox === "function") {
              const box = logoEl.getBBox();
              if (Number.isFinite(box?.width) && Number.isFinite(box?.height) && (box.width || box.height)) {
                ok = ok && box.width >= 60 && box.height >= 60;
              }
            }
          } catch {
            // Ignore getBBox failures for hidden nodes; visible-size check handles the header logo.
          }

          setLogoVisualState(hostEl, { hasRichLogo: ok, broken: !ok });
        };

        window.requestAnimationFrame(() => {
          probe();
          window.setTimeout(probe, 140);
        });
      }
    };

    // Use the monogram fallback in the header button for webview reliability.
    setLogoVisualState(brandLogoBtn, { hasRichLogo: false, broken: true });
    initLogoFallback(logoModal.querySelector(".logo-big"), logoModal.querySelector(".logo-face--front"));

    let isOpen = false;
    let lastBrandFocus = null;
    let autoFlipTimer = 0;
    let autoFlipInterval = 0;

    const clearAutoFlip = () => {
      window.clearTimeout(autoFlipTimer);
      window.clearInterval(autoFlipInterval);
      autoFlipTimer = 0;
      autoFlipInterval = 0;
    };

    const openModal = () => {
      if (isOpen) return;
      lastBrandFocus = document.activeElement;
      isOpen = true;
      clearAutoFlip();
      logoFlip.classList.remove("is-flipped");
      logoModal.hidden = false;
      logoModal.setAttribute("aria-hidden", "false");
      brandLogoBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("logo-modal-open");

      // SHA-151: the card carries role="dialog" aria-modal="true", which tells
      // assistive tech the rest of the page is inert. That is a lie unless
      // focus actually moves inside. tabindex="-1" makes the card
      // programmatically focusable without putting it in the tab order.
      logoModalCard.setAttribute("tabindex", "-1");

      window.requestAnimationFrame(() => {
        logoModal.classList.add("is-open");
        logoModalCard.focus({ preventScroll: true });
      });

      if (!prefersReducedMotion) {
        autoFlipTimer = window.setTimeout(() => {
          if (!isOpen) return;
          logoFlip.classList.add("is-flipped");
          autoFlipInterval = window.setInterval(() => {
            if (!isOpen) return;
            logoFlip.classList.toggle("is-flipped");
          }, 1600);
        }, 900);
      }
    };

    const closeModal = () => {
      if (!isOpen) return;
      isOpen = false;
      clearAutoFlip();
      logoFlip.classList.remove("is-flipped");
      logoModal.classList.remove("is-open");
      brandLogoBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("logo-modal-open");

      window.setTimeout(() => {
        logoModal.hidden = true;
        logoModal.setAttribute("aria-hidden", "true");
      }, prefersReducedMotion ? 0 : 240);

      // SHA-151: restore focus to whatever opened the dialog before the modal
      // is hidden, so focus is never left on a hidden node.
      if (lastBrandFocus && typeof lastBrandFocus.focus === "function") lastBrandFocus.focus();
      else brandLogoBtn.focus();
    };

    brandLogoBtn.addEventListener("click", openModal);
    brandLogoBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal();
      }
    });

    logoModal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-close]")) closeModal();
    });

    logoModalCard.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    // SHA-151: the same Tab-cycling trap the mobile menu uses, applied to the
    // dialog card. The card currently holds no focusable descendants, so Tab
    // is swallowed and focus stays on the dialog instead of walking out into
    // the page underneath that aria-modal="true" has declared inert. Esc is
    // the close path (handled below); the trap keeps everything else in.
    logoModal.addEventListener("keydown", (event) => {
      if (!isOpen || event.key !== "Tab") return;

      const focusables = Array.from(logoModalCard.querySelectorAll(focusableSelector));
      if (!focusables.length) {
        event.preventDefault();
        logoModalCard.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === logoModalCard)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeModal();
      }
    });
  };

  const setupEducationLogoFallbacks = () => {
    const logos = Array.from(document.querySelectorAll("#education .edu-logo"));
    logos.forEach((img) => {
      const fallback = img.nextElementSibling;
      if (!(fallback instanceof HTMLElement)) return;

      const showFallback = () => {
        img.style.display = "none";
        fallback.style.display = "grid";
      };

      img.addEventListener("error", showFallback);

      if (img.complete && img.naturalWidth === 0) {
        showFallback();
      }
    });
  };

  const setupCopyCitation = () => {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest(".copy-citation");
      if (!button) return;
      const text = button.getAttribute("data-citation") || "";
      const previous = button.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy failed";
      }
      setTimeout(() => {
        button.textContent = previous || "Copy citation";
      }, 1400);
    });
  };

  const syncCanonicalMetadata = () => {
    if (window.location.protocol === "file:") return;
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") return;

    const normalizedPath = window.location.pathname.replace(/\/index\.html$/i, "/");
    const canonicalUrl = `${window.location.origin}${normalizedPath}`;
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl instanceof HTMLLinkElement) canonicalEl.href = canonicalUrl;

    const ogUrlEl = document.querySelector('meta[property="og:url"]');
    if (ogUrlEl instanceof HTMLMetaElement) ogUrlEl.content = canonicalUrl;
  };

  const bootstrapApp = () => {
    setupThemeToggle();
    setupNavigation();
    initAnalytics();
    syncCanonicalMetadata();
    setupBrandBadge();
    setupReveal();
    setupEducationLogoFallbacks();
    setupCopyCitation();
  };

  bootstrapApp();
})();


// === Portfolio audit additions: scroll-spy for nav (2026-05-16) ===
(function () {
  'use strict';
  var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (!navLinks.length) return;
  var sections = [];
  navLinks.forEach(function (link) {
    var id = link.getAttribute('href').slice(1);
    var section = document.getElementById(id);
    if (section) sections.push({ id: id, section: section, link: link });
  });
  if (!sections.length || !('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var match = sections.find(function (s) { return s.section === entry.target; });
      if (!match) return;
      if (entry.isIntersecting) {
        // Remove .is-current from all, add to this one
        sections.forEach(function (s) { s.link.classList.remove('is-current'); });
        match.link.classList.add('is-current');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  sections.forEach(function (s) { observer.observe(s.section); });
})();
