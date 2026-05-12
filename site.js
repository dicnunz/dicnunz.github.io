(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var slice = Array.prototype.slice;

  function ready(fn) {
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function all(selector, scope) {
    return slice.call((scope || doc).querySelectorAll(selector));
  }

  function addRel(link, token) {
    var rel = (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
    if (rel.indexOf(token) === -1) rel.push(token);
    link.setAttribute("rel", rel.join(" "));
  }

  function hardenExternalLinks() {
    if (!window.URL) return;

    all("a[href]").forEach(function (link) {
      var href = link.getAttribute("href");
      var url;

      if (!href || href.charAt(0) === "#" || /^(mailto|tel|sms|javascript):/i.test(href)) return;

      try {
        url = new URL(href, window.location.href);
      } catch (error) {
        return;
      }

      if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;

      addRel(link, "external");

      if (link.target === "_blank") {
        addRel(link, "noopener");
        addRel(link, "noreferrer");
      }
    });
  }

  function closestCopyTrigger(node) {
    while (node && node !== doc) {
      if (node.nodeType === 1 && node.matches("[data-copy]")) return node;
      node = node.parentNode;
    }
    return null;
  }

  function textFrom(node) {
    if (!node) return "";
    return "value" in node ? node.value : node.textContent;
  }

  function querySafe(selector) {
    try {
      return selector ? doc.querySelector(selector) : null;
    } catch (error) {
      return null;
    }
  }

  function copyValue(trigger) {
    var target = trigger.getAttribute("data-copy-target");
    var targetNode = querySafe(target);
    var value = targetNode ? textFrom(targetNode) : trigger.getAttribute("data-copy");

    if (!value) value = trigger.textContent;
    return (value || "").trim();
  }

  function fallbackCopy(value) {
    var field = doc.createElement("textarea");
    var ok = false;

    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-999px";
    field.style.left = "-999px";
    doc.body.appendChild(field);
    field.select();

    try {
      ok = doc.execCommand("copy");
    } catch (error) {
      ok = false;
    }

    doc.body.removeChild(field);
    return ok ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }

  function writeClipboard(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value).catch(function () {
        return fallbackCopy(value);
      });
    }

    return fallbackCopy(value);
  }

  function setCopyState(trigger, state) {
    trigger.setAttribute("data-copy-state", state);
    window.clearTimeout(trigger._copyStateTimer);
    trigger._copyStateTimer = window.setTimeout(function () {
      trigger.removeAttribute("data-copy-state");
    }, 1500);
  }

  function setupCopy() {
    if (!doc.querySelector("[data-copy]")) return;

    doc.addEventListener("click", function (event) {
      var trigger = closestCopyTrigger(event.target);
      var value;

      if (!trigger) return;

      value = copyValue(trigger);
      if (!value) return;

      event.preventDefault();
      writeClipboard(value).then(
        function () {
          setCopyState(trigger, "copied");
        },
        function () {
          setCopyState(trigger, "error");
        }
      );
    });
  }

  function setupReveal() {
    var items = all("[data-reveal]");
    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var observer;

    if (!items.length) return;

    root.classList.add("has-reveal");

    function reveal(item) {
      item.classList.add("is-visible");
      item.setAttribute("data-revealed", "true");
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(reveal);
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function setupActiveNav() {
    var links = all("[data-section-nav] a[href*='#'], a[data-nav-link][href*='#']");
    var pairs = links.map(function (link) {
      var hash = "";
      var section = hash ? doc.getElementById(hash) : null;

      try {
        if (link.hash && link.href.split("#")[0] === window.location.href.split("#")[0]) {
          hash = decodeURIComponent(link.hash.slice(1));
          section = hash ? doc.getElementById(hash) : null;
        }
      } catch (error) {
        section = null;
      }

      return section ? { link: link, section: section } : null;
    }).filter(Boolean);
    var ticking = false;

    if (!pairs.length) return;

    function sectionTop(section) {
      return section.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop || 0);
    }

    function mark(activeSection) {
      pairs.forEach(function (pair) {
        var on = pair.section === activeSection;
        pair.link.classList.toggle("is-active", on);
        if (on) {
          pair.link.setAttribute("aria-current", "location");
        } else {
          pair.link.removeAttribute("aria-current");
        }
      });
    }

    function update() {
      var line = (window.pageYOffset || root.scrollTop || 0) + Math.min(window.innerHeight * 0.34, 240);
      var activeSection = null;

      pairs.forEach(function (pair) {
        if (sectionTop(pair.section) <= line) activeSection = pair.section;
      });

      mark(activeSection);
      ticking = false;
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("hashchange", requestUpdate);
  }

  ready(function () {
    hardenExternalLinks();
    setupCopy();
    setupReveal();
    setupActiveNav();
  });
}());
