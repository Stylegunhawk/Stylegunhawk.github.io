/* UtilityVault site — theme system + scroll constellation.
   The data model deliberately mirrors the app:
   THEMES ≈ AppThemes.all, data-mode ≈ ThemeMode, CSS vars ≈ LocalAppColors. */

(function () {
    "use strict";

    /* ---------- Theme registry (display name + swatch preview colors) ---------- */
    var THEMES = [
        { id: "elegant", name: "Elegant", dark: { bg: "#1A1C1E", accent: "#D0BCFF" }, light: { bg: "#F6F4FA", accent: "#6750A4" } },
        { id: "claude", name: "Claude", dark: { bg: "#1F1B17", accent: "#D9905F" }, light: { bg: "#F0EEE9", accent: "#CC785C" } },
        { id: "google", name: "Google", dark: { bg: "#1B1B1F", accent: "#8AB4F8" }, light: { bg: "#FFFFFF", accent: "#4285F4" } },
        { id: "ink", name: "Ink", dark: { bg: "#0A0A0A", accent: "#F5F5F5" }, light: { bg: "#FAFAFA", accent: "#0A0A0A" } },
        { id: "sage", name: "Sage", dark: { bg: "#1A1F1A", accent: "#A7BA9F" }, light: { bg: "#EEF3EA", accent: "#576456" } },
        { id: "sandstone", name: "Sandstone", dark: { bg: "#1C1A16", accent: "#B0A888" }, light: { bg: "#F0ECE4", accent: "#6A6450" } },
        { id: "graphite", name: "Graphite Gold", dark: { bg: "#111214", accent: "#C9A84C" }, light: { bg: "#F4F0E8", accent: "#8A6A1E" } }
    ];

    var root = document.documentElement;

    /* localStorage is wrapped: works on GitHub Pages, degrades silently elsewhere */
    function readPref(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function writePref(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* no-op */ } }

    function applyTheme(id) {
        root.setAttribute("data-theme", id);
        writePref("uv-theme", id);
        syncPressedStates();
    }
    function applyMode(mode) {
        root.setAttribute("data-mode", mode);
        writePref("uv-mode", mode);
        var toggle = document.getElementById("modeToggle");
        if (toggle) toggle.textContent = mode;
        syncPressedStates();
    }

    function syncPressedStates() {
        var active = root.getAttribute("data-theme");
        document.querySelectorAll("[data-theme-pick]").forEach(function (el) {
            el.setAttribute("aria-pressed", String(el.getAttribute("data-theme-pick") === active));
        });
    }

    /* restore saved prefs */
    var savedTheme = readPref("uv-theme");
    var savedMode = readPref("uv-mode");
    if (savedTheme && THEMES.some(function (t) { return t.id === savedTheme; })) root.setAttribute("data-theme", savedTheme);
    if (savedMode === "light" || savedMode === "dark") root.setAttribute("data-mode", savedMode);

    /* ---------- Build the nav chips ---------- */
    var rail = document.getElementById("themeRail");
    if (rail) {
        THEMES.forEach(function (t) {
            var b = document.createElement("button");
            b.className = "theme-chip";
            b.setAttribute("data-theme-pick", t.id);
            b.setAttribute("aria-label", "Switch to " + t.name + " theme");
            b.title = t.name;
            b.style.setProperty("--chip-bg", t.dark.bg);
            b.style.setProperty("--chip-accent", t.dark.accent);
            b.addEventListener("click", function () { applyTheme(t.id); });
            rail.appendChild(b);
        });
    }

    /* ---------- Build the themes-section swatches ---------- */
    var swatchRow = document.getElementById("swatchRow");
    if (swatchRow) {
        THEMES.forEach(function (t) {
            var b = document.createElement("button");
            b.className = "swatch";
            b.setAttribute("data-theme-pick", t.id);
            b.setAttribute("aria-label", "Switch to " + t.name + " theme");
            b.innerHTML =
                '<span class="swatch-dot" style="--sw-bg:' + t.dark.bg + ';--sw-accent:' + t.dark.accent + '"></span>' +
                '<span class="swatch-name">' + t.name + "</span>";
            b.addEventListener("click", function () { applyTheme(t.id); });
            swatchRow.appendChild(b);
        });
    }

    /* ---------- Mode toggle ---------- */
    var toggle = document.getElementById("modeToggle");
    if (toggle) {
        toggle.textContent = root.getAttribute("data-mode");
        toggle.addEventListener("click", function () {
            applyMode(root.getAttribute("data-mode") === "dark" ? "light" : "dark");
        });
    }

    syncPressedStates();

    /* ---------- Constellation path (dynamic) + scroll draw ---------- */
    var constellation = document.getElementById("constellation");
    var track = document.getElementById("pulseTrack");
    var draw = document.getElementById("pulseDraw");
    var pulseSvg = constellation && constellation.querySelector(".pulse-svg");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pathLen = 0;
    var ticking = false;

    function buildPulsePath() {
        if (!pulseSvg || !track || !draw || !constellation) return;
        var rows = Array.from(constellation.querySelectorAll(".feature-row"));
        if (!rows.length) return;

        /* Use getBoundingClientRect so post-font-load layout is always current */
        var cb = constellation.getBoundingClientRect();
        var totalH = cb.height;
        if (totalH <= 0) return;

        var CX = 70, LX = 20, RX = 120;

        /* Y center of each row relative to constellation top.
           Difference of rects cancels scroll offset. */
        var ys = rows.map(function (r) {
            var rb = r.getBoundingClientRect();
            return (rb.top - cb.top) + rb.height / 2;
        });

        /* viewBox height = actual px height → 1:1 coordinate mapping */
        pulseSvg.setAttribute("viewBox", "0 0 140 " + Math.ceil(totalH));

        /* Path starts ON the first dot and ends ON the last — no dangling tails.
           It passes through (CX, y) at every dot, bowing left/right between them.
           Even-indexed cards are right-side (nth-child even, since SVG is child 1),
           so the approaching bow goes left (LX). Odd → right (RX). */
        var d = "M" + CX + "," + ys[0].toFixed(1);
        for (var i = 1; i < ys.length; i++) {
            var prev = ys[i - 1], y = ys[i], span = y - prev;
            var bx = (i % 2 === 0) ? LX : RX;
            d += " C" + bx + "," + (prev + span * 0.35).toFixed(1)
               + " " + bx + "," + (y - span * 0.35).toFixed(1)
               + " " + CX + "," + y.toFixed(1);
        }

        track.setAttribute("d", d);
        draw.setAttribute("d", d);
    }

    function updateScroll() {
        ticking = false;
        if (!draw || !constellation || pathLen <= 0) return;
        var rect = constellation.getBoundingClientRect();
        var vh = window.innerHeight;
        var total = rect.height + vh * 0.45;
        var passed = vh * 0.8 - rect.top;
        var progress = Math.min(1, Math.max(0, passed / total));
        draw.style.strokeDashoffset = String(pathLen * (1 - progress));
    }

    function onScroll() {
        if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); }
    }

    function initScrollDraw() {
        buildPulsePath();
        if (!draw) return;
        pathLen = draw.getTotalLength ? draw.getTotalLength() : 0;
        if (!reduceMotion && pathLen > 0) {
            draw.style.strokeDasharray = String(pathLen);
            updateScroll();
        } else {
            draw.style.strokeDashoffset = "0";
        }
    }

    initScrollDraw();

    /* Re-run after web fonts load — Bricolage Grotesque changes row heights */
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(initScrollDraw);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { initScrollDraw(); onScroll(); });

    /* ---------- Feature cards + nodes light up as the path reaches them ---------- */
    var rows = document.querySelectorAll(".feature-row");
    if ("IntersectionObserver" in window && rows.length) {
        var rowObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var card = entry.target.querySelector(".feature-card");
                    var node = entry.target.querySelector(".feature-node");
                    if (card) card.classList.add("lit");
                    if (node) node.classList.add("lit-node");
                    rowObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.35 });
        rows.forEach(function (r) { rowObserver.observe(r); });
    } else {
        rows.forEach(function (r) {
            var card = r.querySelector(".feature-card");
            var node = r.querySelector(".feature-node");
            if (card) card.classList.add("lit");
            if (node) node.classList.add("lit-node");
        });
    }

    /* ---------- Generic reveal-on-scroll ---------- */
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && reveals.length) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        reveals.forEach(function (el) { revealObserver.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add("in"); });
    }
})();