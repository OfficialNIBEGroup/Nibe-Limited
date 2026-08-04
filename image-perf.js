/**
 * Smooth image loading for NIBE Limited site.
 * - Lazy-loads below-the-fold images
 * - Decodes async
 * - Fades images in when ready (no hard pop-in)
 * - Prioritizes logo / above-the-fold images
 */
(function () {
  "use strict";

  var CRITICAL_SELECTORS = [
    ".logo img",
    ".navbar img",
    ".hero img",
    ".hero-section img",
    ".banner img",
  ];

  function isCritical(img) {
    if (img.getAttribute("fetchpriority") === "high") return true;
    if (img.dataset.priority === "high") return true;
    for (var i = 0; i < CRITICAL_SELECTORS.length; i++) {
      try {
        if (img.matches(CRITICAL_SELECTORS[i])) return true;
      } catch (_) {}
    }
    // First viewport-ish images: top of page
    var rect = img.getBoundingClientRect();
    return rect.top < window.innerHeight * 1.1 && rect.bottom > 0;
  }

  function markLoaded(img) {
    img.classList.add("img-loaded");
    img.classList.remove("img-loading");
  }

  function enhanceImage(img) {
    if (img.dataset.perfReady === "1") return;
    img.dataset.perfReady = "1";

    img.decoding = img.decoding || "async";

    var critical = isCritical(img);

    if (critical) {
      img.loading = "eager";
      img.setAttribute("fetchpriority", "high");
      img.classList.add("img-critical");
    } else {
      if (!img.getAttribute("loading")) img.loading = "lazy";
      img.setAttribute("fetchpriority", "low");
    }

    // Smooth fade-in unless already fully cached & complete
    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img);
    } else {
      img.classList.add("img-loading");
      img.addEventListener("load", function onLoad() {
        markLoaded(img);
      }, { once: true });
      img.addEventListener("error", function onErr() {
        markLoaded(img);
      }, { once: true });
    }
  }

  function enhanceAll(root) {
    var imgs = (root || document).querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) enhanceImage(imgs[i]);
  }

  // Run ASAP so classes apply before paint when possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      enhanceAll(document);
    });
  } else {
    enhanceAll(document);
  }

  // Watch dynamically inserted images (sliders, tabs, etc.)
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName === "IMG") enhanceImage(n);
          else if (n.querySelectorAll) enhanceAll(n);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Warm browser cache for the logo early
  try {
    var logo = document.querySelector('.logo img, link[rel="icon"]');
    if (logo) {
      var href = logo.getAttribute("src") || logo.getAttribute("href");
      if (href && "caches" in window === false) {
        // no-op; preload handled via <link rel="preload"> in HTML when present
      }
    }
  } catch (_) {}
})();
