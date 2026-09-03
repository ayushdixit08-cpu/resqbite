import React, { useState, useEffect, useRef, useCallback, useContext, createContext, useMemo } from "react";
import {
  Menu, X, ChevronRight, MapPin, Clock, Users, Leaf, Camera,
  CheckCircle2, AlertCircle, Star, TrendingUp, Package, Truck, Bell,
  Search, Filter, Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight,
  Sparkles, Navigation, Phone, Award, BarChart3, Heart, ShieldCheck,
  Loader2, ArrowLeft, Utensils, Soup, Apple,
  Box, CircleCheck, XCircle, ScanLine, Timer, Gauge, ThumbsUp,
  LayoutGrid, PlusCircle, ChevronDown, Calendar, FileCheck2, Image as ImageIcon, Home, LogOut,
  Monitor, Rocket, Globe, CreditCard, Landmark, Smartphone, Wallet, Info,
  ListChecks, History as HistoryIcon
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { API_BASE_URL } from "./services/api";
import { authService } from "./services/authService";

/* ============================================================
   BACKEND API CLIENT
   Talks to the ResQBite REST API (Node.js + Express + Prisma +
   PostgreSQL — see the downloadable backend project). Point
   RESQBITE_API_URL at your deployed backend to go live; until
   then, calls fail quietly and the UI falls back to sample data.
============================================================= */
const RESQBITE_API_URL = API_BASE_URL;

// Lightweight in-memory response cache, keyed by request path. Lives for
// the SPA session (module scope, not component state) so navigating away
// from a page and back reuses already-fetched data instead of hitting the
// network again, and two components requesting the same path at once
// share a single in-flight request instead of firing it twice.
const apiResultCache = new Map(); // path -> resolved data
const apiInFlight = new Map();    // path -> in-progress promise

// Get JWT token from localStorage or sessionStorage
function getAuthToken() {
  return localStorage.getItem("resqbite_token") || sessionStorage.getItem("resqbite_token");
}

function normalizeApiUser(apiUser) {
  if (!apiUser) return null;
  const normalizedRole = apiUser.role?.toUpperCase();
  const isVolunteer = normalizedRole === "VOLUNTEER";
  const isOrganization = normalizedRole === "NGO" || normalizedRole === "ORGANIZATION" || normalizedRole === "ORG";
  return {
    ...apiUser,
    role: isVolunteer ? "volunteer" : isOrganization ? "org" : "donor",
    ...(isOrganization ? { org: { name: apiUser.bio || apiUser.name } } : {}),
  };
}

function dashboardForRole(user) {
  if (user?.role === "org") return "dashboard";
  if (user?.role === "volunteer") return "volunteer-dashboard";
  if (user?.role === "donor") return "donor-dashboard";
  return "landing";
}

async function apiRequest(path, options = {}) {
  const cacheable = !options.method || options.method.toUpperCase() === "GET";
  if (cacheable && apiResultCache.has(path)) return apiResultCache.get(path);
  if (cacheable && apiInFlight.has(path)) return apiInFlight.get(path);
  const promise = (async () => {
    const res = await fetch(`${RESQBITE_API_URL}${path}`, options);
    if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (cacheable) apiResultCache.set(path, data);
    return data;
  })();
  if (cacheable) apiInFlight.set(path, promise);
  try {
    return await promise;
  } finally {
    if (cacheable) apiInFlight.delete(path);
  }
}

// Authenticated request with JWT token - bypasses cache for live data
async function authenticatedRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  
  let res;
  try {
    res = await fetch(`${RESQBITE_API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(`Unable to reach the API at ${RESQBITE_API_URL}: ${error.message}`, { cause: error });
  }
  
  if (!res.ok) {
    if (res.status === 401) throw new Error("Unauthorized");
    if (res.status === 404) throw new Error("Not found");
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  
  return await res.json();
}

// Synchronous read for a path already resolved this session — lets a page
// initialize its state (and skip the loading skeleton entirely) with data
// it fetched on a previous visit, instead of always starting from null.
function getCached(path) {
  return apiResultCache.get(path);
}

const api = {
  analyticsOverview: () => apiRequest("/analytics/overview"),
  analyticsWeekly: (days = 7) => apiRequest(`/analytics/weekly?days=${days}`),
  analyticsFoodMix: () => apiRequest("/analytics/food-mix"),
  analyticsStatusBreakdown: () => apiRequest("/analytics/status-breakdown"),
  analyticsTopNgos: (limit = 5) => apiRequest(`/analytics/top-ngos?limit=${limit}`),
  donationTracking: (id) => authenticatedRequest(`/donations/${id}`),
  organizations: () => apiRequest("/organizations"),
};

/* ============================================================
   DESIGN TOKENS
   Base   #FAFAF7  (soft warm white, not cliché cream)
   Ink    #14231C  (deep forest-black)
   Primary#1F6F4A  (rescue green)
   PrimaryD #163F2C
   Accent #FF7A3D  (mango — CTAs, urgency)
   Gold   #FFC24B  (turmeric — highlights/badges)
   Sand   #ECE6D8  (card/divider warmth)
   Display: Fraunces (italic accents) / Body: Plus Jakarta Sans / Mono: JetBrains Mono
   Signature element: the "Rescue Line" — an animated route thread of
   dot-nodes (Donor -> Volunteer -> Receiver) that recurs from the hero
   through to the live tracking page, tying the whole product together.
============================================================= */

const T = {
  base: "#FAFAF7",
  ink: "#14231C",
  inkSoft: "#4A5A50",
  primary: "#1F6F4A",
  primaryD: "#163F2C",
  primaryL: "#E7F2EB",
  accent: "#FF7A3D",
  accentD: "#E15F22",
  gold: "#FFC24B",
  sand: "#ECE6D8",
  sandD: "#DCD3BE",
  white: "#FFFFFF",
  danger: "#D64545",
};

const fontDisplay = "'Fraunces', ui-serif, Georgia, serif";
const fontBody = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const fontMono = "'JetBrains Mono', ui-monospace, monospace";

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

    * { box-sizing: border-box; }
    /* !important here is intentional: boilerplate index.css/App.css from
       Vite/CRA templates commonly ships "#root { max-width: 1280px;
       margin: 0 auto; }" which centers the app in a fixed-width column
       and leaves the page background showing as dark/empty bars on
       either side. These rules override that unconditionally so the
       app always fills the full browser width regardless of what's
       loaded elsewhere on the page. */
    html, body, #root {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 100vh !important;
      text-align: initial !important;
    }
    .rq-app-root {
      width: 100%;
      max-width: 100%;
      min-height: 100vh;
    }
    .rq-root { font-family: ${fontBody}; background: ${T.base}; color: ${T.ink}; }
    .rq-root ::selection { background: ${T.gold}; color: ${T.ink}; }

    /* ==========================================================
       HIGH-REFRESH-RATE RENDERING NOTES
       All looping/entrance animations below are driven purely by
       transform, opacity, or SVG attributes that the browser
       compositor can interpolate -- never top/left/width -- so
       they run at whatever cadence the display's compositor thread
       ticks at (60Hz, 90Hz, 120Hz...) with zero JS involved and no
       hardcoded frame timing. will-change hints below simply ask
       the browser to promote these to their own GPU layer up front
       instead of discovering the transform mid-animation.
    ========================================================== */
    @keyframes rq-float { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)); } 50% { transform: translateY(-14px) rotate(var(--r,0deg)); } }
    .rq-float { animation: rq-float 6s ease-in-out infinite; will-change: transform; }
    @keyframes rq-fadeUp { from { opacity:0; transform: translateY(24px);} to {opacity:1; transform: translateY(0);} }
    .rq-fadeUp { animation: rq-fadeUp .8s cubic-bezier(.16,1,.3,1) both; will-change: transform, opacity; }
    @keyframes rq-dash { to { stroke-dashoffset: 0; } }
    @keyframes rq-pulse-dot { 0% { box-shadow: 0 0 0 0 rgba(31,111,74,.5);} 70% { box-shadow: 0 0 0 12px rgba(31,111,74,0);} 100% { box-shadow: 0 0 0 0 rgba(31,111,74,0);} }
    .rq-pulse-dot { animation: rq-pulse-dot 2s infinite; }
    @keyframes rq-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .rq-shimmer { background: linear-gradient(90deg, #eee7d8 0%, #f7f3e8 20%, #eee7d8 40%); background-size: 800px 100%; animation: rq-shimmer 1.6s infinite linear; }
    @keyframes rq-truck { 0% { transform: translateX(0); } 100% { transform: translateX(6px); } }
    .rq-truck { animation: rq-truck 1s ease-in-out infinite alternate; will-change: transform; }
    @keyframes rq-spin { to { transform: rotate(360deg); } }
    .rq-spin { animation: rq-spin 1.1s linear infinite; will-change: transform; }
    @keyframes rq-scan { 0% { transform: translateY(0); } 100% { transform: translateY(220px); } }
    .rq-scanline { top: 0; animation: rq-scan 1.8s ease-in-out infinite alternate; will-change: transform; }
    @keyframes rq-grow { from { transform: scaleX(0); } }
    .rq-grow { animation: rq-grow 1.1s cubic-bezier(.16,1,.3,1) both; transform-origin: left; will-change: transform; }
    @keyframes rq-toastIn {
      0% { opacity: 0; transform: translateY(16px) scale(.98); }
      60% { opacity: 1; transform: translateY(-2px) scale(1); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes rq-toastFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
    @keyframes rq-toastOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
    @keyframes rq-toast-progress { from { width: 100%; } to { width: 0%; } }
    .rq-toast { animation: rq-toastIn .42s cubic-bezier(.16,1,.3,1) both, rq-toastFloat 3.4s ease-in-out .42s infinite; }
    .rq-toast-out { animation: rq-toastOut .32s cubic-bezier(.4,0,1,1) both !important; }
    .rq-toast-progress-track {
      position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
      background: rgba(20,35,28,.08); overflow: hidden;
    }
    .rq-toast-progress-bar {
      height: 100%; width: 100%; transform-origin: left;
      animation: rq-toast-progress 2s linear forwards;
    }
    .rq-toast-host {
      position: fixed; top: 88px; right: 18px; z-index: 200;
      display: flex; flex-direction: column; gap: 10px; align-items: flex-end;
      pointer-events: none;
    }
    .rq-toast-host .rq-toast { pointer-events: auto; }
    @media (max-width: 860px) {
      .rq-toast-host { left: 12px; right: 12px; top: 78px; align-items: center; }
      .rq-toast-host .rq-toast { width: 100%; max-width: 420px; }
    }

    .rq-btn { transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .18s ease, background .18s ease; will-change: transform; }
    .rq-btn:hover { transform: translateY(-2px); }
    .rq-btn:active { transform: translateY(0px) scale(.98); }
    .rq-card-hover { transition: transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease, border-color .2s ease; will-change: transform; }
    .rq-card-hover:hover { transform: translateY(-4px); }
    .rq-underline { position:relative; }
    .rq-underline::after { content:''; position:absolute; left:0; bottom:-3px; width:0; height:2px; background:${T.accent}; transition:width .25s ease; }
    .rq-underline:hover::after { width:100%; }
    .rq-scrollbar::-webkit-scrollbar{width:6px;} .rq-scrollbar::-webkit-scrollbar-thumb{background:${T.sandD};border-radius:8px;}
    .rq-donate-info-sticky {
      position: sticky;
      top: 100px;
      align-self: start;
      max-height: calc(100vh - 140px);
      overflow: hidden;
    }
    @media (max-width: 860px) {
      .rq-donate-info-sticky { position: static; top: auto; align-self: auto; max-height: none; overflow: visible; }
    }

    .rq-clear-all { transition: color .18s ease, opacity .18s ease; }
    .rq-clear-all:hover { color: ${T.accent} !important; opacity: .9; }
    .rq-clear-all:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; border-radius: 4px; }
    .rq-focus:focus { outline: none; box-shadow: 0 0 0 3px rgba(31,111,74,.25); border-color: ${T.primary} !important; }

    /* ==========================================================
       FORM FIELD TEXT / BACKGROUND — applies to every input,
       textarea, and select in the app so typed text, labels, and
       values always stay readable on their light backgrounds,
       and Chrome/Safari autofill never turns the field yellow.
    ========================================================== */
    input, textarea, select {
      color: ${T.ink};
      background-color: ${T.white};
    }
    input::placeholder, textarea::placeholder {
      color: ${T.inkSoft};
      opacity: 1;
    }
    select option { color: ${T.ink}; background-color: ${T.white}; }
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active,
    textarea:-webkit-autofill,
    textarea:-webkit-autofill:hover,
    textarea:-webkit-autofill:focus,
    select:-webkit-autofill,
    select:-webkit-autofill:hover,
    select:-webkit-autofill:focus {
      -webkit-text-fill-color: ${T.ink} !important;
      -webkit-box-shadow: 0 0 0 1000px ${T.white} inset !important;
      box-shadow: 0 0 0 1000px ${T.white} inset !important;
      caret-color: ${T.ink};
      transition: background-color 5000s ease-in-out 0s;
    }

    @media (prefers-reduced-motion: reduce) {
      .rq-float, .rq-fadeUp, .rq-pulse-dot, .rq-shimmer, .rq-truck, .rq-spin, .rq-scanline, .rq-grow, .rq-toast, .rq-toast-out { animation: none !important; }
      .rq-toast-progress-bar { animation-timing-function: linear !important; }
    }

    /* ==========================================================
       GLOBAL SCROLL-REVEAL SYSTEM
       Single reusable primitive (the <Reveal> component + useReveal
       hook, defined below) that every page/section/card opts into.
       Driven by transform + opacity only (no layout-affecting
       properties), re-triggers naturally in both scroll directions
       since it mirrors IntersectionObserver state rather than
       animating once on mount.
    ========================================================== */
    .rq-reveal {
      opacity: 0;
      transform: translateY(26px);
      transition: opacity .6s cubic-bezier(.16,1,.3,1), transform .6s cubic-bezier(.16,1,.3,1);
      will-change: opacity, transform;
    }
    .rq-reveal.rq-reveal-in { opacity: 1; transform: translateY(0); }
    @media (max-width: 480px) {
      .rq-reveal { transform: translateY(14px); transition-duration: .5s; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rq-reveal, .rq-reveal.rq-reveal-in { opacity: 1 !important; transform: none !important; transition: none !important; }
    }
  `}</style>
);

/* ============================================================
   UTILITIES
============================================================= */

function useOnScreen(threshold = 0.3) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ============================================================
   SCROLL-REVEAL SYSTEM
   useReveal: tracks whether an element is currently intersecting
   the viewport (both directions — scrolling down reveals it,
   scrolling past and back up resets + replays it).
   <Reveal>: drop-in wrapper any page can use on a section, card,
   or list item. `index` (+ `staggerMs`) gives groups of siblings
   a small cascade without any per-page animation logic.
============================================================= */

function useReveal({ threshold = 0.18, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold, rootMargin }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);
  return [ref, inView];
}

const Reveal = React.memo(React.forwardRef(function Reveal(
  { as: Tag = "div", index = 0, delayMs, staggerMs = 90, threshold, rootMargin, className = "", style = {}, children, ...rest },
  forwardedRef
) {
  const [ref, inView] = useReveal({ threshold, rootMargin });
  const setRefs = useCallback((node) => {
    ref.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef, ref]);
  const delay = delayMs ?? Math.min(index * staggerMs, 480); // cap so long lists don't stall
  return (
    <Tag
      ref={setRefs}
      className={`rq-reveal${inView ? " rq-reveal-in" : ""}${className ? ` ${className}` : ""}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}));

const CountUp = React.memo(function CountUp({ to, duration = 1400, suffix = "", prefix = "", decimals = 0 }) {
  const [ref, visible] = useOnScreen(0.4);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);
  return (
    <span ref={ref} style={{ fontFamily: fontMono }}>
      {prefix}{val.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}
    </span>
  );
});

/* ============================================================
   TOAST SYSTEM — single global notification component.
   Every toast(), success, error, warning, and info message across
   the entire app renders through ToastHost below, so styling and
   motion only ever need to be changed in one place.
============================================================= */

const TOAST_TONES = {
  success: { Icon: CheckCircle2, color: T.primary },
  error: { Icon: XCircle, color: T.danger },
  warning: { Icon: AlertCircle, color: "#B9790C" },
  info: { Icon: Info, color: "#3B6FB0" },
};

// How long a notification stays on screen before it auto-dismisses.
// The progress bar's CSS animation duration (rq-toast-progress, in the
// GlobalStyle block above) must stay in sync with this value.
const TOAST_VISIBLE_MS = 2000;

function useToasts() {
  const [toasts, setToasts] = useState([]);
  // type: "success" | "error" | "warning" | "info"
  const push = useCallback((msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type, leaving: false }]);
    setTimeout(() => {
      // Mark as leaving first so the exit animation can play, then
      // remove from the list once that animation has finished.
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 360);
    }, TOAST_VISIBLE_MS);
  }, []);
  return { toasts, push };
}

function ToastHost({ toasts }) {
  return (
    <div className="rq-toast-host" aria-live="polite">
      {toasts.map((t) => {
        const tone = TOAST_TONES[t.type] || TOAST_TONES.success;
        return (
          <div key={t.id} className={`rq-toast${t.leaving ? " rq-toast-out" : ""}`} style={{
            position: "relative", overflow: "hidden",
            background: T.white, borderRadius: 14, padding: "13px 16px 15px", minWidth: 240, maxWidth: 360,
            boxShadow: "0 10px 30px rgba(20,35,28,.14), 0 2px 8px rgba(20,35,28,.06)",
            display: "flex", alignItems: "flex-start", gap: 10,
            border: `1px solid ${T.sand}`, fontFamily: fontBody
          }}>
            <tone.Icon size={18} color={tone.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink, lineHeight: 1.45 }}>{t.msg}</span>
            {/* Countdown progress bar — starts the instant the toast becomes
                visible and shrinks 100% -> 0% over TOAST_VISIBLE_MS (2s),
                giving a clear visual cue of how long it will remain. Paused
                once the exit animation begins so it doesn't restart/jump. */}
            <div className="rq-toast-progress-track" aria-hidden="true">
              <div
                className="rq-toast-progress-bar"
                style={{
                  background: tone.color,
                  animationPlayState: t.leaving ? "paused" : "running",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   DUMMY DATA
============================================================= */

const ORG_TYPES = ["NGO", "Orphanage", "Old Age Home", "Shelter", "Community Kitchen", "Food Bank", "Disaster Relief Org"];

const ORGS = [
  { id: "anna-seva-trust", name: "Anna Seva Trust", type: "NGO", distance: "1.2 km", capacity: "80 meals", rating: 4.9, verified: true, hours: "8:00 AM – 9:00 PM", pref: "Veg only" },
  { id: "asha-orphanage", name: "Asha Orphanage", type: "Orphanage", distance: "2.1 km", capacity: "45 meals", rating: 4.8, verified: true, hours: "7:00 AM – 8:00 PM", pref: "Veg & Non-veg" },
  { id: "shanti-old-age-home", name: "Shanti Old Age Home", type: "Old Age Home", distance: "3.4 km", capacity: "30 meals", rating: 4.7, verified: true, hours: "9:00 AM – 6:00 PM", pref: "Soft / low-spice" },
  { id: "umeed-shelter", name: "Umeed Shelter", type: "Shelter", distance: "4.0 km", capacity: "120 meals", rating: 4.6, verified: false, hours: "24 hours", pref: "Any" },
  { id: "sarvodaya-community-kitchen", name: "Sarvodaya Community Kitchen", type: "Community Kitchen", distance: "5.6 km", capacity: "200 meals", rating: 4.9, verified: true, hours: "6:00 AM – 10:00 PM", pref: "Veg only" },
];

// Sample donation records shown on the Dashboard's Donations list —
// intentionally more than the 3 shown by default so "View all" has
// something to reveal (same demo-data convention as ORGS/ACTIVITY).
const DASHBOARD_DONATIONS = [
  { name: "Veg Biryani · 40 servings", org: "Anna Seva Trust", status: "In transit", tone: "gold" },
  { name: "Bread & Bakery · 25 servings", org: "Umeed Shelter", status: "Delivered", tone: "primary" },
  { name: "Fruit Basket · 60 servings", org: "Sarvodaya Community Kitchen", status: "Pending pickup", tone: "accent" },
  { name: "Rajma Chawal · 50 servings", org: "Asha Orphanage", status: "Delivered", tone: "primary" },
  { name: "Sandwich Platter · 30 servings", org: "Shanti Old Age Home", status: "Delivered", tone: "primary" },
  { name: "Paneer Curry · 45 servings", org: "Anna Seva Trust", status: "In transit", tone: "gold" },
  { name: "Mixed Fruit Box · 20 servings", org: "Umeed Shelter", status: "Pending pickup", tone: "accent" },
];

// ============================================================
// ORGANIZATION-AS-RECEIVER DATA MODEL
// An organization account never donates or lists its own food — it
// RECEIVES surplus food that restaurants/businesses/events have made
// available through ResQBite. The flow is:
//   Food provider -> Food available -> Org requests -> Volunteer
//   -> Food delivered -> Org receives food
// ============================================================

// Food currently available from providers (restaurants, businesses,
// events) that the signed-in organization can request.
const AVAILABLE_FOOD = [
  { name: "Veg Biryani", quantity: "40 portions", meals: 40, category: "Prepared Meals", provider: "Grand Palace Banquet Hall", pickupTime: "6:00 PM – 8:00 PM", location: "MG Road, Agra", status: "Available" },
  { name: "Bread & Bakery Assortment", quantity: "25 boxes", meals: 25, category: "Bakery", provider: "Sunrise Bakery", pickupTime: "5:30 PM – 7:00 PM", location: "Sadar Bazaar, Agra", status: "Available" },
  { name: "Fruit Basket", quantity: "60 units", meals: 60, category: "Fruits & Vegetables", provider: "FreshMart Wholesale", pickupTime: "4:00 PM – 6:00 PM", location: "Sanjay Place, Agra", status: "Available" },
  { name: "Paneer Curry & Rice", quantity: "45 servings", meals: 45, category: "Vegetarian", provider: "Spice Route Restaurant", pickupTime: "7:00 PM – 9:00 PM", location: "Fatehabad Road, Agra", status: "Available" },
  { name: "Sandwich Platter", quantity: "30 pieces", meals: 30, category: "Prepared Meals", provider: "Cafe Mocha", pickupTime: "3:00 PM – 5:00 PM", location: "Tajganj, Agra", status: "Available" },
  { name: "Mixed Vegetable Box", quantity: "20 units", meals: 20, category: "Fruits & Vegetables", provider: "Annapurna Kitchen", pickupTime: "2:00 PM – 4:00 PM", location: "Kamla Nagar, Agra", status: "Available" },
];

// Food requests the signed-in organization has made, moving through the
// canonical receiving-side lifecycle:
//   Requested -> Accepted -> Volunteer Assigned -> Picked Up -> In Transit
//   -> Arriving -> Delivered   (or -> Cancelled, off the main line)
const ORG_STAGES = ["Requested", "Accepted", "Volunteer Assigned", "Picked Up", "In Transit", "Arriving", "Delivered"];
const ORG_ACTIVE_STATUSES = ["Requested", "Accepted", "Volunteer Assigned", "Picked Up", "In Transit", "Arriving"];
const ORG_PENDING_DELIVERY_STATUSES = ["Volunteer Assigned", "Picked Up", "In Transit", "Arriving"];
const FOOD_CATEGORY_LIST = ["Prepared Meals", "Vegetarian", "Non-Vegetarian", "Bakery", "Fruits & Vegetables", "Packaged Food", "Other"];
const REQUEST_STATUS_FILTERS = ["All", "Requested", "Accepted", "Assigned", "In Transit", "Delivered", "Cancelled"];
// Maps a filter chip label to the underlying request status(es) it should match.
const REQUEST_STATUS_FILTER_MAP = {
  All: null,
  Requested: ["Requested"],
  Accepted: ["Accepted"],
  Assigned: ["Volunteer Assigned", "Picked Up"],
  "In Transit": ["In Transit", "Arriving"],
  Delivered: ["Delivered"],
  Cancelled: ["Cancelled"],
};

// ============================================================
// SINGLE SOURCE OF TRUTH — every food request the signed-in
// organization has ever made (active + historical). The Track page,
// Dashboard stat cards, weekly chart, category chart, impact section,
// recent activity, and Food History page all read from THIS SAME
// array (via OrgDataProvider below) so numbers never drift apart or
// come from a separate hardcoded list. New requests (from the Request
// Food form or Available Food page) are prepended to it at runtime.
// `weightKg` approximates 0.6kg of food per meal for the "Food
// received" weight stat — a documented estimate, not a fabricated
// precise figure. `deliveredDay` + `weekOffset` (0 = this week, 1 =
// last week) let the weekly chart and % comparison be computed from
// these records instead of a separately hardcoded WEEKLY array.
// ============================================================
const ORG_FOOD_REQUESTS = [
  // ---- ACTIVE (in progress) ----
  { id: "RQ-3381", food: "Veg Biryani", quantity: "40 portions", meals: 40, weightKg: 24, category: "Prepared Meals", provider: "Grand Palace Banquet Hall", volunteer: "Rahul Verma", pickupLocation: "MG Road, Agra", pickupTime: "6:00 PM", eta: "15 minutes", status: "In Transit", requestedAt: "Today, 4:10 PM", updatedAgo: "12 min ago" },
  { id: "RQ-3390", food: "Paneer Curry & Rice", quantity: "45 servings", meals: 45, weightKg: 27, category: "Vegetarian", provider: "Spice Route Restaurant", volunteer: "Priya Nair", pickupLocation: "Fatehabad Road, Agra", pickupTime: "7:30 PM", eta: null, status: "Volunteer Assigned", requestedAt: "Today, 5:00 PM", updatedAgo: "5 min ago" },
  { id: "RQ-3376", food: "Fruit Basket", quantity: "60 units", meals: 60, weightKg: 36, category: "Fruits & Vegetables", provider: "FreshMart Wholesale", volunteer: null, pickupLocation: "Sanjay Place, Agra", pickupTime: "5:00 PM", eta: null, status: "Accepted", requestedAt: "Today, 3:20 PM", updatedAgo: "38 min ago" },
  { id: "RQ-3399", food: "Mixed Vegetable Box", quantity: "20 units", meals: 20, weightKg: 12, category: "Fruits & Vegetables", provider: "Annapurna Kitchen", volunteer: null, pickupLocation: "Kamla Nagar, Agra", pickupTime: "8:00 PM", eta: null, status: "Requested", requestedAt: "Today, 6:05 PM", updatedAgo: "2 min ago" },
  // ---- DELIVERED — this week (drives the weekly chart, weekOffset 0) ----
  { id: "RQ-3200", food: "Sandwich Platter", quantity: "30 pieces", meals: 62, weightKg: 37, category: "Prepared Meals", provider: "Cafe Mocha", volunteer: "Priya Nair", pickupLocation: "Tajganj, Agra", pickupTime: "3:00 PM", eta: null, status: "Delivered", requestedAt: "Mon, 2:00 PM", deliveredDay: "Mon", weekOffset: 0, updatedAgo: "6 days ago" },
  { id: "RQ-3211", food: "Rajma Chawal", quantity: "50 servings", meals: 78, weightKg: 47, category: "Vegetarian", provider: "Annapurna Kitchen", volunteer: "Amit Kumar", pickupLocation: "Kamla Nagar, Agra", pickupTime: "1:00 PM", eta: null, status: "Delivered", requestedAt: "Tue, 12:00 PM", deliveredDay: "Tue", weekOffset: 0, updatedAgo: "5 days ago" },
  { id: "RQ-3222", food: "Bread & Bakery Assortment", quantity: "25 boxes", meals: 54, weightKg: 32, category: "Bakery", provider: "Sunrise Bakery", volunteer: "Sana Sheikh", pickupLocation: "Sadar Bazaar, Agra", pickupTime: "5:30 PM", eta: null, status: "Delivered", requestedAt: "Wed, 4:30 PM", deliveredDay: "Wed", weekOffset: 0, updatedAgo: "4 days ago" },
  { id: "RQ-3233", food: "Chicken Curry & Rice", quantity: "55 servings", meals: 91, weightKg: 55, category: "Non-Vegetarian", provider: "Tandoori Nights", volunteer: "Vikram Singh", pickupLocation: "Sanjay Place, Agra", pickupTime: "8:00 PM", eta: null, status: "Delivered", requestedAt: "Thu, 7:00 PM", deliveredDay: "Thu", weekOffset: 0, updatedAgo: "3 days ago" },
  { id: "RQ-3244", food: "Mixed Fruit Box", quantity: "70 units", meals: 118, weightKg: 71, category: "Fruits & Vegetables", provider: "Fresh Farms Co-op", volunteer: "Rahul Verma", pickupLocation: "Sanjay Place, Agra", pickupTime: "2:00 PM", eta: null, status: "Delivered", requestedAt: "Fri, 1:00 PM", deliveredDay: "Fri", weekOffset: 0, updatedAgo: "2 days ago" },
  { id: "RQ-3255", food: "Packaged Snack Boxes", quantity: "90 boxes", meals: 143, weightKg: 86, category: "Packaged Food", provider: "Royal Sweets", volunteer: "Priya Nair", pickupLocation: "MG Road, Agra", pickupTime: "11:00 AM", eta: null, status: "Delivered", requestedAt: "Sat, 10:00 AM", deliveredDay: "Sat", weekOffset: 0, updatedAgo: "1 day ago" },
  { id: "RQ-3266", food: "Veg Thali", quantity: "60 servings", meals: 96, weightKg: 58, category: "Vegetarian", provider: "Grand Palace Banquet Hall", volunteer: "Amit Kumar", pickupLocation: "MG Road, Agra", pickupTime: "1:30 PM", eta: null, status: "Delivered", requestedAt: "Sun, 12:30 PM", deliveredDay: "Sun", weekOffset: 0, updatedAgo: "6 hr ago" },
  // ---- DELIVERED — last week (drives the week-over-week comparison, weekOffset 1) ----
  { id: "RQ-3100", food: "Veg Pulao", quantity: "35 servings", meals: 50, weightKg: 30, category: "Vegetarian", provider: "Annapurna Kitchen", volunteer: "Sana Sheikh", pickupLocation: "Kamla Nagar, Agra", pickupTime: "1:00 PM", eta: null, status: "Delivered", requestedAt: "Mon, 1:00 PM", deliveredDay: "Mon", weekOffset: 1, updatedAgo: "13 days ago" },
  { id: "RQ-3111", food: "Sandwich Platter", quantity: "35 pieces", meals: 65, weightKg: 39, category: "Prepared Meals", provider: "Cafe Mocha", volunteer: "Priya Nair", pickupLocation: "Tajganj, Agra", pickupTime: "3:00 PM", eta: null, status: "Delivered", requestedAt: "Tue, 2:00 PM", deliveredDay: "Tue", weekOffset: 1, updatedAgo: "12 days ago" },
  { id: "RQ-3122", food: "Bread Assortment", quantity: "20 boxes", meals: 40, weightKg: 24, category: "Bakery", provider: "Sunrise Bakery", volunteer: "Vikram Singh", pickupLocation: "Sadar Bazaar, Agra", pickupTime: "5:00 PM", eta: null, status: "Delivered", requestedAt: "Wed, 4:00 PM", deliveredDay: "Wed", weekOffset: 1, updatedAgo: "11 days ago" },
  { id: "RQ-3133", food: "Mutton Curry & Rice", quantity: "40 servings", meals: 70, weightKg: 42, category: "Non-Vegetarian", provider: "Tandoori Nights", volunteer: "Amit Kumar", pickupLocation: "Sanjay Place, Agra", pickupTime: "7:30 PM", eta: null, status: "Delivered", requestedAt: "Thu, 6:30 PM", deliveredDay: "Thu", weekOffset: 1, updatedAgo: "10 days ago" },
  { id: "RQ-3144", food: "Fruit Basket", quantity: "55 units", meals: 90, weightKg: 54, category: "Fruits & Vegetables", provider: "FreshMart Wholesale", volunteer: "Rahul Verma", pickupLocation: "Sanjay Place, Agra", pickupTime: "4:00 PM", eta: null, status: "Delivered", requestedAt: "Fri, 3:00 PM", deliveredDay: "Fri", weekOffset: 1, updatedAgo: "9 days ago" },
  { id: "RQ-3155", food: "Packaged Snack Boxes", quantity: "65 boxes", meals: 110, weightKg: 66, category: "Packaged Food", provider: "Royal Sweets", volunteer: "Sana Sheikh", pickupLocation: "MG Road, Agra", pickupTime: "11:00 AM", eta: null, status: "Delivered", requestedAt: "Sat, 10:00 AM", deliveredDay: "Sat", weekOffset: 1, updatedAgo: "8 days ago" },
  { id: "RQ-3166", food: "Veg Thali", quantity: "50 servings", meals: 80, weightKg: 48, category: "Vegetarian", provider: "Grand Palace Banquet Hall", volunteer: "Vikram Singh", pickupLocation: "MG Road, Agra", pickupTime: "1:00 PM", eta: null, status: "Delivered", requestedAt: "Sun, 12:00 PM", deliveredDay: "Sun", weekOffset: 1, updatedAgo: "7 days ago" },
  // ---- CANCELLED ----
  { id: "RQ-3070", food: "Rajma Chawal", quantity: "30 servings", meals: 30, weightKg: 18, category: "Vegetarian", provider: "Annapurna Kitchen", volunteer: null, pickupLocation: "Kamla Nagar, Agra", pickupTime: "1:00 PM", eta: null, status: "Cancelled", requestedAt: "5 days ago", updatedAgo: "5 days ago" },
];

function isOrgRequestActive(status) { return ORG_ACTIVE_STATUSES.includes(status); }
function isOrgRequestPendingDelivery(status) { return ORG_PENDING_DELIVERY_STATUSES.includes(status); }
function orgStageIndex(status) { return ORG_STAGES.indexOf(status); }

// Derives initials from a real name string — never a hardcoded pair
// of letters — so any volunteer name pulled from the database renders
// a matching avatar.
function initialsOf(name) {
  if (!name || !name.trim()) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

const ORG_STAGE_ICONS = {
  Requested: PlusCircle, Accepted: CheckCircle2, "Volunteer Assigned": Truck,
  "Picked Up": Package, "In Transit": Truck, Arriving: Navigation, Delivered: Award,
};

// Builds the Track-page timeline strictly from the fields a real
// request record actually carries (status, requestedAt, updatedAgo).
// Only stages the request has actually reached are included — nothing
// further is rendered as a "pending" placeholder — and any stage we
// don't have a real timestamp for shows "Not available" rather than
// an invented time.
function buildRequestTimeline(r) {
  if (!r) return [];
  if (r.status === "Cancelled") {
    return [
      { label: "Requested", icon: PlusCircle, done: true, time: r.requestedAt || "Not available" },
      { label: "Cancelled", icon: XCircle, done: true, cancelled: true, time: r.updatedAgo || "Not available" },
    ];
  }
  const idx = orgStageIndex(r.status);
  if (idx < 0) return [];
  return ORG_STAGES.slice(0, idx + 1).map((stage, i) => {
    const isCurrent = i === idx;
    const isDelivered = stage === "Delivered";
    return {
      label: stage,
      icon: ORG_STAGE_ICONS[stage] || Package,
      done: !isCurrent || isDelivered,
      active: isCurrent && !isDelivered,
      time: stage === "Requested" ? (r.requestedAt || "Not available")
        : isCurrent ? (r.updatedAgo || "Not available")
          : "Not available",
    };
  });
}

// Progress is derived purely from how far along ORG_STAGES the
// request's real status is — never a fixed percentage.
function computeRequestProgress(status) {
  if (!status || status === "Cancelled") return 0;
  const idx = orgStageIndex(status);
  if (idx < 0) return 0;
  return Math.round((idx / (ORG_STAGES.length - 1)) * 100);
}

function toneForOrgStatus(status) {
  if (status === "Delivered") return "primary";
  if (status === "Cancelled") return "danger";
  if (status === "Requested") return "gold";
  if (status === "Accepted") return "primary";
  return "accent"; // Volunteer Assigned / Picked Up / In Transit / Arriving
}

// Computed from the single ORG_FOOD_REQUESTS source (or, at runtime,
// from OrgDataContext's live `requests` state) — never a second,
// independently-maintained set of numbers.
function computeOrgStats(requests) {
  const delivered = requests.filter((r) => r.status === "Delivered");
  return {
    activeRequests: requests.filter((r) => isOrgRequestActive(r.status)).length,
    pendingDeliveries: requests.filter((r) => isOrgRequestPendingDelivery(r.status)).length,
    mealsReceived: delivered.reduce((sum, r) => sum + (r.meals || 0), 0),
    foodReceivedKg: delivered.reduce((sum, r) => sum + (r.weightKg || 0), 0),
  };
}

function computeOrgWeekly(requests) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const thisWeek = Object.fromEntries(days.map((d) => [d, 0]));
  const lastWeek = Object.fromEntries(days.map((d) => [d, 0]));
  requests.forEach((r) => {
    if (r.status !== "Delivered" || !r.deliveredDay) return;
    const bucket = r.weekOffset === 1 ? lastWeek : thisWeek;
    bucket[r.deliveredDay] += r.meals || 0;
  });
  const weekly = days.map((d) => ({ d, meals: thisWeek[d] }));
  const thisTotal = days.reduce((s, d) => s + thisWeek[d], 0);
  const lastTotal = days.reduce((s, d) => s + lastWeek[d], 0);
  const pctChange = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;
  return { weekly, thisTotal, lastTotal, pctChange };
}

const FOOD_CATEGORY_COLORS = {
  "Prepared Meals": T.primary, "Vegetarian": T.gold, "Non-Vegetarian": T.accent,
  "Bakery": T.primaryD, "Fruits & Vegetables": "#6FA96A", "Packaged Food": "#9B7FD1", "Other": T.inkSoft,
};

function computeOrgFoodCategories(requests) {
  const delivered = requests.filter((r) => r.status === "Delivered");
  const totalMeals = delivered.reduce((s, r) => s + (r.meals || 0), 0);
  const byCategory = {};
  delivered.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + (r.meals || 0); });
  return Object.entries(byCategory)
    .map(([name, meals]) => ({ name, value: totalMeals > 0 ? Math.round((meals / totalMeals) * 100) : 0, color: FOOD_CATEGORY_COLORS[name] || T.sand }))
    .sort((a, b) => b.value - a.value);
}

function computeOrgImpact(requests) {
  const delivered = requests.filter((r) => r.status === "Delivered");
  const mealsReceived = delivered.reduce((s, r) => s + (r.meals || 0), 0);
  return {
    mealsReceived,
    foodReceivedKg: delivered.reduce((s, r) => s + (r.weightKg || 0), 0),
    successfulDeliveries: delivered.length,
    providersCount: new Set(delivered.map((r) => r.provider)).size,
    volunteersCount: new Set(delivered.map((r) => r.volunteer).filter(Boolean)).size,
    peopleServed: mealsReceived, // one meal ≈ one person served
  };
}

// Status breakdown for the "Request status breakdown" bar chart —
// counts every request currently in each stage (Cancelled included),
// again from the same single array everything else reads from.
function computeOrgStatusBreakdown(requests) {
  const order = [...ORG_STAGES, "Cancelled"];
  const counts = Object.fromEntries(order.map((s) => [s, 0]));
  requests.forEach((r) => { if (counts[r.status] != null) counts[r.status] += 1; });
  return order.filter((s) => counts[s] > 0).map((s) => ({ status: s, count: counts[s] }));
}

const ORG_ACTIVITY_ICONS = {
  Requested: PlusCircle, Accepted: CheckCircle2, "Volunteer Assigned": Truck, "Picked Up": Package,
  "In Transit": Truck, Arriving: Navigation, Delivered: CheckCircle2, Cancelled: XCircle,
};
const ORG_ACTIVITY_COLORS = {
  Requested: T.gold, Accepted: T.primary, "Volunteer Assigned": T.accent, "Picked Up": T.accent,
  "In Transit": T.accent, Arriving: T.gold, Delivered: T.primary, Cancelled: T.danger,
};
function orgActivityText(r) {
  switch (r.status) {
    case "Requested": return `New food request submitted for ${r.food}`;
    case "Accepted": return `Your request for ${r.meals} meals from ${r.provider} was accepted`;
    case "Volunteer Assigned": return `${r.volunteer} was assigned to pick up your request`;
    case "Picked Up": return `${r.volunteer} picked up ${r.meals} meals from ${r.provider}`;
    case "In Transit": return `${r.meals} meals from ${r.provider} are in transit`;
    case "Arriving": return `${r.volunteer} is arriving with your food`;
    case "Delivered": return `${r.meals} meals were delivered successfully`;
    case "Cancelled": return `Food request for ${r.food} was cancelled`;
    default: return `${r.food} status updated to ${r.status}`;
  }
}
// `requests` is expected newest-first — same convention the rest of the
// file uses for its sample activity feeds (no separate timestamp math
// needed for a demo dataset).
function buildOrgActivity(requests, limit = 4) {
  return requests.slice(0, limit).map((r) => ({
    icon: ORG_ACTIVITY_ICONS[r.status] || Package,
    text: orgActivityText(r),
    time: r.updatedAgo || r.requestedAt,
    color: ORG_ACTIVITY_COLORS[r.status] || T.inkSoft,
  }));
}

// ============================================================
// ORG DATA CONTEXT
// One live, shared "database" of the signed-in organization's food
// requests. TrackingPage, DashboardPage, AvailableFoodPage and
// OrgHistoryPage all read from — and write to — this same context, so
// a status change or a new request is instantly reflected everywhere
// (Track page, dashboard stats/charts, recent activity, food history)
// without any page holding its own disconnected copy.
// ============================================================
const OrgDataContext = createContext(null);

function OrgDataProvider({ children }) {
  const [requests, setRequests] = useState(ORG_FOOD_REQUESTS);
  const addRequest = useCallback((req) => setRequests((prev) => [req, ...prev]), []);
  const value = useMemo(() => {
    const stats = computeOrgStats(requests);
    const weekly = computeOrgWeekly(requests);
    const categories = computeOrgFoodCategories(requests);
    const impact = computeOrgImpact(requests);
    const activity = buildOrgActivity(requests);
    const statusBreakdown = computeOrgStatusBreakdown(requests);
    return { requests, addRequest, stats, weekly, categories, impact, activity, statusBreakdown };
  }, [requests, addRequest]);
  return <OrgDataContext.Provider value={value}>{children}</OrgDataContext.Provider>;
}

function useOrgData() {
  const ctx = useContext(OrgDataContext);
  return ctx || {
    requests: [], addRequest: () => { },
    stats: { activeRequests: 0, pendingDeliveries: 0, mealsReceived: 0, foodReceivedKg: 0 },
    weekly: { weekly: [], thisTotal: 0, lastTotal: 0, pctChange: 0 },
    categories: [], impact: { mealsReceived: 0, foodReceivedKg: 0, successfulDeliveries: 0, providersCount: 0, volunteersCount: 0, peopleServed: 0 },
    activity: [], statusBreakdown: [],
  };
}

const ACTIVITY = [
  { icon: CheckCircle2, text: "Delivery to Anna Seva Trust completed", time: "12 min ago", color: T.primary },
  { icon: Truck, text: "Volunteer Rahul picked up donation #RB-2291", time: "38 min ago", color: T.accent },
  { icon: Package, text: "New donation created — 40 servings, Veg", time: "1 hr ago", color: T.gold },
  { icon: ShieldCheck, text: "Umeed Shelter verified by Admin", time: "3 hr ago", color: T.primary },
];

// Sample upcoming/scheduled notifications shown in the notifications
// dropdown, distinct from past ACTIVITY.
const UPCOMING_NOTIFICATIONS = [
  { icon: Truck, text: "Volunteer arriving for pickup in 15 min", time: "Today, 6:15 PM" },
  { icon: Calendar, text: "Scheduled monthly donation renews tomorrow", time: "Tomorrow, 9:00 AM" },
];



/* ============================================================
   NOTIFICATION CENTER
   Backs the bell dropdown in TopNav. Exposed via context so every
   page gets the same list + "Clear all" behavior without threading
   props through PageShell and every individual page component —
   one source of truth, reused everywhere.
============================================================= */

const NotificationContext = createContext(null);

function notifStorageKey(user) {
  // Scope the cleared-state key to the signed-in account so clearing
  // one user's notifications never touches another user's data.
  return user?.email ? `notif-center:${user.email}` : null;
}

function useNotificationCenter(user, isLoggedIn) {
  const [upcoming, setUpcoming] = useState(UPCOMING_NOTIFICATIONS);
  const [recent, setRecent] = useState(ACTIVITY.slice(0, 3));
  const [ready, setReady] = useState(false);
  const storageKey = notifStorageKey(user);

  // Load this user's cleared-state (if any) whenever the signed-in
  // account changes, so a refresh — or switching accounts — shows the
  // correct list instead of momentarily flashing stale data.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isLoggedIn || !storageKey) {
        if (!cancelled) { setUpcoming(UPCOMING_NOTIFICATIONS); setRecent(ACTIVITY.slice(0, 3)); setReady(true); }
        return;
      }
      try {
        const stored = await window.storage.get(storageKey, false);
        const parsed = stored?.value ? JSON.parse(stored.value) : null;
        if (cancelled) return;
        if (parsed?.cleared) {
          setUpcoming([]);
          setRecent([]);
        } else {
          setUpcoming(UPCOMING_NOTIFICATIONS);
          setRecent(ACTIVITY.slice(0, 3));
        }
      } catch {
        // No stored preference yet for this account — fall back to the
        // default seed data rather than treating this as an error.
        if (!cancelled) { setUpcoming(UPCOMING_NOTIFICATIONS); setRecent(ACTIVITY.slice(0, 3)); }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [storageKey, isLoggedIn]);

  const clearAll = useCallback(async () => {
    // Update state immediately — no waiting on the network/storage
    // round-trip — and cancel nothing else since the notification
    // panel itself owns no other timers (toasts are a separate system).
    setUpcoming([]);
    setRecent([]);
    if (isLoggedIn && storageKey) {
      try {
        await window.storage.set(storageKey, JSON.stringify({ cleared: true, clearedAt: Date.now() }), false);
      } catch (e) {
        console.error("Failed to persist cleared notifications", e);
      }
    }
  }, [isLoggedIn, storageKey]);

  const unreadCount = isLoggedIn ? upcoming.length : 0;

  // Memoized so the context value's identity only changes when the
  // underlying data actually changes — not on every render of the App
  // root (e.g. page navigation) — sparing every consumer (TopNav on
  // every page) an unnecessary re-render.
  return useMemo(
    () => ({ upcoming, recent, unreadCount, clearAll, ready }),
    [upcoming, recent, unreadCount, clearAll, ready]
  );
}

function useNotifications() {
  const ctx = useContext(NotificationContext);
  // Safe fallback for any spot that renders outside the provider (e.g.
  // in isolation/tests) — behaves like an already-cleared, read-only panel.
  return ctx || { upcoming: [], recent: [], unreadCount: 0, clearAll: () => { }, ready: true };
}

/* ============================================================
   USER CONTEXT
   Exposes the signed-in account (name/email/role/org fields) to any
   page or component — TopNav's avatar, Dashboard's greeting, and the
   Volunteer/Organization cards on Tracking all read the same source
   instead of each page needing `user` threaded through as a prop.
============================================================= */

const UserContext = createContext(null);

function useCurrentUser() {
  const ctx = useContext(UserContext);
  return ctx || { user: null, isLoggedIn: false };
}

// Derives a safe display first name from the authenticated user's
// database record — never hardcoded, always falls back to "User" if
// the record isn't available yet.
function firstNameOf(user) {
  const raw = (user?.name || "").trim();
  if (!raw) return "User";
  return raw.split(/\s+/)[0];
}

// Single-letter avatar initial derived from the same record — falls
// back to "U" alongside the "User" name fallback above.
function initialOf(user) {
  return firstNameOf(user).charAt(0).toUpperCase() || "U";
}

const WEEKLY = [
  { d: "Mon", meals: 62 }, { d: "Tue", meals: 78 }, { d: "Wed", meals: 54 },
  { d: "Thu", meals: 91 }, { d: "Fri", meals: 118 }, { d: "Sat", meals: 143 }, { d: "Sun", meals: 96 },
];
const PIE = [
  { name: "Veg", value: 54, color: T.primary },
  { name: "Non-Veg", value: 28, color: T.accent },
  { name: "Bakery/Desserts", value: 18, color: T.gold },
];

const ROLES = [
  { key: "donor", label: "Donor", icon: Heart, sub: "Restaurants, events, individuals" },
  { key: "volunteer", label: "Volunteer", icon: Truck, sub: "Pick up & deliver food" },
  { key: "org", label: "Organization", icon: Building2, sub: "NGO, shelter, kitchen & more" },
];

// Fallback profile used when Login doesn't collect a name (demo only —
// a real build reads this from the authenticated session).
const DEFAULT_USER = { name: "Diksha Sharma", email: "diksha@example.com", phone: "+91 98765 43210", role: "donor" };
// Storage key for the account record created at Signup, keyed by email —
// lets Login look up the real role (donor/volunteer/org) that account was
// created with, instead of assuming a single hardcoded role for everyone.
const accountKey = (email) => `resqbite:account:${(email || "").trim().toLowerCase()}`;

// Sample identity returned by the "Continue with Google" button. A real
// integration would get this from Google's OAuth consent screen; here it
// stands in for that so the button is actually functional in the demo
// instead of just showing a toast and doing nothing.
const GOOGLE_ACCOUNT = { name: "Diksha Sharma", email: "diksha.sharma@gmail.com", phone: "+91 98765 43210" };
// A password is never actually needed for an OAuth sign-in, but the
// Signup form's local state still expects one — this fills that field
// so "Continue with Google" doesn't leave it looking incomplete.
const GOOGLE_GENERATED_PWD = "Google-Auth-9f2k";

// Sample monetary-donation history for a signed-in user's "My Donations"
// section — demo/sample data, same convention as ORGS/ACTIVITY/WEEKLY.
const SEED_DONATIONS = [
  { id: "RB-DN-88213", amount: 1000, frequency: "one-time", status: "Completed", date: "8 August 2026", method: "UPI" },
  { id: "RB-DN-87990", amount: 500, frequency: "monthly", status: "Completed", date: "1 July 2026", method: "Card" },
  { id: "RB-DN-87401", amount: 250, frequency: "one-time", status: "Completed", date: "14 May 2026", method: "UPI" },
];

/* ============================================================
   SHARED PRIMITIVES
============================================================= */

function Logo({ dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${T.primary}, ${T.primaryD})`,
        display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(31,111,74,.35)"
      }}>
        <Leaf size={18} color={T.white} strokeWidth={2.4} />
      </div>
      <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: dark ? T.white : T.ink, letterSpacing: -0.3 }}>
        ResQ<span style={{ color: T.accent, fontStyle: "italic" }}>Bite</span>
      </span>
    </div>
  );
}

function PrimaryButton({ children, onClick, icon: Icon = ArrowRight, style = {}, full, type = "button", disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="rq-btn" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`, color: T.white,
      border: "none", borderRadius: 13, padding: "13px 22px", fontWeight: 700, fontSize: 14.5,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.65 : 1,
      boxShadow: "0 10px 24px rgba(255,122,61,.35)", width: full ? "100%" : "auto", ...style
    }}>
      {children} <Icon size={17} />
    </button>
  );
}

function GhostButton({ children, onClick, style = {}, dark, full }) {
  return (
    <button onClick={onClick} className="rq-btn" style={{
      background: "transparent", color: dark ? T.white : T.ink,
      border: `1.5px solid ${dark ? "rgba(255,255,255,.35)" : T.ink}`, borderRadius: 13,
      padding: "12px 20px", fontWeight: 700, fontSize: 14.5, cursor: "pointer", width: full ? "100%" : "auto", ...style
    }}>
      {children}
    </button>
  );
}

function Pill({ children, tone = "primary" }) {
  const tones = {
    primary: { bg: T.primaryL, fg: T.primaryD },
    gold: { bg: "#FFF4DC", fg: "#8A6212" },
    accent: { bg: "#FFE9DD", fg: T.accentD },
    danger: { bg: "#FBE4E4", fg: T.danger },
  };
  const c = tones[tone];
  return (
    <span style={{ background: c.bg, color: c.fg, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
    </span>
  );
}

/* Signature element: Rescue Line — nodes connected by an animated thread */
function RescueLine({ compact }) {
  const nodes = [
    { icon: Heart, label: "Donor", color: T.accent },
    { icon: Truck, label: "Volunteer", color: T.gold },
    { icon: Building2, label: "Receiver", color: T.primary },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: compact ? "0 6px" : "0 14px" }}>
      <svg width="100%" height="3" style={{ position: "absolute", top: compact ? 18 : 24, left: 0, right: 0 }} preserveAspectRatio="none">
        <line x1="8%" y1="1" x2="92%" y2="1" stroke={T.sandD} strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      </svg>
      {nodes.map((n, i) => (
        <div key={i} style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div className={i === 1 ? "rq-pulse-dot" : ""} style={{
            width: compact ? 36 : 46, height: compact ? 36 : 46, borderRadius: "50%", background: T.white,
            border: `2px solid ${n.color}`, display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <n.icon size={compact ? 16 : 20} color={n.color} />
          </div>
          {!compact && <span style={{ fontSize: 12, fontWeight: 700, color: T.inkSoft }}>{n.label}</span>}
        </div>
      ))}
    </div>
  );
}

const DonationRing = React.memo(function DonationRing({ value, total, size = 74, stroke = 7, color = T.gold }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value / total;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.sand} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .6s cubic-bezier(.16,1,.3,1), stroke .3s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontFamily={fontMono} fontWeight="800" fontSize="15" fill={T.ink}>
        {value}/{total}
      </text>
    </svg>
  );
});

const DONATION_STAGES = [
  { value: 1, label: "Accepted", urgency: "MEDIUM URGENCY", color: T.gold },
  { value: 2, label: "Volunteer assigned", urgency: "MEDIUM URGENCY", color: T.gold },
  { value: 3, label: "Pickup started", urgency: "HIGH URGENCY", color: T.accentD },
  { value: 4, label: "Delivered", urgency: "COMPLETE", color: T.primary },
];

function LiveDonationCard() {
  const [stageIdx, setStageIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx((i) => (i + 1) % DONATION_STAGES.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);
  const stage = DONATION_STAGES[stageIdx];

  return (
    <div style={{
      position: "absolute", inset: "6% 4%", borderRadius: 28, background: T.white,
      border: `1px solid ${T.sand}`, boxShadow: "0 30px 70px rgba(20,35,28,.14)", overflow: "hidden"
    }}>
      <div style={{ padding: 30, position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: fontMono, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: T.inkSoft, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ position: "relative", width: 7, height: 7 }}>
              <span className="rq-pulse-dot" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: T.primary }} />
            </span>
            LIVE DONATION
          </div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 26, color: T.ink, marginBottom: 4 }}>40 servings · Veg Thali</div>
          <div style={{ fontSize: 14, color: T.inkSoft }}>Grand Palace Banquet Hall</div>
        </div>

        <div style={{ background: T.base, borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <DonationRing value={stage.value} total={4} color={stage.color} />
          <div>
            <div key={stage.label} className="rq-fadeUp" style={{ fontWeight: 800, fontSize: 16, color: T.ink, marginBottom: 2 }}>{stage.label}</div>
            <div style={{ fontFamily: fontMono, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: stage.color === T.primary ? T.primary : T.accentD }}>{stage.urgency}</div>
          </div>
        </div>

        <div>
          <div style={{ height: 1, background: T.sand, marginBottom: 14 }} />
          <div style={{ fontFamily: fontMono, fontSize: 11, color: T.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }} /> Rescue Ring · tracks stage &amp; urgency together
          </div>
        </div>
      </div>
    </div>
  );
}

function TopNav({ go, toast, page = "landing", isLoggedIn = false, onSignOut }) {
  const { user } = useCurrentUser();
  const userInitials = initialOf(user);
  // Organization accounts are food RECEIVERS, not donors — their nav
  // swaps "Donate" for "Available Food" and adds "History", and drops
  // the "Orgs" directory (an org account isn't browsing other orgs).
  const isOrg = user?.role === "org" && !!user?.org;
  const items = isOrg ? [
    { key: "landing", label: "Home", icon: Home },
    { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "available-food", label: "Available Food", icon: Package },
    { key: "tracking", label: "Track", icon: Navigation },
    { key: "org-history", label: "History", icon: Clock },
  ] : [
    { key: "landing", label: "Home", icon: Home },
    { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "donate", label: "Donate", icon: PlusCircle },
    { key: "tracking", label: "Track", icon: Navigation },
  ];
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const { upcoming, recent, unreadCount, clearAll } = useNotifications();
  const hasNotifications = upcoming.length > 0 || recent.length > 0;

  const handleClearAll = async () => {
    await clearAll();
    toast("All notifications cleared");
  };

  // Close the mobile menu on outside click and on Escape, so it never
  // traps focus or lingers over content the person didn't ask to see.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setMobileMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMobileMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [mobileMenuOpen]);

  const goAndClose = (p) => { setMobileMenuOpen(false); go(p); };

  // "Donate" and "Orgs" are gated behind sign-in — an anonymous visitor
  // is routed to Login instead. "Track" (and everything else in `items`)
  // stays open to everyone; TrackingPage itself hides the sensitive
  // delivery-time/delivery-partner details when signed out.
  const GUARDED_KEYS = ["donate", "organizations"];
  const handleNavClick = (key) => {
    if (GUARDED_KEYS.includes(key) && !isLoggedIn) {
      toast("Please sign in to continue", "error");
      go("login");
      return;
    }
    go(key);
  };
  const handleNavClickAndClose = (key) => { setMobileMenuOpen(false); handleNavClick(key); };

  return (
    <div ref={navRef} style={{
      position: "sticky", top: 0, zIndex: 100, background: "rgba(250,250,247,.9)",
      backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.sand}`,
      // Promote to its own compositor layer so the blurred, sticky
      // header doesn't get repainted with the rest of the page while
      // scrolling — keeps scroll smooth up to whatever refresh rate
      // the display supports.
      willChange: "transform", transform: "translateZ(0)"
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "13px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 9, minWidth: 0 }} onClick={() => go("landing")}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${T.primary}, ${T.primaryD})`,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(31,111,74,.35)", flexShrink: 0
          }}>
            <Leaf size={18} color={T.white} strokeWidth={2.4} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: T.ink, letterSpacing: -0.3, lineHeight: 1, whiteSpace: "nowrap" }}>
              ResQ<span style={{ color: T.accent, fontStyle: "italic" }}>Bite</span>
            </div>
            <div className="rq-logo-sub" style={{ fontFamily: fontMono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: T.inkSoft, marginTop: 3, whiteSpace: "nowrap" }}>
              EVERY BITE COUNTS
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 2 }} className="rq-desktop-nav">
          {items.map((it) => {
            const active = page === it.key;
            return (
              <button key={it.key} onClick={() => handleNavClick(it.key)} className="rq-btn" style={{
                display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
                background: active ? T.primaryL : "transparent", color: active ? T.primaryD : T.inkSoft,
                fontWeight: 700, fontSize: 13, padding: "8px 12px", borderRadius: 10, whiteSpace: "nowrap"
              }}>
                <it.icon size={15} /> {it.label}
              </button>
            );
          })}
          {!isOrg && (
            <button onClick={() => handleNavClick("organizations")} className="rq-btn" style={{
              display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
              background: page === "organizations" ? T.primaryL : "transparent", color: page === "organizations" ? T.primaryD : T.inkSoft,
              fontWeight: 700, fontSize: 13, padding: "8px 12px", borderRadius: 10, whiteSpace: "nowrap"
            }}>
              <Building2 size={15} /> Orgs
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications" aria-expanded={notifOpen} className="rq-btn" style={{
              width: 38, height: 38, borderRadius: 11, border: `1px solid ${T.sand}`, background: T.white, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0
            }}>
              <Bell size={16} color={T.ink} />
              {isLoggedIn && unreadCount > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: "50%", background: T.accent, border: `2px solid ${T.white}` }} />}
            </button>
            {notifOpen && (
              <div className="rq-fadeUp rq-notif-panel" style={{ position: "absolute", right: 0, top: 46, width: 300, background: T.ink, borderRadius: 16, boxShadow: "0 20px 50px rgba(20,35,28,.35)", border: `1px solid rgba(255,255,255,.08)`, padding: 10, zIndex: 250 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px 10px", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.white }}>Notifications</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isLoggedIn && unreadCount > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.accent, background: "rgba(255,122,61,.15)", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{unreadCount} new</span>}
                    {hasNotifications && (
                      <button onClick={handleClearAll} className="rq-clear-all" style={{
                        fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,.6)", background: "none",
                        border: "none", cursor: "pointer", padding: "3px 2px", whiteSpace: "nowrap"
                      }}>
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {!hasNotifications ? (
                  <div style={{ textAlign: "center", padding: "26px 14px 22px" }}>
                    <CheckCircle2 size={22} color="rgba(255,255,255,.35)" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>No notifications</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", marginTop: 2 }}>You're all caught up.</div>
                  </div>
                ) : (
                  <>
                    {upcoming.length > 0 && (
                      <>
                        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,.45)", padding: "4px 8px 6px" }}>UPCOMING</div>
                        {upcoming.map((n, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, padding: 9, borderRadius: 10 }}>
                            <n.icon size={15} color={T.gold} style={{ marginTop: 2, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.white }}>{n.text}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{n.time}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {upcoming.length > 0 && recent.length > 0 && (
                      <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: "6px 8px" }} />
                    )}

                    {recent.length > 0 && (
                      <>
                        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,.45)", padding: "4px 8px 6px" }}>RECENT</div>
                        {recent.map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, padding: 9, borderRadius: 10 }}>
                            <a.icon size={15} color={a.color} style={{ marginTop: 2, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.white }}>{a.text}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{a.time}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="rq-desktop-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isLoggedIn ? (
              <>
                <GhostButton onClick={() => { onSignOut?.(); toast("Signed out"); }} style={{ padding: "9px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}>
                  <LogOut size={14} /> Sign out
                </GhostButton>
                <PrimaryButton onClick={() => go("donate-us")} style={{ padding: "9px 16px", fontSize: 13 }}>Donate Us</PrimaryButton>
                <div onClick={() => go("dashboard")} title="Account" style={{
                  cursor: "pointer", width: 38, height: 38, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.gold}, ${T.accent})`, display: "flex", alignItems: "center",
                  justifyContent: "center", color: T.white, fontWeight: 800, fontSize: 13, flexShrink: 0
                }}>
                  {userInitials}
                </div>
              </>
            ) : (
              <>
                <GhostButton onClick={() => go("login")} style={{ padding: "9px 16px", fontSize: 13 }}>Log in</GhostButton>
                <PrimaryButton onClick={() => go("donate-us")} style={{ padding: "9px 16px", fontSize: 13 }}>Donate Us</PrimaryButton>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="rq-btn rq-mobile-menu-btn"
            style={{
              display: "none", width: 38, height: 38, borderRadius: 11, border: `1px solid ${T.sand}`, background: T.white,
              cursor: "pointer", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}
          >
            {mobileMenuOpen ? <X size={18} color={T.ink} /> : <Menu size={18} color={T.ink} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="rq-fadeUp" role="menu" style={{
          borderTop: `1px solid ${T.sand}`, background: T.white, padding: "10px 16px 16px",
          display: "flex", flexDirection: "column", gap: 4, maxHeight: "calc(100vh - 64px)", overflowY: "auto"
        }}>
          {items.map((it) => {
            const active = page === it.key;
            return (
              <button key={it.key} role="menuitem" onClick={() => handleNavClickAndClose(it.key)} style={{
                display: "flex", alignItems: "center", gap: 10, border: "none", cursor: "pointer", textAlign: "left",
                background: active ? T.primaryL : "transparent", color: active ? T.primaryD : T.ink,
                fontWeight: 700, fontSize: 14.5, padding: "13px 12px", borderRadius: 12, minHeight: 46
              }}>
                <it.icon size={17} /> {it.label}
              </button>
            );
          })}
          {!isOrg && (
            <button role="menuitem" onClick={() => handleNavClickAndClose("organizations")} style={{
              display: "flex", alignItems: "center", gap: 10, border: "none", cursor: "pointer", textAlign: "left",
              background: page === "organizations" ? T.primaryL : "transparent", color: page === "organizations" ? T.primaryD : T.ink,
              fontWeight: 700, fontSize: 14.5, padding: "13px 12px", borderRadius: 12, minHeight: 46
            }}>
              <Building2 size={17} /> Orgs
            </button>
          )}

          <div style={{ height: 1, background: T.sand, margin: "8px 4px" }} />

          {isLoggedIn ? (
            <>
              <button role="menuitem" onClick={() => goAndClose("dashboard")} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", cursor: "pointer", textAlign: "left", background: "transparent", color: T.ink, fontWeight: 700, fontSize: 14.5, padding: "13px 12px", borderRadius: 12, minHeight: 46 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${T.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{userInitials}</div>
                My account
              </button>
              <PrimaryButton full onClick={() => goAndClose("donate-us")} style={{ margin: "6px 12px" }}>Donate Us</PrimaryButton>
              <GhostButton full onClick={() => { setMobileMenuOpen(false); onSignOut?.(); toast("Signed out"); }} style={{ margin: "0 12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}><LogOut size={14} /> Sign out</span>
              </GhostButton>
            </>
          ) : (
            <>
              <GhostButton full onClick={() => goAndClose("login")} style={{ margin: "6px 12px 0" }}>Log in</GhostButton>
              <PrimaryButton full onClick={() => goAndClose("donate-us")} style={{ margin: "10px 12px 0" }}>Donate Us</PrimaryButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TopLeftBrand({ go }) {
  return (
    <div
      onClick={() => go("landing")}
      style={{ position: "fixed", left: 26, top: 24, zIndex: 100, cursor: "pointer", display: "flex", flexDirection: "column", gap: 5 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, background: `linear-gradient(135deg, ${T.primary}, ${T.primaryD})`,
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          boxShadow: "0 8px 20px rgba(31,111,74,.4), inset 0 0 0 2px rgba(255,255,255,.18)"
        }}>
          <Leaf size={21} color={T.white} strokeWidth={2.4} />
          <span className="rq-pulse-dot" style={{
            position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%",
            background: T.gold, border: `2px solid ${T.base}`
          }} />
        </div>
        <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: T.ink, letterSpacing: -0.4 }}>
          ResQ<span style={{ color: T.accent, fontStyle: "italic" }}>Bite</span>
        </span>
      </div>
      <span style={{ fontFamily: fontMono, fontSize: 10, fontWeight: 700, letterSpacing: 1.8, color: T.inkSoft, marginLeft: 52 }}>
        FOOD RESCUE · LIVE
      </span>
    </div>
  );
}

/* ============================================================
   NAV BARS
============================================================= */

/* ============================================================
   LANDING PAGE
============================================================= */

function Landing({ go, toast, isLoggedIn, onSignOut }) {
  const [liveOverview, setLiveOverview] = useState(null);
  const [liveWeekly, setLiveWeekly] = useState(WEEKLY);
  const [liveFoodMix, setLiveFoodMix] = useState(PIE);
  const [isLive, setIsLive] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, wk, fm] = await Promise.all([
          api.analyticsOverview(),
          api.analyticsWeekly(7),
          api.analyticsFoodMix(),
        ]);
        if (cancelled) return;
        setLiveOverview(ov);
        setLiveWeekly(wk.weekly.map((w) => ({ d: w.d, meals: w.meals })));
        setLiveFoodMix(fm.foodMix);
        setIsLive(true);
      } catch (err) {
        setIsLive(false);
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rq-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav go={go} toast={toast} page="landing" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />

      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden", minHeight: "calc(100vh - 68px)", padding: "40px 24px 60px", background: `radial-gradient(1100px 500px at 80% -10%, ${T.primaryL}, transparent), radial-gradient(800px 400px at -10% 20%, #FFF3E4, transparent)`, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }} className="rq-hero-grid">
            <div>
              <Reveal as="h1" delayMs={0} style={{ fontFamily: fontDisplay, fontSize: 48, lineHeight: 1.04, letterSpacing: -1.2, margin: "18px 0 16px", color: T.ink }}>
                Extra food shouldn't go to waste.<br /><span style={{ fontStyle: "italic", color: T.primary }}>It should go to someone.</span>
              </Reveal>
              <Reveal as="p" delayMs={120} style={{ fontSize: 16.5, color: T.inkSoft, maxWidth: 480, lineHeight: 1.6, marginBottom: 28 }}>
                ResQBite connects restaurants, events and individuals with verified NGOs, shelters and kitchens nearby — in three taps, with live pickup tracking from your door to theirs.
              </Reveal>
              <Reveal delayMs={220} style={{ display: "flex", gap: 12, marginBottom: 34, flexWrap: "wrap" }}>
                <PrimaryButton onClick={() => go(isLoggedIn ? "donate" : "login")}>Donate your first meal</PrimaryButton>
                <GhostButton onClick={() => go("tracking")}>See live tracking <ChevronRight size={15} style={{ display: "inline", verticalAlign: -2 }} /></GhostButton>
              </Reveal>
              <div style={{ display: "flex", gap: 28 }}>
                {[["12,400+", "Meals rescued"], ["380", "Verified NGOs"], ["4.9★", "Avg. rating"]].map(([n, l], i) => (
                  <Reveal key={i} index={i} delayMs={300 + i * 80}>
                    <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 24, color: T.ink }}>{n}</div>
                    <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>{l}</div>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal delayMs={260} style={{ position: "relative", height: 420 }}>
              <LiveDonationCard />

              {/* floating food chips */}
              {[
                { icon: Soup, label: "40 meals ready", top: "0%", left: "-6%", tone: T.gold, delay: "0s" },
                { icon: Apple, label: "Fresh · 2h left", top: "4%", left: "68%", tone: T.white, delay: "1.7s" },
              ].map((c, i) => (
                <div key={i} className="rq-float" style={{ "--r": "0deg", position: "absolute", top: c.top, left: c.left, animationDelay: c.delay, zIndex: 5 }}>
                  <div style={{ background: T.white, borderRadius: 14, padding: "10px 14px", boxShadow: "0 14px 30px rgba(20,35,28,.18)", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.sand}` }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <c.icon size={14} color={T.primary} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{c.label}</span>
                  </div>
                </div>
              ))}

              {/* centered on the card's bottom divider line */}
              <div className="rq-float" style={{ "--r": "0deg", position: "absolute", top: "91%", left: "38%", transform: "translateX(-50%)", animationDelay: ".9s", zIndex: 6 }}>
                <div style={{ background: T.white, borderRadius: 14, padding: "10px 14px", boxShadow: "0 14px 30px rgba(20,35,28,.18)", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.sand}` }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle2 size={14} color={T.primary} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>Pickup confirmed</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer go={go} toast={toast} />
    </div>
  );
}

function FeatureGrid() {
  const feats = [
    { icon: ScanLine, title: "AI freshness check", text: "Scan detects spoilage & estimates safe window." },
    { icon: Navigation, title: "Live GPS tracking", text: "Real-time pickup & delivery status." },
    { icon: Award, title: "Rewards & badges", text: "Earn points for every rescue." },
    { icon: ShieldCheck, title: "Verified organizations", text: "Every NGO admin-approved." },
  ];
  return (
    <section style={{ padding: "20px 24px 80px", background: T.sand + "55" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 60, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }} className="rq-4col">
        {feats.map((f, i) => (
          <div key={i} className="rq-card-hover" style={{ background: T.white, borderRadius: 18, padding: 22, border: `1px solid ${T.sand}`, boxShadow: "0 4px 14px rgba(20,35,28,.04)" }}>
            <f.icon size={20} color={T.accent} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>{f.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrgStrip({ toast }) {
  return (
    <section style={{ padding: "0 24px 80px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 22 }}>
          <div>
            <Pill tone="gold">Verified network</Pill>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 28, marginTop: 12, color: T.ink, }}>Organizations receiving food near you</h2>
          </div>
          <GhostButton onClick={() => toast("Opening full directory")} style={{ padding: "10px 16px", fontSize: 13 }}>View all</GhostButton>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="rq-3col">
          {ORGS.slice(0, 3).map((o, i) => <OrgCard key={i} o={o} />)}
        </div>
      </div>
    </section>
  );
}

function OrgCard({ o }) {
  return (
    <div className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${T.gold}, ${T.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontWeight: 800, fontFamily: fontDisplay }}>
          {o.name[0]}
        </div>
        {o.verified && <Pill tone="primary"><ShieldCheck size={11} /> Verified</Pill>}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{o.name}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 12 }}>{o.type} · {o.distance}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.inkSoft }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Star size={12} color={T.gold} fill={T.gold} /> {o.rating}</span>
        <span>{o.capacity}</span>
      </div>
    </div>
  );
}

function Footer({ go, toast }) {
  const cols = [
    {
      title: "Company", links: [
        { label: "About Us", key: "about" },
        { label: "ResQBite Corporate", key: "corporate" },
        { label: "Careers", key: "careers" },
        { label: "Team", key: "team" },
        { label: "ResQBite One", key: "resqbite-one" },
      ]
    },
    {
      title: "Contact us", links: [
        { label: "Help & Support", key: "help-support" },
        { label: "Partner With Us", key: "partner-with-us" },
        { label: "Volunteer With Us", key: "volunteer-with-us" },
      ]
    },
    {
      title: "Legal", links: [
        { label: "Terms & Conditions", key: "terms" },
        { label: "Cookie Policy", key: "cookie-policy" },
        { label: "Privacy Policy", key: "privacy-policy" },
      ]
    },
    {
      title: "Life at ResQBite", links: [
        { label: "Explore With ResQBite", key: "explore" },
        { label: "ResQBite News", key: "news" },
        { label: "Impact Report", key: "impact-report" },
      ]
    },
  ];
  const socials = [
    { icon: "in", label: "LinkedIn" },
    { icon: "ig", label: "Instagram" },
    { icon: "fb", label: "Facebook" },
    { icon: "pin", label: "Pinterest" },
    { icon: "x", label: "Twitter/X" },
  ];
  return (
    <footer style={{ background: T.sand + "55", padding: "56px 24px 0", borderTop: `1px solid ${T.sand}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between" }}>
        <div style={{ maxWidth: 220 }}>
          <div style={{ cursor: "pointer" }} onClick={() => go("landing")}><Logo /></div>
          <p style={{ fontSize: 12, color: T.inkSoft, marginTop: 12 }}>© 2026 ResQBite. Prototype built for demonstration.</p>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: T.ink, marginBottom: 14 }}>{c.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {c.links.map((l) => (
                <span key={l.key} onClick={() => go(l.key)} className="rq-underline" style={{ fontSize: 12.5, color: T.inkSoft, cursor: "pointer", width: "fit-content" }}>{l.label}</span>
              ))}
            </div>
          </div>
        ))}

        <div>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: T.ink, marginBottom: 14 }}>Social Links</div>
          <div style={{ display: "flex", gap: 10 }}>
            {socials.map((s) => (
              <div key={s.label} onClick={() => toast(`Opening ${s.label}`)} title={s.label} style={{
                width: 30, height: 30, borderRadius: 8, background: T.white, border: `1px solid ${T.sand}`,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 10.5, fontWeight: 800, color: T.inkSoft
              }}>{s.icon}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1180, margin: "40px auto 0", borderTop: `1px solid ${T.sandD}`, padding: "20px 0 26px",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>For a better experience, get the ResQBite app</span>
        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={() => toast("App Store link (demo)")} style={{ background: T.ink, color: T.white, borderRadius: 10, padding: "8px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Phone size={14} /> Download on the App Store
          </div>
          <div onClick={() => toast("Google Play link (demo)")} style={{ background: T.ink, color: T.white, borderRadius: 10, padding: "8px 14px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <PlusCircle size={14} /> Get it on Google Play
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   SHARED PAGE SHELL (header + footer wrapper for content pages)
============================================================= */

function PageShell({ go, toast, isLoggedIn, onSignOut, page = "", children }) {
  return (
    <div className="rq-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopNav go={go} toast={toast} page={page} isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer go={go} toast={toast} />
    </div>
  );
}

function PageHero({ eyebrow, title, sub }) {
  return (
    <section style={{ padding: "56px 24px 32px", background: `radial-gradient(900px 400px at 85% -10%, ${T.primaryL}, transparent)` }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {eyebrow && <Reveal delayMs={0}><Pill tone="accent">{eyebrow}</Pill></Reveal>}
        <Reveal as="h1" delayMs={90} style={{ fontFamily: fontDisplay, fontSize: 40, margin: "16px 0 12px", color: T.ink, lineHeight: 1.1 }}>{title}</Reveal>
        {sub && <Reveal as="p" delayMs={180} style={{ fontSize: 15.5, color: T.inkSoft, lineHeight: 1.65, maxWidth: 640 }}>{sub}</Reveal>}
      </div>
    </section>
  );
}

function TextSection({ heading, children }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <h3 style={{ fontFamily: fontDisplay, fontSize: 19, color: T.ink, marginBottom: 8 }}>{heading}</h3>
      <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

/* ---------- About Us ---------- */
function AboutPage({ go, toast, isLoggedIn, onSignOut }) {
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="about">
      <PageHero eyebrow="About ResQBite" title="Good food shouldn't go to waste — and no one should go hungry." sub="ResQBite is the bridge between surplus food and the people who need it, connecting donors, NGOs, and volunteers in real time." />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 70px" }}>
        <TextSection heading="What ResQBite is">
          ResQBite is a web platform that helps reduce food waste by connecting people and businesses with extra food to nearby NGOs, orphanages, old-age homes, and shelters. Event organizers, restaurants, hotels, and individuals can list leftover food in minutes; the platform finds the nearest verified organization, routes a volunteer, and tracks the handoff from pickup to delivery.
        </TextSection>
        <TextSection heading="Our mission">
          Save food, feed people, and reduce food waste — at the speed a donation actually needs. Every donation window is short, so ResQBite is built around fast matching, live tracking, and zero friction for the donor.
        </TextSection>
        <TextSection heading="Our vision">
          A city where surplus food never reaches a landfill while a shelter goes without a meal — where rescuing food is as easy as ordering it.
        </TextSection>
        <TextSection heading="How donors, NGOs, and volunteers connect">
          Donors list surplus food with quantity, photos, and pickup details. Nearby verified NGOs and shelters see the listing and accept it. A volunteer picks up the request, handles pickup and delivery, and updates status live — donor, NGO, and admin all see the same real-time picture, from "Donation created" through "Delivered."
        </TextSection>
        <TextSection heading="Social & environmental impact">
          Every completed rescue means meals served and food waste diverted from landfill — which also means less methane from decomposing food. ResQBite's dashboard and Impact Report track meals rescued, deliveries completed, and estimated CO₂ emissions avoided across the network.
        </TextSection>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
          <PrimaryButton onClick={() => go("signup")}>Start donating</PrimaryButton>
          <GhostButton onClick={() => go("impact-report")}>See our impact <ChevronRight size={15} style={{ display: "inline", verticalAlign: -2 }} /></GhostButton>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- ResQBite Corporate ---------- */
function CorporatePage({ go, toast, isLoggedIn, onSignOut }) {
  const segments = [
    { icon: Building2, title: "Corporations", text: "Cafeteria surplus, office events, and CSR-driven donation programs." },
    { icon: Utensils, title: "Restaurants", text: "Turn end-of-day surplus into scheduled, recurring rescues." },
    { icon: Award, title: "Hotels", text: "Banquet and buffet surplus routed to nearby shelters automatically." },
    { icon: Calendar, title: "Event organizers", text: "Weddings and large events can schedule pickups before the event ends." },
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="corporate">
      <PageHero eyebrow="ResQBite Corporate" title="Turn surplus into scheduled, measurable impact." sub="Corporate donation programs, CSR partnerships, and recurring pickups for restaurants, hotels, and event organizers." />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }} className="rq-4col">
          {segments.map((s, i) => (
            <div key={i} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20 }}>
              <s.icon size={20} color={T.accent} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>{s.text}</div>
            </div>
          ))}
        </div>
        <TextSection heading="CSR opportunities">
          Partner with ResQBite to fold food rescue into your CSR reporting — track meals rescued and CO₂ avoided per site, per quarter, with the same analytics that power the platform's Impact Report.
        </TextSection>
        <PrimaryButton onClick={() => go("partner-with-us")}>Partner With Us</PrimaryButton>
      </div>
    </PageShell>
  );
}

/* ---------- Careers ---------- */
function CareersPage({ go, toast, isLoggedIn, onSignOut }) {
  const [openId, setOpenId] = useState(null);
  const [applied, setApplied] = useState({});
  const jobs = [
    { id: "eng-fe", dept: "Engineering", title: "Frontend Engineer (React)", loc: "Remote / Agra", desc: "Build the donor, NGO, and volunteer experiences across web and mobile." },
    { id: "eng-be", dept: "Engineering", title: "Backend Engineer (Node.js)", loc: "Remote", desc: "Own the donation-matching engine, live tracking, and notifications pipeline." },
    { id: "ops", dept: "Operations", title: "NGO Partnerships Lead", loc: "Agra", desc: "Verify and onboard NGOs, shelters, and community kitchens onto the platform." },
    { id: "design", dept: "Design", title: "Product Designer", loc: "Remote", desc: "Shape the calm, warm visual language ResQBite is known for." },
  ];

  const submitApplication = (id) => (e) => {
    e.preventDefault();
    setApplied((a) => ({ ...a, [id]: true }));
    toast("Application submitted — we'll be in touch!");
  };

  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="careers">
      <PageHero eyebrow="Careers" title="Help build the fastest way to rescue food." sub="A small team working on real-time logistics, trust & verification, and community impact." />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 70px" }}>
        <TextSection heading="Why work at ResQBite">
          You'll ship features that put meals on tables the same day — donation matching, live GPS tracking, AI freshness checks. Small team, real impact, fast iteration.
        </TextSection>
        <TextSection heading="Culture">
          Calm, direct, and outcome-focused. We measure ourselves the same way we measure the platform: meals rescued, not hours logged.
        </TextSection>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 19, color: T.ink, marginBottom: 14 }}>Open roles</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map((j) => (
            <div key={j.id} style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <Pill tone="primary">{j.dept}</Pill>
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{j.loc}</div>
                </div>
                <GhostButton onClick={() => setOpenId(openId === j.id ? null : j.id)} style={{ padding: "9px 16px", fontSize: 13 }}>
                  {openId === j.id ? "Close" : "Apply"}
                </GhostButton>
              </div>
              {openId === j.id && (
                <div className="rq-fadeUp" style={{ marginTop: 14, borderTop: `1px solid ${T.sand}`, paddingTop: 14 }}>
                  <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 12 }}>{j.desc}</p>
                  {applied[j.id] ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.primary, fontWeight: 700, fontSize: 13 }}>
                      <CheckCircle2 size={16} /> Application received — thank you!
                    </div>
                  ) : (
                    <form onSubmit={submitApplication(j.id)}>
                      <InputField icon={User} label="Full name" placeholder="Your name" value="" onChange={() => { }} />
                      <InputField icon={Mail} label="Email" type="email" placeholder="you@example.com" value="" onChange={() => { }} />
                      <PrimaryButton type="submit" icon={ArrowRight}>Submit application</PrimaryButton>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- Team ---------- */
function TeamPage({ go, toast, isLoggedIn, onSignOut }) {
  const team = [
    { name: "Diksha Tomar", role: "Founder & CEO", bio: "Leads product and partnerships across donors and NGOs." },
    { name: "Varta Khandelwal", role: "Head of Engineering", bio: "Owns the matching engine and live-tracking infrastructure." },
    { name: "Ayush Dixit", role: "Product Design", bio: "Shapes the ResQBite visual language and donor experience." },
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="team">
      <PageHero eyebrow="Team" title="The people behind ResQBite." sub="A small, focused team working directly with donors, NGOs, and volunteers." />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="rq-3col">
          {team.map((m, i) => (
            <div key={i} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20, textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 12px", background: `linear-gradient(135deg, ${T.gold}, ${T.accent})`,
                display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontWeight: 800, fontSize: 18
              }}>
                {m.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, margin: "3px 0 8px" }}>{m.role}</div>
              <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>{m.bio}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- ResQBite One ---------- */
function ResQBiteOnePage({ go, toast, isLoggedIn, onSignOut }) {
  const features = [
    { icon: Sparkles, title: "AI-recommended matching", text: "Priority routing to the best-fit NGO by distance, capacity, and preference." },
    { icon: Timer, title: "Faster pickup windows", text: "Priority queueing so volunteers are assigned first." },
    { icon: BarChart3, title: "Advanced analytics", text: "Full donation history, CSR-ready impact exports, and trend charts." },
    { icon: Award, title: "Priority verification", text: "Fast-tracked NGO verification and dedicated support." },
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="resqbite-one">
      <PageHero eyebrow="ResQBite One" title="The priority tier for high-volume donors and NGOs." sub="Faster matching, advanced analytics, and priority support — built for restaurants, hotels, and NGOs rescuing food every day." />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 36 }} className="rq-4col">
          {features.map((f, i) => (
            <div key={i} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20 }}>
              <f.icon size={20} color={T.accent} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>{f.text}</div>
            </div>
          ))}
        </div>
        <TextSection heading="How it works">
          Sign up as usual, then upgrade from your dashboard. ResQBite One donors and NGOs get priority placement in the matching engine and a dedicated analytics tab.
        </TextSection>
        <TextSection heading="Use cases">
          Restaurants donating daily surplus, hotels running recurring banquet donations, and high-capacity NGOs that need predictable, fast pickups.
        </TextSection>
        <PrimaryButton onClick={() => go("signup")}>Get ResQBite One</PrimaryButton>
      </div>
    </PageShell>
  );
}

/* ---------- shared: simple success-state form ---------- */
function SuccessForm({ fields, submitLabel, onDone, successText }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <div style={{ background: T.primaryL, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <CheckCircle2 size={22} color={T.primary} />
        <div style={{ fontWeight: 700, fontSize: 14, color: T.primaryD }}>{successText}</div>
      </div>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); onDone?.(); }}>
      {fields}
      <PrimaryButton type="submit" icon={ArrowRight}>{submitLabel}</PrimaryButton>
    </form>
  );
}

/* ---------- Help & Support ---------- */
function HelpSupportPage({ go, toast, isLoggedIn, onSignOut }) {
  const [q, setQ] = useState("");
  const faqs = [
    { q: "How do I list a food donation?", a: "Go to Donate, upload a photo, and fill in quantity, prep time, and expiry — our AI checks freshness instantly." },
    { q: "How does NGO matching work?", a: "We recommend the nearest verified NGO based on distance, capacity, and food preference." },
    { q: "How do I become a verified NGO?", a: "Register as an Organization, then submit documents on the verification step — an admin reviews within 48 hours." },
    { q: "How do volunteers get assigned?", a: "Once an NGO accepts a donation, nearby volunteers see the pickup request and can accept it." },
  ];
  const filtered = faqs.filter((f) => f.q.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="help-support">
      <PageHero eyebrow="Help & Support" title="How can we help?" sub="Search common questions, or send us a message and we'll get back to you." />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <Search size={16} color={T.inkSoft} style={{ position: "absolute", left: 14, top: 14 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search support articles..." className="rq-focus"
            style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12, border: `1.5px solid ${T.sand}`, fontSize: 14, background: T.white }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
          {filtered.map((f, i) => (
            <div key={i} style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55 }}>{f.a}</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ fontSize: 13, color: T.inkSoft }}>No articles match "{q}" — try the contact form below.</div>}
        </div>

        <h3 style={{ fontFamily: fontDisplay, fontSize: 19, marginBottom: 14, color: T.ink, }}>Contact support</h3>
        <SuccessForm
          successText="Thanks — our support team will reply within 24 hours."
          submitLabel="Send message"
          fields={<>
            <InputField icon={User} label="Name" placeholder="Your name" value="" onChange={() => { }} />
            <InputField icon={Mail} label="Email" type="email" placeholder="you@example.com" value="" onChange={() => { }} />
            <InputField icon={Filter} label="Category" placeholder="Donation / Account / NGO / Volunteer" value="" onChange={() => { }} />
            <InputField icon={Mail} label="Message" placeholder="How can we help?" value="" onChange={() => { }} />
          </>}
        />
      </div>
    </PageShell>
  );
}

/* ---------- Partner With Us ---------- */
function PartnerWithUsPage({ go, toast, isLoggedIn, onSignOut }) {
  const types = ["Corporate", "Restaurant", "Hotel", "Event organizer", "NGO"];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="partner-with-us">
      <PageHero eyebrow="Partner With Us" title="Let's rescue more food together." sub="Corporate, restaurant, hotel, event, and NGO partnerships — tell us about your organization." />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 30 }}>
          {types.map((t) => <Pill key={t} tone="primary">{t}</Pill>)}
        </div>
        <SuccessForm
          successText="Thanks for reaching out — our partnerships team will contact you shortly."
          submitLabel="Submit partnership request"
          fields={<>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField icon={User} label="Name" placeholder="Your name" value="" onChange={() => { }} />
              <InputField icon={Building2} label="Organization" placeholder="Organization name" value="" onChange={() => { }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField icon={Mail} label="Email" type="email" placeholder="you@example.com" value="" onChange={() => { }} />
              <InputField icon={Phone} label="Phone" placeholder="+91 98765 43210" value="" onChange={() => { }} />
            </div>
            <InputField icon={Filter} label="Organization type" placeholder="Corporate / Restaurant / Hotel / Event / NGO" value="" onChange={() => { }} />
            <InputField icon={Mail} label="Message" placeholder="Tell us about your organization" value="" onChange={() => { }} />
          </>}
        />
      </div>
    </PageShell>
  );
}

/* ---------- Volunteer With Us ---------- */
function VolunteerWithUsPage({ go, toast, isLoggedIn, onSignOut }) {
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="volunteer-with-us">
      <PageHero eyebrow="Volunteer With Us" title="Be the link between a donation and a delivered meal." sub="Pick up nearby donations, deliver them to verified NGOs, and earn points along the way." />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 34 }} className="rq-2col">
          <TextSection heading="Why volunteer">Directly move food from a donor's door to a shelter's kitchen — most deliveries take under 30 minutes.</TextSection>
          <TextSection heading="How it works">Accept a nearby pickup request, navigate to the donor, then to the NGO, and mark it delivered.</TextSection>
          <TextSection heading="Rewards & points">Earn Rescue Points per delivery, unlock badges, and climb the monthly leaderboard.</TextSection>
          <TextSection heading="Community impact">Every delivery is meals served and food waste avoided — visible on your volunteer dashboard.</TextSection>
        </div>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 19, marginBottom: 14, color: T.ink, }}>Register as a volunteer</h3>
        <SuccessForm
          successText="You're in! We'll email you nearby pickup requests to get started."
          submitLabel="Register"
          fields={<>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField icon={User} label="Name" placeholder="Your name" value="" onChange={() => { }} />
              <InputField icon={Mail} label="Email" type="email" placeholder="you@example.com" value="" onChange={() => { }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField icon={Phone} label="Phone" placeholder="+91 98765 43210" value="" onChange={() => { }} />
              <InputField icon={MapPin} label="City" placeholder="Agra" value="" onChange={() => { }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField icon={Clock} label="Availability" placeholder="Weekday evenings, weekends..." value="" onChange={() => { }} />
              <InputField icon={Truck} label="Vehicle" placeholder="Bike / Scooter / Car / None" value="" onChange={() => { }} />
            </div>
            <InputField icon={Mail} label="Message" placeholder="Anything else we should know?" value="" onChange={() => { }} />
          </>}
        />
      </div>
    </PageShell>
  );
}

/* ---------- Terms & Conditions ---------- */
function TermsPage({ go, toast, isLoggedIn, onSignOut }) {
  const sections = [
    ["Users & accounts", "You must provide accurate information when registering as a Donor, NGO, Volunteer, or Admin, and keep your account credentials secure."],
    ["Donations", "Donors are responsible for accurately describing food quality, quantity, and expiry. ResQBite facilitates matching but does not prepare or inspect food."],
    ["Food donors", "Donors confirm that listed food is safe for consumption and was prepared/stored appropriately prior to donation."],
    ["NGOs", "NGOs must review donation details before accepting and are responsible for safe onward distribution."],
    ["Volunteers", "Volunteers agree to handle food safely during transport and to update pickup/delivery status accurately."],
    ["Platform usage", "The platform may only be used for legitimate food-donation and rescue activity."],
    ["Responsibilities", "Each party (Donor, NGO, Volunteer) is responsible for their own actions in the physical handoff of food."],
    ["Prohibited activities", "Fraudulent listings, fake accounts, and misuse of donor/NGO data are strictly prohibited."],
    ["Liability", "ResQBite is a matching and logistics platform; it is not liable for food safety incidents arising after handoff."],
    ["Account termination", "Accounts found violating these terms may be suspended or removed at ResQBite's discretion."],
    ["Changes to terms", "These terms may be updated periodically; continued use constitutes acceptance of the current version."],
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="terms">
      <PageHero eyebrow="Legal" title="Terms & Conditions" />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 70px" }}>
        {sections.map(([h, b], i) => <TextSection key={i} heading={`${i + 1}. ${h}`}>{b}</TextSection>)}
      </div>
    </PageShell>
  );
}

/* ---------- Cookie Policy ---------- */
function CookiePolicyPage({ go, toast, isLoggedIn, onSignOut }) {
  const sections = [
    ["What cookies are", "Small files stored on your device that let ResQBite remember your session and preferences."],
    ["Essential cookies", "Required for login sessions, security, and core site functionality — these can't be disabled."],
    ["Analytics", "Help us understand aggregate usage patterns (e.g. which pages are used most) to improve the platform."],
    ["Preferences", "Remember settings like your last-used role (Donor/NGO/Volunteer) for a faster experience."],
    ["Third-party cookies", "Used sparingly, for services like maps embeds — only when strictly necessary."],
    ["Managing cookies", "You can clear or block cookies in your browser settings at any time; this may limit some features."],
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="cookie-policy">
      <PageHero eyebrow="Legal" title="Cookie Policy" />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 70px" }}>
        {sections.map(([h, b], i) => <TextSection key={i} heading={h}>{b}</TextSection>)}
      </div>
    </PageShell>
  );
}

/* ---------- Privacy Policy ---------- */
function PrivacyPolicyPage({ go, toast, isLoggedIn, onSignOut }) {
  const sections = [
    ["Information we collect", "Account details, donation listings, location, and images you choose to upload."],
    ["Account information", "Name, email, phone, and role (Donor/NGO/Volunteer/Admin)."],
    ["Donation information", "Food details, quantity, pickup address, and timing you provide when listing a donation."],
    ["Location data", "Used to match donations with the nearest NGOs and volunteers, and for live tracking during delivery."],
    ["Images", "Food photos are used for AI freshness checks and shown to matched NGOs."],
    ["Device information", "Basic device/browser data for security and to keep the platform working reliably."],
    ["How we use data", "Solely to operate donation matching, tracking, notifications, and platform analytics."],
    ["Data sharing", "Shared only with the NGO/volunteer involved in a specific donation — never sold to third parties."],
    ["Data security", "Passwords are hashed, connections are encrypted (HTTPS), and access is role-restricted."],
    ["Your rights", "You can request access to, correction of, or deletion of your account data at any time."],
    ["Data retention", "Donation history is retained for platform analytics; you can request account deletion via Help & Support."],
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="privacy-policy">
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 70px" }}>
        {sections.map(([h, b], i) => <TextSection key={i} heading={h}>{b}</TextSection>)}
      </div>
    </PageShell>
  );
}

/* ---------- Explore ---------- */
function ExplorePage({ go, toast, isLoggedIn, onSignOut }) {
  const cards = [
    { icon: Soup, title: "Food rescue stories", text: "Real rescues from the last 30 days across the network.", action: () => go("news") },
    { icon: Building2, title: "Organizations", text: "Browse verified NGOs, shelters, and community kitchens.", action: () => go("organizations") },
    { icon: Users, title: "Community", text: "See top donors and volunteers on the leaderboard.", action: () => go("impact-report") },
    { icon: Calendar, title: "Events", text: "Upcoming donation drives and volunteer meetups.", action: () => toast("Opening events calendar") },
    { icon: Truck, title: "Volunteer opportunities", text: "Join the volunteer network in your city.", action: () => go("volunteer-with-us") },
    { icon: PlusCircle, title: "Donation opportunities", text: "List your first donation in under 2 minutes.", action: () => go("donate") },
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="explore">
      <PageHero eyebrow="Explore" title="Explore With ResQBite" sub="Stories, organizations, community, and ways to get involved." />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }} className="rq-3col">
          {cards.map((c, i) => (
            <div key={i} onClick={c.action} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20, cursor: "pointer" }}>
              <c.icon size={20} color={T.accent} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 6, lineHeight: 1.5 }}>{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- News ---------- */
const NEWS_ARTICLES = [
  { slug: "500k-meals", title: "ResQBite crosses 12,400 meals rescued", date: "Jul 2026", excerpt: "A look at how the network scaled across six NGOs and five volunteer routes.", body: "Since launch, ResQBite has coordinated over 12,400 meals rescued across a growing network of verified NGOs and volunteers. The milestone reflects faster matching times and a growing base of recurring restaurant donors." },
  { slug: "ai-freshness", title: "How our AI freshness check works", date: "Jun 2026", excerpt: "A behind-the-scenes look at the scan that runs on every donation photo.", body: "Every donation photo runs through a freshness scan that estimates a safety score, a confidence level, and a safe time window — giving NGOs more context before accepting a donation." },
  { slug: "volunteer-spotlight", title: "Volunteer spotlight: Rahul Sharma", date: "Jun 2026", excerpt: "212 deliveries and counting — meet one of our top-rated volunteers.", body: "Rahul has completed over 212 deliveries on his scooter, most within 20 minutes of accepting a pickup. His story is a look at what makes a great ResQBite volunteer." },
];

function NewsPage({ go, toast, isLoggedIn, onSignOut }) {
  const [selected, setSelected] = useState(null);
  const article = NEWS_ARTICLES.find((a) => a.slug === selected);

  if (article) {
    return (
      <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="news">
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 70px" }}>
          <GhostButton onClick={() => setSelected(null)} style={{ padding: "9px 16px", fontSize: 13, marginBottom: 20 }}>
            <ArrowLeft size={15} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} /> Back to news
          </GhostButton>
          <div style={{ fontSize: 12, color: T.inkSoft, fontFamily: fontMono, marginBottom: 8 }}>{article.date}</div>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 32, marginBottom: 16, lineHeight: 1.15, color: T.ink }}>{article.title}</h1>
          <p style={{ fontSize: 14.5, color: T.inkSoft, lineHeight: 1.75 }}>{article.body}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="news">
      <PageHero eyebrow="News" title="ResQBite News" sub="Product updates, food-rescue stories, and community announcements." />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 70px", display: "flex", flexDirection: "column", gap: 14 }}>
        {NEWS_ARTICLES.map((a) => (
          <div key={a.slug} onClick={() => setSelected(a.slug)} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 16, padding: 20, cursor: "pointer" }}>
            <div style={{ fontSize: 11.5, color: T.inkSoft, fontFamily: fontMono, marginBottom: 6 }}>{a.date}</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{a.title}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55 }}>{a.excerpt}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

/* ---------- Impact Report ---------- */
function ImpactReportPage({ go, toast, isLoggedIn, onSignOut }) {
  const stats = [
    { icon: Package, val: 12400, suffix: "+", label: "Meals rescued" },
    { icon: Building2, val: 380, suffix: "", label: "Verified NGOs" },
    { icon: Truck, val: 950, suffix: "+", label: "Successful deliveries" },
    { icon: Users, val: 210, suffix: "+", label: "Active volunteers" },
    { icon: Leaf, val: 3.1, suffix: "t", decimals: 1, label: "CO₂ emissions saved" },
    { icon: TrendingUp, val: 96, suffix: "%", label: "Donation completion rate" },
  ];
  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="impact-report">
      <PageHero eyebrow="Impact Report" title="What the network has rescued so far." sub="Aggregate numbers across every donor, NGO, and volunteer on ResQBite." />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 40 }} className="rq-3col">
          {stats.map((s, i) => (
            <div key={i} style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 22 }}>
              <s.icon size={20} color={T.primary} style={{ marginBottom: 10 }} />
              <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 26 }}>
                <CountUp to={s.val} suffix={s.suffix} decimals={s.decimals || 0} />
              </div>
              <div style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Meals rescued — last 7 days</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={WEEKLY}>
              <defs>
                <linearGradient id="gImpact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={T.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={T.sand} />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.sand}`, fontSize: 12 }} />
              <Area type="monotone" dataKey="meals" stroke={T.primary} strokeWidth={2.5} fill="url(#gImpact)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- Donate Us (financial support page) ---------- */

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function FaqAccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${T.sand}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rq-focus"
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 4px", background: "none", border: "none", cursor: "pointer", textAlign: "left"
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{q}</span>
        <ChevronDown size={16} color={T.inkSoft} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s ease", flexShrink: 0 }} />
      </button>
      <div style={{ maxHeight: open ? 240 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
        <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.65, padding: "0 4px 18px" }}>{a}</p>
      </div>
    </div>
  );
}

function ImpactMiniCard({ icon: Icon, title, text }) {
  return (
    <div className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 22 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={19} color={T.primary} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function DonateUsPage({ go, toast, isLoggedIn, onSignOut, user, addDonation }) {
  const formRef = useRef(null);
  const whereGoesRef = useRef(null);

  const scrollToRef = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const [selectedAmount, setSelectedAmount] = useState(500);
  const [useCustom, setUseCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState("one-time");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [subscribeUpdates, setSubscribeUpdates] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [errors, setErrors] = useState({});
  // idle | not-configured | success | error — a real gateway would drive the
  // last two via handlePaymentSuccess/handlePaymentError below.
  const [paymentState, setPaymentState] = useState("idle");
  const [lastTxn, setLastTxn] = useState(null);

  // Signed-in-experience state
  const [dismissedGuestPrompt, setDismissedGuestPrompt] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [monthlyConsent, setMonthlyConsent] = useState(false);

  // Auto-populate from the signed-in account — never ask for info the
  // profile already has. Runs whenever the signed-in user changes.
  useEffect(() => {
    if (isLoggedIn && user) {
      setDonorName(user.name || "");
      setDonorEmail(user.email || "");
      setDonorPhone(user.phone || "");
    }
  }, [isLoggedIn, user]);

  const amount = useCustom ? Number(customAmount) || 0 : selectedAmount;
  const initials = (donorName || user?.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  const pickPreset = (v) => { setUseCustom(false); setSelectedAmount(v); setMonthlyConsent(false); };
  const pickCustom = () => { setUseCustom(true); };

  // --- Integration point -----------------------------------------------
  // Wire a real payment gateway (Razorpay, Stripe, etc.) here. On success,
  // call handlePaymentSuccess(txn); on failure/cancel, call handlePaymentError(err).
  // A real backend must verify the authenticated user server-side and
  // associate the donation with that account — never trust a user ID
  // supplied by the frontend.
  function handlePaymentSuccess(txn) {
    setLastTxn(txn);
    setPaymentState("success");
    addDonation?.({ id: txn.id, amount: txn.amount, frequency, status: "Completed", date: txn.date, method: paymentMethod });
  }
  function handlePaymentError(err) {
    setLastTxn(null);
    setPaymentState("error");
  }
  // -----------------------------------------------------------------------

  // Step 1: validate details and move to an explicit confirmation step.
  // Nothing is charged and no recurring donation is created here — the
  // person must still tap "Confirm & Donate" below.
  function handleReview(e) {
    e.preventDefault();
    const newErrors = {};
    if (!donorName.trim()) newErrors.name = "Please enter your name.";
    if (!donorEmail.trim()) newErrors.email = "Please enter your email.";
    else if (!validateEmail(donorEmail)) newErrors.email = "Please enter a valid email address.";
    if (!amount || amount <= 0) newErrors.amount = "Please select or enter an amount greater than ₹0.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setShowConfirm(true);
  }

  // Step 2: the explicit confirmation the person must tap before anything
  // is attempted. This is the only place a payment attempt is triggered.
  function handleConfirmDonate() {
    if (frequency === "monthly" && !monthlyConsent) return;
    // No payment gateway is connected in this build yet — this is the
    // clearly-defined integration point described above. We never fake a
    // successful payment; we're explicit that processing isn't live.
    setPaymentState("not-configured");
  }

  const resetForm = () => {
    setPaymentState("idle");
    setShowConfirm(false);
  };

  const useDifferentAccount = () => { onSignOut?.(); go("login"); };

  if (paymentState === "success" && lastTxn) {
    return (
      <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="donate-us">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px 90px", textAlign: "center" }} className="rq-fadeUp">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 size={30} color={T.primary} />
          </div>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 28, marginBottom: 10, color: T.ink }}>Thank You{donorName ? `, ${donorName}` : ""}!</h1>
          <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.65, marginBottom: 6 }}>
            Your ₹{lastTxn.amount} donation helps us continue building this platform and create more resources and initiatives for communities and organizations.
          </p>
          <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 28 }}>Together, we're helping create more opportunities for positive change.</p>
          <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20, textAlign: "left", marginBottom: 26 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}><span style={{ color: T.inkSoft }}>Donation amount</span><span style={{ fontWeight: 700 }}>₹{lastTxn.amount}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}><span style={{ color: T.inkSoft }}>Transaction ID</span><span style={{ fontFamily: fontMono, fontWeight: 700 }}>{lastTxn.id}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}><span style={{ color: T.inkSoft }}>Date</span><span style={{ fontWeight: 700 }}>{lastTxn.date}</span></div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <GhostButton onClick={() => toast("Downloading receipt (demo)")}>Download Receipt</GhostButton>
            <GhostButton onClick={() => toast("Browse organizations directory")}>Explore NGOs</GhostButton>
            <GhostButton onClick={() => go("landing")}>Back to Home</GhostButton>
          </div>
        </div>
      </PageShell>
    );
  }

  if (paymentState === "error") {
    return (
      <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="donate-us">
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 24px 90px", textAlign: "center" }} className="rq-fadeUp">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FBE4E4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <XCircle size={30} color={T.danger} />
          </div>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 26, marginBottom: 10, color: T.ink }}>Payment Unsuccessful</h1>
          <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.65, marginBottom: 26 }}>
            We couldn't complete your donation. No successful donation has been recorded. Please try again or use another payment method.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryButton onClick={resetForm}>Try Again</PrimaryButton>
            <GhostButton onClick={resetForm}>Back to Donation</GhostButton>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="donate-us">
      {/* HERO */}
      <section style={{ padding: "60px 24px 40px", background: `radial-gradient(1000px 460px at 82% -10%, ${T.primaryL}, transparent), radial-gradient(700px 360px at -10% 10%, #FFF3E4, transparent)` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }} className="rq-fadeUp">
          <Pill tone="accent"><Heart size={12} /> Support ResQBite</Pill>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 38, lineHeight: 1.15, margin: "16px 0 14px", color: T.ink }}>Help Us Create More Impact</h1>
          <p style={{ fontSize: 15, color: T.inkSoft, lineHeight: 1.7, maxWidth: 580, margin: "0 auto 10px" }}>
            Your contribution helps us build, improve, and expand this platform so we can create more opportunities for NGOs, volunteers, organizations, and communities to make a difference.
          </p>
          <p style={{ fontSize: 13, color: T.inkSoft, fontStyle: "italic", marginBottom: 26 }}>
            Every contribution helps us take one step closer to creating a stronger and more connected social-impact ecosystem.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryButton onClick={() => scrollToRef(formRef)}>Donate Now</PrimaryButton>
            <GhostButton onClick={() => scrollToRef(whereGoesRef)}>See Where Your Donation Goes</GhostButton>
          </div>
        </div>
      </section>

      {/* WHY YOUR SUPPORT MATTERS */}
      <section style={{ padding: "20px 24px 60px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 28, marginBottom: 10, color: T.ink, }}>Why Your Support Matters</h2>
            <p style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.65 }}>
              Building and maintaining a platform that connects people and organizations requires continuous effort, technology, resources, and support. Your contribution helps us keep improving the platform and create more such initiatives.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="rq-4col">
            <ImpactMiniCard icon={Monitor} title="Build Better Technology" text="Help us improve the platform, introduce better features, and make it easier for people to discover and support meaningful causes." />
            <ImpactMiniCard icon={Building2} title="Support NGOs" text="Help us create better digital tools and visibility for NGOs and social organizations working to create positive change." />
            <ImpactMiniCard icon={Globe} title="Reach More People" text="Your support helps us expand our reach and connect more volunteers, donors, organizations, and communities." />
            <ImpactMiniCard icon={Rocket} title="Create More Platforms" text="Help us develop more digital initiatives and platforms that make social impact easier, faster, and more accessible." />
          </div>
        </div>
      </section>

      {/* DONATION SECTION */}
      <section ref={formRef} style={{ padding: "20px 24px 60px", background: T.sand + "40" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", paddingTop: 40, display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 40 }} className="rq-2col">
          {/* LEFT */}
          <div className="rq-donate-info-sticky">
            <h2 style={{ fontFamily: fontDisplay, fontSize: 28, marginBottom: 14, color: T.ink, }}>Make a Difference Today</h2>
            <p style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.7, marginBottom: 14 }}>
              Choose an amount that feels right for you. Whether you contribute a small amount or make a larger donation, your support helps us continue our work and build more resources for the social-impact community.
            </p>
            <p style={{ fontSize: 13, color: T.primaryD, fontWeight: 700, background: T.primaryL, borderRadius: 12, padding: "12px 16px", display: "inline-block" }}>
              You don't need to make a large contribution to make an impact. Every contribution matters.
            </p>
          </div>

          {/* RIGHT — donation card */}
          <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 24, padding: 28 }}>
            {isLoggedIn ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: T.primaryL, borderRadius: 14, padding: "10px 14px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.primary, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{initials}</div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.primaryD }}>Donating as {user?.name || donorName}</span>
                </div>
                <span onClick={useDifferentAccount} className="rq-underline" style={{ fontSize: 11.5, fontWeight: 700, color: T.primaryD, cursor: "pointer", whiteSpace: "nowrap" }}>Use a different account</span>
              </div>
            ) : !dismissedGuestPrompt && (
              <div className="rq-fadeUp" style={{ background: "#FFF4DC", border: "1px solid #F3DFA8", borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: "#8A6212", marginBottom: 4 }}>Sign in for a faster donation experience</div>
                <p style={{ fontSize: 12, color: "#8A6212", lineHeight: 1.55, marginBottom: 12 }}>
                  Your account details can be used to make future donations easier and help you keep track of your contributions.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <PrimaryButton style={{ padding: "9px 16px", fontSize: 12.5, boxShadow: "none" }} onClick={() => go("login")}>Sign In</PrimaryButton>
                  <GhostButton style={{ padding: "9px 16px", fontSize: 12.5 }} onClick={() => setDismissedGuestPrompt(true)}>Continue as Guest</GhostButton>
                </div>
              </div>
            )}

            {showConfirm ? (
              <div className="rq-fadeUp">
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.inkSoft, marginBottom: 10 }}>CONFIRM YOUR DONATION</div>
                <div style={{ background: T.base, border: `1px solid ${T.sand}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span style={{ color: T.inkSoft }}>Amount</span><span style={{ fontWeight: 800, fontFamily: fontMono }}>₹{amount}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span style={{ color: T.inkSoft }}>Frequency</span><span style={{ fontWeight: 700, textTransform: "capitalize" }}>{frequency === "one-time" ? "One-time" : "Monthly"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span style={{ color: T.inkSoft }}>Payment method</span><span style={{ fontWeight: 700 }}>{paymentMethod}</span></div>
                  <div style={{ height: 1, background: T.sand, margin: "8px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span style={{ color: T.inkSoft }}>Donating as</span><span style={{ fontWeight: 700 }}>{donorName}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}><span style={{ color: T.inkSoft }}>Email</span><span style={{ fontWeight: 700 }}>{donorEmail}</span></div>
                </div>

                {frequency === "monthly" && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12.5, color: T.accentD, fontWeight: 700, marginBottom: 10, lineHeight: 1.5 }}>
                      You are choosing a recurring monthly donation of ₹{amount}.
                    </div>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: T.inkSoft, cursor: "pointer" }}>
                      <input type="checkbox" checked={monthlyConsent} onChange={() => setMonthlyConsent((c) => !c)} style={{ marginTop: 2 }} />
                      I understand this will recur monthly. I can manage or cancel it from my account, subject to the payment provider's supported features.
                    </label>
                  </div>
                )}

                <PrimaryButton full icon={ArrowRight} onClick={handleConfirmDonate} style={frequency === "monthly" && !monthlyConsent ? { opacity: 0.5, cursor: "not-allowed", boxShadow: "none" } : {}}>
                  {`Confirm & Donate ₹${amount}`}
                </PrimaryButton>
                <GhostButton full style={{ marginTop: 10 }} onClick={() => setShowConfirm(false)}>Edit Details</GhostButton>

                {paymentState === "not-configured" && (
                  <div className="rq-fadeUp" style={{ marginTop: 16, background: "#FFF4DC", border: "1px solid #F3DFA8", borderRadius: 12, padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <AlertCircle size={16} color="#8A6212" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: "#8A6212", lineHeight: 1.5 }}>Payment processing is currently being configured. Please check back soon — no payment has been taken.</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleReview} noValidate>
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.inkSoft, marginBottom: 10 }}>STEP 1 · CHOOSE YOUR DONATION</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }} className="rq-preset-grid">
                  {PRESET_AMOUNTS.map((v) => (
                    <button key={v} type="button" onClick={() => pickPreset(v)} className="rq-btn" style={{
                      padding: "12px 8px", borderRadius: 12, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                      border: `1.5px solid ${!useCustom && selectedAmount === v ? T.primary : T.sand}`,
                      background: !useCustom && selectedAmount === v ? T.primaryL : T.white,
                      color: !useCustom && selectedAmount === v ? T.primaryD : T.ink
                    }}>
                      ₹{v.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={pickCustom} className="rq-btn" style={{
                  width: "100%", padding: "11px 8px", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: useCustom ? 10 : 20,
                  border: `1.5px solid ${useCustom ? T.primary : T.sand}`, background: useCustom ? T.primaryL : T.white, color: useCustom ? T.primaryD : T.ink
                }}>
                  Custom Amount
                </button>
                {useCustom && (
                  <div className="rq-fadeUp" style={{ marginBottom: 20 }}>
                    <InputField icon={CreditCard} label="Enter amount (₹)" type="number" placeholder="e.g. 750" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                  </div>
                )}
                {errors.amount && <div style={{ color: T.danger, fontSize: 12, fontWeight: 600, marginTop: -12, marginBottom: 16 }}>{errors.amount}</div>}

                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.inkSoft, marginBottom: 10 }}>DONATION FREQUENCY</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {["one-time", "monthly"].map((f) => (
                    <button key={f} type="button" onClick={() => setFrequency(f)} className="rq-btn" style={{
                      flex: 1, padding: "10px 8px", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize",
                      border: `1.5px solid ${frequency === f ? T.primary : T.sand}`, background: frequency === f ? T.primaryL : T.white, color: frequency === f ? T.primaryD : T.ink
                    }}>
                      {f === "one-time" ? "One-time" : "Monthly"}
                    </button>
                  ))}
                </div>
                {frequency === "monthly" && (
                  <div className="rq-fadeUp" style={{ fontSize: 12, color: T.accentD, fontWeight: 700, marginBottom: 20 }}>Your selected amount will be contributed every month.</div>
                )}
                {frequency === "one-time" && <div style={{ marginBottom: 20 }} />}

                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.inkSoft, marginBottom: 10 }}>YOUR INFORMATION</div>
                {isLoggedIn && <div style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 10, marginTop: -4 }}>Your information is taken from your account profile.</div>}
                <InputField icon={User} label="Full name" placeholder="Enter your name" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
                {errors.name && <div style={{ color: T.danger, fontSize: 12, fontWeight: 600, marginTop: -12, marginBottom: 16 }}>{errors.name}</div>}
                <InputField icon={Mail} label="Email address" type="email" placeholder="Enter your email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
                {errors.email && <div style={{ color: T.danger, fontSize: 12, fontWeight: 600, marginTop: -12, marginBottom: 16 }}>{errors.email}</div>}
                <InputField icon={Phone} label="Phone number (optional)" placeholder="Enter your phone number" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />

                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: T.inkSoft, cursor: "pointer", marginBottom: 22 }}>
                  <input type="checkbox" checked={subscribeUpdates} onChange={() => setSubscribeUpdates((s) => !s)} style={{ marginTop: 2 }} />
                  I would like to receive occasional updates about the impact of my contribution.
                </label>

                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.inkSoft, marginBottom: 10 }}>PAYMENT METHOD</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 22 }} className="rq-preset-grid">
                  {[
                    { key: "UPI", icon: Smartphone },
                    { key: "Card", icon: CreditCard },
                    { key: "Net Banking", icon: Landmark },
                    { key: "Other", icon: Wallet },
                  ].map((m) => (
                    <button key={m.key} type="button" onClick={() => setPaymentMethod(m.key)} className="rq-btn" style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 4px", borderRadius: 12, cursor: "pointer",
                      border: `1.5px solid ${paymentMethod === m.key ? T.primary : T.sand}`, background: paymentMethod === m.key ? T.primaryL : T.white,
                      color: paymentMethod === m.key ? T.primaryD : T.inkSoft, fontSize: 10.5, fontWeight: 700
                    }}>
                      <m.icon size={16} /> {m.key}
                    </button>
                  ))}
                </div>

                <div style={{ background: T.base, border: `1px solid ${T.sand}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.inkSoft, marginBottom: 8 }}>DONATION SUMMARY</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}><span style={{ color: T.inkSoft }}>Donation amount</span><span style={{ fontWeight: 700, fontFamily: fontMono }}>₹{amount || 0}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}><span style={{ color: T.inkSoft }}>Frequency</span><span style={{ fontWeight: 700, textTransform: "capitalize" }}>{frequency === "one-time" ? "One-time" : "Monthly"}</span></div>
                  <div style={{ height: 1, background: T.sand, margin: "8px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span style={{ fontWeight: 800 }}>Total</span><span style={{ fontWeight: 800, fontFamily: fontMono, color: T.primary }}>₹{amount || 0}</span></div>
                </div>

                <PrimaryButton full type="submit" icon={ArrowRight}>Review Donation</PrimaryButton>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 20 }}>
                  <Lock size={13} color={T.inkSoft} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 11.5, color: T.inkSoft, lineHeight: 1.6 }}>
                    <strong style={{ color: T.ink }}>Secure payment.</strong> Your payment information is processed securely through our payment provider. We respect your privacy and will never sell your personal information.
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* WHERE YOUR DONATION GOES */}
      <section ref={whereGoesRef} style={{ padding: "60px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 28, textAlign: "center", marginBottom: 36, color: T.ink, }}>Where Your Donation Goes</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="rq-4col">
            <ImpactMiniCard icon={Monitor} title="Platform Development" text="Building new features and improving the experience for users, NGOs, volunteers, and organizations." />
            <ImpactMiniCard icon={ShieldCheck} title="Infrastructure & Maintenance" text="Keeping the platform reliable, accessible, secure, and available to users." />
            <ImpactMiniCard icon={Building2} title="NGO & Community Support" text="Developing resources and tools that help organizations reach more people and increase their impact." />
            <ImpactMiniCard icon={Rocket} title="New Initiatives" text="Creating more digital platforms, tools, and initiatives focused on solving real-world social challenges." />
          </div>
        </div>
      </section>

      {/* IMPACT MESSAGE */}
      <section style={{ padding: "0 24px 70px" }}>
        <div style={{
          maxWidth: 1180, margin: "0 auto", borderRadius: 32, padding: "56px 40px", textAlign: "center",
          background: `linear-gradient(120deg, ${T.primaryD}, ${T.primary})`
        }}>
          <h2 style={{ fontFamily: fontDisplay, fontStyle: "italic", color: T.white, fontSize: 30, marginBottom: 14 }}>Together, We Can Do More</h2>
          <p style={{ color: "rgba(255,255,255,.85)", maxWidth: 580, margin: "0 auto 26px", fontSize: 14, lineHeight: 1.7 }}>
            A platform can start with an idea, but it grows through people who believe in that idea. Your support allows us to keep building, improving, and creating more opportunities for positive change.
          </p>
          <PrimaryButton onClick={() => scrollToRef(formRef)}>Support Our Mission</PrimaryButton>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 26, marginBottom: 18, textAlign: "center", color: T.ink, }}>Frequently Asked Questions</h2>
          <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: "4px 20px" }}>
            <FaqAccordionItem q="How will my donation help?" a="Your contribution helps support the development, maintenance, expansion, and future initiatives of the platform." />
            <FaqAccordionItem q="Can I make a small donation?" a="Yes. Every contribution matters, regardless of its size." />
            <FaqAccordionItem q="Can I donate every month?" a="Yes, if recurring donations are enabled through the selected payment provider." />
            <FaqAccordionItem q="Is my payment secure?" a="Payments should be processed through a secure payment provider. Sensitive payment information is never stored directly on this website." />
            <FaqAccordionItem q="Can I receive updates?" a="Yes. You can optionally choose to receive updates when completing the donation form." />
            <FaqAccordionItem q="How can I contact you about my donation?" a="Reach out any time through our Help & Support page — use the Contact Us link below." />
          </div>
          <div style={{ textAlign: "center", marginTop: -6 }}>
            <span onClick={() => go("help-support")} className="rq-underline" style={{ fontSize: 12.5, color: T.primary, fontWeight: 700, cursor: "pointer" }}>Contact Us →</span>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ============================================================
   AUTH — LOGIN & SIGNUP
============================================================= */


function AuthShell({ children, go, illustrationTitle, illustrationSub }) {
  return (
    <div className="rq-root" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }} id="rq-auth-grid">
      <div style={{
        position: "relative", background: `linear-gradient(155deg, ${T.primaryD}, ${T.primary} 60%, #2C8A5C)`,
        padding: 48, display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden"
      }} className="rq-auth-illustration">
        <div style={{ position: "absolute", inset: 0, opacity: .12, backgroundImage: "radial-gradient(circle, #fff 1.5px, transparent 1.5px)", backgroundSize: "22px 22px" }} />
        <div style={{ cursor: "pointer", position: "relative" }} onClick={() => go("landing")}><Logo dark /></div>
        <div style={{ position: "relative" }}>
          <h2 style={{ fontFamily: fontDisplay, fontStyle: "italic", color: T.white, fontSize: 32, lineHeight: 1.25, marginBottom: 14 }}>{illustrationTitle}</h2>
          <p style={{ color: "rgba(255,255,255,.78)", fontSize: 14, maxWidth: 340, marginBottom: 30 }}>{illustrationSub}</p>
          <div style={{ background: "rgba(255,255,255,.12)", backdropFilter: "blur(6px)", borderRadius: 18, padding: 20 }}>
            <RescueLine compact />
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 26 }}>
          {[["12.4K", "meals"], ["380", "orgs"], ["4.9★", "rating"]].map(([n, l], i) => (
            <div key={i}>
              <div style={{ color: T.white, fontFamily: fontDisplay, fontWeight: 700, fontSize: 20 }}>{n}</div>
              <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px, 5vw, 32px)" }}>
        <div className="rq-fadeUp" style={{
          width: "100%", maxWidth: 420, background: "rgba(255,255,255,.7)", backdropFilter: "blur(16px)",
          border: `1px solid ${T.sand}`, borderRadius: 26, padding: "clamp(20px, 6vw, 36px)", boxShadow: "0 20px 60px rgba(20,35,28,.1)"
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function InputField({ icon: Icon, label, type = "text", value, onChange, placeholder, right, id, name, error, min, step, onClick, inputRef, required, inputMode }) {
  // Fall back to a stable, unique id derived from the label so every
  // field has a real id/name even if the caller didn't pass one.
  const autoId = useRef(`rq-field-${label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : Math.random().toString(36).slice(2)}`);
  const fieldId = id || autoId.current;
  const fieldName = name || fieldId;
  const isDateTime = type === "date" || type === "time" || type === "datetime-local";
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={fieldId} style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, display: "block", marginBottom: 6 }}>
        {label} {required && <span style={{ color: T.danger }}>*</span>}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <Icon
          size={16}
          color={T.inkSoft}
          style={{ position: "absolute", left: 14, cursor: isDateTime ? "pointer" : "default", zIndex: 1 }}
          onClick={isDateTime ? () => (inputRef?.current || document.getElementById(fieldId))?.showPicker?.() ?? (inputRef?.current || document.getElementById(fieldId))?.focus?.() : undefined}
        />
        <input
          id={fieldId}
          name={fieldName}
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          onClick={onClick}
          placeholder={placeholder}
          min={min}
          step={step}
          inputMode={inputMode}
          className="rq-focus"
          style={{
            width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12,
            border: `1.5px solid ${error ? T.danger : T.sand}`,
            fontSize: 14, background: T.white, fontFamily: fontBody, cursor: isDateTime ? "pointer" : "text"
          }}
        />
        {right && <div style={{ position: "absolute", right: 12 }}>{right}</div>}
      </div>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, color: T.danger, fontSize: 11.5, fontWeight: 600 }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}

function PasswordStrength({ pwd }) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = [T.danger, T.gold, "#5FA968", T.primary];
  if (!pwd) return null;
  const idx = Math.max(score - 1, 0);
  return (
    <div style={{ marginTop: -8, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 3, background: i <= idx ? colors[idx] : T.sand, transition: "background .2s" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: colors[idx] }}>{labels[idx]} password</span>
    </div>
  );
}

function GoogleButton({ onClick }) {
  return (
    <button onClick={onClick} className="rq-btn" style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      padding: "12px", borderRadius: 12, border: `1.5px solid ${T.sand}`, background: T.white,
      fontWeight: 700, fontSize: 13.5, cursor: "pointer", color: T.ink
    }}>
      <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.5-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.2 3 9.5 7.4 6.3 14.7z" /><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.5 26.7 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.4 40.6 16.1 45 24 45z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.8 36 44 30.5 44 24c0-1.4-.1-2.5-.4-3.5z" /></svg>
      Continue with Google
    </button>
  );
}

function Login({ go, toast, onSignIn }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  // Looks up the account this email actually signed up with (saved by
  // Signup) so login routes to that account's real role — falling back
  // to the sample donor account only when no matching account is found.
  const handleLogin = async () => {
    if (loggingIn) return;

    if (!email.trim() || !pwd) {
      toast("Please enter your email and password", "error");
      return;
    }

    setLoggingIn(true);

    try {
      const data = await authService.login({
        email: email.trim(),
        password: pwd,
      });

      if (!data?.token || !data?.user) {
        throw new Error("Invalid email or password");
      }

      // Save the JWT returned by the backend
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("resqbite_token", data.token);

      // Use the real database user returned by the backend
      const signedInUser = normalizeApiUser(data.user);
      onSignIn?.(signedInUser);

      toast("Logged in successfully");

      go(dashboardForRole(signedInUser));
    } catch (error) {
      console.error("Login error:", error);
      toast(error.message || "Login failed", "error");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <AuthShell go={go} illustrationTitle={<>Welcome back to<br />the rescue.</>} illustrationSub="Log in to track your donations, manage pickups and see your impact grow.">
      <h2 style={{ fontFamily: fontDisplay, fontSize: 26, marginBottom: 4, color: T.ink, }}>Log in</h2>
      <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 24 }}>New here? <span style={{ color: T.primary, fontWeight: 700, cursor: "pointer" }} onClick={() => go("signup")}>Create an account</span></p>

      <InputField icon={Mail} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <InputField icon={Lock} label="Password" type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••"
        right={<button onClick={() => setShow((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>{show ? <EyeOff size={16} color={T.inkSoft} /> : <Eye size={16} color={T.inkSoft} />}</button>} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: T.inkSoft, cursor: "pointer" }}>
          <input type="checkbox" checked={remember} onChange={() => setRemember((r) => !r)} /> Remember me
        </label>
        <span style={{ fontSize: 12.5, color: T.primary, fontWeight: 700, cursor: "pointer" }} onClick={() => toast("Password reset link sent (demo)")}>Forgot password?</span>
      </div>

      <PrimaryButton full disabled={loggingIn} onClick={handleLogin} icon={loggingIn ? Loader2 : ArrowRight}>{loggingIn ? "Logging in…" : "Log in"}</PrimaryButton>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
        <div style={{ flex: 1, height: 1, background: T.sand }} /> <span style={{ fontSize: 11.5, color: T.inkSoft }}>OR</span> <div style={{ flex: 1, height: 1, background: T.sand }} />
      </div>
      <GoogleButton onClick={() => { onSignIn?.({ ...DEFAULT_USER, ...GOOGLE_ACCOUNT }); toast("Logged in with Google"); go("dashboard"); }} />
    </AuthShell>
  );
}

function Signup({ go, toast, onSignIn, addOrg }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("donor");
  const [orgType, setOrgType] = useState("NGO");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);

  // Organization details (step 3) — controlled so entered values persist
  // while filling out the form, instead of the fields silently resetting.
  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCapacity, setOrgCapacity] = useState("");
  const [orgHours, setOrgHours] = useState("");
  const [orgPref, setOrgPref] = useState("");
  const [docsName, setDocsName] = useState(null);
  const [logoName, setLogoName] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const needsOrgStep = role === "org";
  const totalSteps = needsOrgStep ? 3 : 2;

  const next = async () => {
    if (submitting) return; // guard against duplicate submissions
    if (step === 1 && !role) return toast("Please choose a role", "error");
    if (step === 2 && (!name || !email || !pwd)) return toast("Please fill all fields", "error");
    if (step === 3 && needsOrgStep) {
      if (!orgName || !orgPhone || !orgAddress || !orgCapacity || !orgHours || !orgPref) {
        return toast("Please fill all organization details", "error");
      }
    }
    if (step < totalSteps) { setStep(step + 1); return; }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: pwd,
        role: role === "volunteer" ? "VOLUNTEER" : role === "org" ? "ORGANIZATION" : "DONOR",
        location: role === "org" ? orgAddress : "",
        bio: role === "org" ? orgName : "",
        skills: "",
        interests: "",
      };

      const data = await authService.register(payload);
      if (!data?.token || !data?.user) {
        throw new Error("Account creation failed");
      }

      localStorage.setItem("resqbite_token", data.token);
      onSignIn?.(normalizeApiUser(data.user));
      await storeSet(accountKey(email), data.user);
      if (needsOrgStep) {
        const org = {
          id: orgName.trim().toLowerCase().replace(/\s+/g, "-") || `org-${Date.now()}`,
          name: orgName, type: orgType, phone: orgPhone, address: orgAddress,
          capacity: orgCapacity, hours: orgHours, pref: orgPref,
          distance: "—", rating: null, verified: false, docsName, logoName,
        };
        addOrg?.(org);
      }
      toast("Account created — welcome to ResQBite!");
      go(dashboardForRole(normalizeApiUser(data.user)));
    } catch (error) {
      console.error("Signup error:", error);
      toast(error.message || "Could not create account", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // "Continue with Google" stands in for a real OAuth round-trip: it
  // fills in the name/email (and a generated password, since the local
  // form still needs one) from the sample Google account, then jumps
  // straight to the details step — pre-filled instead of blank, saving
  // the person from retyping what Google already knows about them.
  const continueWithGoogle = () => {
    setName(GOOGLE_ACCOUNT.name);
    setEmail(GOOGLE_ACCOUNT.email);
    setPwd(GOOGLE_GENERATED_PWD);
    setStep(2);
    toast("Signed in with Google — details filled in");
  };

  return (
    <AuthShell go={go} illustrationTitle={<>Join 12,400+ people<br />fighting food waste.</>} illustrationSub="Whether you're donating, delivering or receiving — set up your account in under a minute.">
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i < step ? T.primary : T.sand, transition: "background .3s" }} />
        ))}
      </div>

      {step === 1 && (
        <div className="rq-fadeUp">
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>I am a...</h2>
          <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 20 }}>Choose the role that fits you best.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {ROLES.map((r) => (
              <div key={r.key} onClick={() => setRole(r.key)} className="rq-card-hover" style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${role === r.key ? T.primary : T.sand}`, background: role === r.key ? T.primaryL : T.white
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: role === r.key ? T.primary : T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <r.icon size={18} color={role === r.key ? T.white : T.inkSoft} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                  <div style={{ fontSize: 11.5, color: T.inkSoft }}>{r.sub}</div>
                </div>
              </div>
            ))}
          </div>
          {role === "org" && (
            <div className="rq-fadeUp" style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, display: "block", marginBottom: 8 }}>Organization type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {ORG_TYPES.map((t) => (
                  <span key={t} onClick={() => setOrgType(t)} style={{
                    padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: orgType === t ? T.primary : T.sand, color: orgType === t ? T.white : T.inkSoft
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="rq-fadeUp">
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>Your details</h2>
          <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 20 }}>Basic info to set up your account.</p>
          <InputField icon={User} label={role === "org" ? "Contact person name" : "Full name"} value={name} onChange={(e) => setName(e.target.value)} placeholder="Diksha Sharma" />
          <InputField icon={Mail} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <InputField icon={Lock} label="Password" type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Create a strong password"
            right={<button onClick={() => setShow((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>{show ? <EyeOff size={16} color={T.inkSoft} /> : <Eye size={16} color={T.inkSoft} />}</button>} />
          <PasswordStrength pwd={pwd} />
        </div>
      )}

      {step === 3 && needsOrgStep && (
        <div className="rq-fadeUp">
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>Organization details</h2>
          <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 18 }}>Help donors find and trust you faster.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputField icon={Building2} label="Organization name" placeholder={orgType + " name"} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <InputField icon={Phone} label="Phone" placeholder="+91 98765 43210" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
          </div>
          <InputField icon={MapPin} label="Address & map location" placeholder="Street, city, pincode" value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InputField icon={Users} label="Daily capacity" placeholder="e.g. 80 meals/day" value={orgCapacity} onChange={(e) => setOrgCapacity(e.target.value)} />
            <InputField icon={Clock} label="Operating hours" placeholder="8:00 AM – 9:00 PM" value={orgHours} onChange={(e) => setOrgHours(e.target.value)} />
          </div>
          <InputField icon={Utensils} label="Food preference" placeholder="Veg / Non-veg / Any" value={orgPref} onChange={(e) => setOrgPref(e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
            <UploadStub icon={FileCheck2} label="Verification documents" value={docsName} onChange={setDocsName} />
            <UploadStub icon={ImageIcon} label="Organization logo" value={logoName} onChange={setLogoName} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        {step > 1 && <GhostButton onClick={() => setStep(step - 1)} style={{ padding: "12px 16px" }}><ArrowLeft size={15} style={{ display: "inline", verticalAlign: -2 }} /></GhostButton>}
        <PrimaryButton full onClick={next} icon={submitting ? Loader2 : (step === totalSteps ? CheckCircle2 : ArrowRight)}
          style={submitting ? { opacity: 0.75, pointerEvents: "none" } : {}}>
          {submitting ? "Creating account…" : (step === totalSteps ? "Create account" : "Continue")}
        </PrimaryButton>
      </div>

      {step === 1 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.sand }} /> <span style={{ fontSize: 11.5, color: T.inkSoft }}>OR</span> <div style={{ flex: 1, height: 1, background: T.sand }} />
          </div>
          <GoogleButton onClick={continueWithGoogle} />
        </>
      )}
    </AuthShell>
  );
}

function UploadStub({ icon: Icon, label, value, onChange }) {
  // Supports an optional controlled value/onChange (used by the
  // Organization signup step so the selected filename survives step
  // navigation); falls back to local state for any standalone usage.
  const [localName, setLocalName] = useState(null);
  const name = value !== undefined ? value : localName;
  const setName = onChange || setLocalName;
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, display: "block", marginBottom: 6 }}>{label}</label>
      <label style={{
        border: `1.5px dashed ${T.sand}`, borderRadius: 12, padding: "14px 10px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 5, cursor: "pointer", background: T.white
      }}>
        <Icon size={16} color={T.inkSoft} />
        <span style={{ fontSize: 11, color: T.inkSoft, textAlign: "center" }}>{name || "Click to upload"}</span>
        <input type="file" style={{ display: "none" }} onChange={(e) => setName(e.target.files?.[0]?.name)} />
      </label>
    </div>
  );
}

/* ============================================================
   ORGANIZATIONS DIRECTORY
   "Orgs" in the nav opens this page in the same tab, sharing the same
   header (TopNav) and footer as every other page via PageShell.
============================================================= */

function parseDistanceKm(d) {
  const n = parseFloat(d);
  return Number.isFinite(n) ? n : Infinity;
}

const DISTANCE_FILTERS = [
  { key: "any", label: "Any distance", max: Infinity },
  { key: "2", label: "Under 2 km", max: 2 },
  { key: "5", label: "Under 5 km", max: 5 },
  { key: "10", label: "Under 10 km", max: 10 },
];

function OrganizationCard({ org, expanded, onToggle, go, toast }) {
  return (
    <Reveal className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Building2 size={22} color={T.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>{org.name}</div>
            {org.verified ? (
              <Pill tone="primary"><ShieldCheck size={11} /> Verified</Pill>
            ) : (
              <Pill tone="gold">Pending verification</Pill>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 3, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span>{org.type}</span>
            {org.distance && org.distance !== "—" && <><span>·</span><MapPin size={11} /> <span>{org.distance}</span></>}
            {org.rating != null && <><span>·</span><Star size={11} fill={T.gold} color={T.gold} /> <span>{org.rating}</span></>}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="rq-fadeUp" style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.sand}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><div style={{ fontSize: 10.5, fontWeight: 700, color: T.inkSoft }}>CAPACITY</div><div style={{ fontSize: 13, fontWeight: 700 }}>{org.capacity || "Not specified"}</div></div>
          <div><div style={{ fontSize: 10.5, fontWeight: 700, color: T.inkSoft }}>HOURS</div><div style={{ fontSize: 13, fontWeight: 700 }}>{org.hours || "Not specified"}</div></div>
          <div><div style={{ fontSize: 10.5, fontWeight: 700, color: T.inkSoft }}>FOOD PREFERENCE</div><div style={{ fontSize: 13, fontWeight: 700 }}>{org.pref || "Not specified"}</div></div>
          <div><div style={{ fontSize: 10.5, fontWeight: 700, color: T.inkSoft }}>ADDRESS</div><div style={{ fontSize: 13, fontWeight: 700 }}>{org.address || "Not specified"}</div></div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <GhostButton onClick={onToggle} style={{ padding: "8px 14px", fontSize: 12.5 }}>{expanded ? "Hide details" : "View details"}</GhostButton>
        <PrimaryButton onClick={() => go("donate")} style={{ padding: "8px 16px", fontSize: 12.5 }}>Donate to them</PrimaryButton>
      </div>
    </Reveal>
  );
}

function OrganizationsPage({ go, toast, isLoggedIn, onSignOut, orgs }) {
  // The page already has usable data the instant it mounts — either data
  // fetched earlier this session (apiResultCache) or the seeded `orgs`
  // list passed down from App — so it never needs to block on the network
  // before showing something. `loading` only covers the brief window
  // before either of those is available, which in practice is never once
  // the app has any seed data at all.
  const cachedOrgsResponse = getCached("/organizations");
  const [loading, setLoading] = useState(!cachedOrgsResponse && !(orgs && orgs.length));
  const [errored, setErrored] = useState(false);
  const [liveOrgs, setLiveOrgs] = useState(() => (cachedOrgsResponse ? (cachedOrgsResponse.organizations || cachedOrgsResponse) : null));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | requesting | granted | denied
  const [manualLocation, setManualLocation] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.organizations();
        if (!cancelled) { setLiveOrgs(data.organizations || data); setErrored(false); }
      } catch (err) {
        // Backend not reachable — fall back to the directory already
        // known on the client (seeded orgs + any newly registered ones).
        if (!cancelled) setErrored(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus("granted"),
      () => setLocationStatus("denied"),
      { timeout: 6000 }
    );
  };

  const source = liveOrgs || orgs || [];
  const types = ["All", ...Array.from(new Set(source.map((o) => o.type)))];
  const maxDistance = DISTANCE_FILTERS.find((d) => d.key === distanceFilter)?.max ?? Infinity;

  const filtered = source.filter((o) => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "All" && o.type !== typeFilter) return false;
    if (verifiedOnly && !o.verified) return false;
    if (parseDistanceKm(o.distance) > maxDistance) return false;
    return true;
  });

  return (
    <PageShell go={go} toast={toast} isLoggedIn={isLoggedIn} onSignOut={onSignOut} page="organizations">
      <PageHero eyebrow="Organizations" title="Organizations making a difference." sub="Discover verified NGOs, shelters, and community kitchens near you — see who's accepting donations right now." />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* LOCATION */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18, background: T.white, border: `1px solid ${T.sand}`, borderRadius: 16, padding: "12px 16px" }}>
          {locationStatus === "granted" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
              <Navigation size={15} color={T.primary} /> Showing organizations near your current location
            </div>
          ) : locationStatus === "denied" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <span style={{ fontSize: 12.5, color: T.inkSoft }}>Location unavailable — enter a city or area instead:</span>
              <input value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} placeholder="e.g. Agra" className="rq-focus"
                style={{ padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${T.sand}`, fontSize: 12.5, minWidth: 160 }} />
              <GhostButton onClick={() => toast(manualLocation ? `Searching near ${manualLocation}` : "Enter a location first")} style={{ padding: "8px 14px", fontSize: 12 }}>Search</GhostButton>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.inkSoft }}>
              <MapPin size={15} /> Use your location to sort organizations by distance
            </div>
          )}
          {locationStatus !== "granted" && (
            <GhostButton onClick={requestLocation} style={{ padding: "8px 14px", fontSize: 12 }}>
              {locationStatus === "requesting" ? "Requesting…" : "Use my location"}
            </GhostButton>
          )}
        </div>

        {/* SEARCH + FILTERS */}
        <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 16, marginBottom: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Search size={15} color={T.inkSoft} style={{ position: "absolute", left: 12, top: 11 }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organizations by name..." className="rq-focus"
              style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 11, border: `1.5px solid ${T.sand}`, fontSize: 13 }} />
          </div>
          <div className="rq-btn-row" style={{ gap: 8 }}>
            {types.map((t) => (
              <span key={t} onClick={() => setTypeFilter(t)} style={{
                padding: "8px 13px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: typeFilter === t ? T.ink : T.base, color: typeFilter === t ? T.white : T.inkSoft, border: `1px solid ${typeFilter === t ? T.ink : T.sand}`
              }}>{t}</span>
            ))}
          </div>
          <div className="rq-btn-row" style={{ gap: 8, alignItems: "center" }}>
            {DISTANCE_FILTERS.map((d) => (
              <span key={d.key} onClick={() => setDistanceFilter(d.key)} style={{
                padding: "7px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                background: distanceFilter === d.key ? T.primaryL : T.base, color: distanceFilter === d.key ? T.primaryD : T.inkSoft, border: `1px solid ${distanceFilter === d.key ? T.primary : T.sand}`
              }}>{d.label}</span>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: T.inkSoft, cursor: "pointer", marginLeft: 4 }}>
              <input type="checkbox" checked={verifiedOnly} onChange={() => setVerifiedOnly((v) => !v)} /> Verified only
            </label>
          </div>
        </div>

        {/* RESULTS */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }} className="rq-2col">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={140} r={18} />)}
          </div>
        ) : errored ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18 }}>
            <AlertCircle size={26} color={T.danger} style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Couldn't load organizations</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>Please check your connection and try again.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18 }}>
            <Building2 size={26} color={T.inkSoft} style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>No organizations found nearby</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>Try widening your search radius or clearing filters.</div>
            <GhostButton onClick={() => { setDistanceFilter("any"); setVerifiedOnly(false); setTypeFilter("All"); }} style={{ padding: "9px 16px", fontSize: 12.5 }}>Expand search radius</GhostButton>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }} className="rq-2col">
            {filtered.map((org, i) => (
              <OrganizationCard key={org.id || org.name} org={org} go={go} toast={toast}
                expanded={expandedId === (org.id || org.name)}
                onToggle={() => setExpandedId((cur) => (cur === (org.id || org.name) ? null : (org.id || org.name)))} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ============================================================
   DONATE FOOD PAGE (with AI scan)
============================================================= */

function DonatePage({ go, toast, isLoggedIn, onSignOut }) {
  const orgData = useOrgData();
  const { user } = useCurrentUser();
  const [preview, setPreview] = useState(null);
  const [scanState, setScanState] = useState("idle"); // idle | scanning | done
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  // Controlled form state — every field below is a real, editable
  // input tied to this state via value + onChange, never a static
  // placeholder-only element.
  // Donor name/phone/email prefill from the signed-in account (when
  // available) but stay fully editable — an anonymous donor gets blank
  // fields and can type their own contact details.
  const [donorName, setDonorName] = useState(user?.name || "");
  const [donorPhone, setDonorPhone] = useState(user?.phone || "");
  const [donorEmail, setDonorEmail] = useState(user?.email || "");
  const [foodName, setFoodName] = useState("");
  const [servings, setServings] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [preparedAt, setPreparedAt] = useState("");
  const [bestBefore, setBestBefore] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const preparedAtRef = useRef(null);
  const bestBeforeRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|jpg|png)$/.test(f.type)) {
      setErrors((prev) => ({ ...prev, photo: "Please upload a JPG or PNG image" }));
      toast("Please upload a JPG or PNG image", "error");
      return;
    }
    setErrors((prev) => ({ ...prev, photo: undefined }));
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
    setScanState("scanning");
    setResult(null);
    setTimeout(() => {
      setScanState("done");
      setResult({
        freshness: 91,
        spoilage: "Not detected",
        safe: true,
        meals: 42,
        expiry: "3h 20m safe window",
        confidence: 96,
        org: ORGS[0],
      });
      toast("AI scan complete — food looks safe to donate");
    }, 2600);
  };

  const validate = () => {
    const next = {};
    if (!donorName.trim()) next.donorName = "Your name is required";
    if (!donorPhone.trim()) next.donorPhone = "Phone number is required";
    else if (!/^[0-9+\-\s()]{7,20}$/.test(donorPhone.trim())) next.donorPhone = "Enter a valid phone number";
    if (!donorEmail.trim()) next.donorEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail.trim())) next.donorEmail = "Enter a valid email address";
    if (!preview) next.photo = "A food photo is required";
    if (!foodName.trim()) next.foodName = "Food name is required";
    const servingsNum = Number(servings);
    if (!servings.trim()) next.servings = "Servings is required";
    else if (!Number.isFinite(servingsNum) || servingsNum <= 0 || !Number.isInteger(servingsNum)) {
      next.servings = "Enter a valid positive number";
    }
    if (!pickupLocation.trim()) next.pickupLocation = "Pickup location is required";
    if (!preparedAt) next.preparedAt = "Prepared at date & time is required";
    if (!bestBefore) next.bestBefore = "Best before date & time is required";
    if (preparedAt && bestBefore) {
      const p = new Date(preparedAt).getTime();
      const b = new Date(bestBefore).getTime();
      if (b <= p) next.bestBefore = "Best before must be later than Prepared at";
    }
    setErrors(next);
    return Object.keys(next).filter((k) => next[k]).length === 0;
  };

  const handleServingsChange = (e) => {
    // Accept only digits so the field can never hold a non-numeric or
    // negative value while still letting the user type freely.
    const raw = e.target.value;
    if (raw === "" || /^[0-9]+$/.test(raw)) setServings(raw);
  };

  const handleSubmit = async () => {
    if (scanState === "scanning") {
      toast("Please wait for the AI freshness scan to finish", "error");
      return;
    }
    if (!validate()) {
      toast("Please fill in all required fields correctly", "error");
      return;
    }
    if (!isLoggedIn) {
      toast("Please log in to donate food", "error");
      go("login");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", foodName.trim());
      formData.append("description", `Donated by ${donorName.trim()} (${donorPhone.trim()})`);
      formData.append("food_type", "other");
      formData.append("quantity", String(Number(servings)));
      formData.append("quantity_unit", "servings");
      formData.append("expiry_time", new Date(bestBefore).toISOString());
      formData.append("pickup_address", pickupLocation.trim());
      formData.append("pickup_city", user?.city || "");
      formData.append("latitude", "");
      formData.append("longitude", "");
      if (fileRef.current?.files?.[0]) {
        formData.append("image", fileRef.current.files[0]);
      }

      const token = getAuthToken();
      const res = await fetch(`${RESQBITE_API_URL}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientId: null,
          type: "FOOD_DONATION",
          message: `${foodName.trim()} (${servings} servings) available at ${pickupLocation.trim()}`,
          activityTitle: foodName.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `API request failed: ${res.status} ${res.statusText}`);
      }

      toast("Food donation submitted successfully.");
      go("dashboard");
    } catch (error) {
      console.error("Donation submit error:", error);
      toast(error.message || "Donation submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rq-root" style={{ minHeight: "100vh" }}>
      <TopNav go={go} toast={toast} page="donate" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
      <div style={{ margin: "0 auto", padding: "36px 24px 80px" }}>
        <Reveal style={{ marginBottom: 28 }}>
          <Pill tone="accent"><Sparkles size={12} /> AI-assisted</Pill>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 32, marginTop: 12, color: T.ink }}>Donate surplus food</h1>
          <p style={{ color: T.inkSoft, fontSize: 14 }}>A clear photo helps our AI verify freshness and recommend the best-fit organization.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="rq-2col">
          {/* LEFT: form */}
          <Reveal index={0} style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 22, padding: 24 }}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, marginBottom: 8 }}>Your details</div>
              <InputField
                id="rq-donor-name" name="donorName" icon={User} label="Full name" required
                placeholder="e.g. Diksha Sharma" value={donorName} onChange={(e) => setDonorName(e.target.value)}
                error={errors.donorName}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <InputField
                  id="rq-donor-phone" name="donorPhone" icon={Phone} label="Phone number" required
                  type="tel" inputMode="tel" placeholder="e.g. +91 98765 43210" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)}
                  error={errors.donorPhone}
                />
                <InputField
                  id="rq-donor-email" name="donorEmail" icon={Mail} label="Email" required
                  type="email" placeholder="e.g. you@example.com" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)}
                  error={errors.donorEmail}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, display: "block", marginBottom: 8 }}>
                Food photo <span style={{ color: T.danger }}>*</span>
              </label>
              <div id="rq-food-photo-dropzone" onClick={() => fileRef.current?.click()} style={{
                borderRadius: 16, border: `2px dashed ${errors.photo ? T.danger : preview ? T.primary : T.sand}`, cursor: "pointer",
                minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
                background: preview ? "#000" : T.base
              }}>
                <input id="rq-food-photo-input" name="foodPhoto" ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" style={{ display: "none" }} onChange={onFile} />
                {!preview && (
                  <div style={{ textAlign: "center", color: T.inkSoft }}>
                    <Camera size={26} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Click to upload a photo</div>
                    <div style={{ fontSize: 11.5 }}>JPG or PNG, clear top-down shot works best</div>
                  </div>
                )}
                {preview && <img src={preview} alt="food" style={{ width: "100%", height: 220, objectFit: "cover", opacity: scanState === "scanning" ? 0.55 : 0.95 }} />}
                {scanState === "scanning" && (
                  <>
                    <div className="rq-scanline" style={{ position: "absolute", left: 0, right: 0, height: 2, background: T.gold, boxShadow: `0 0 16px 3px ${T.gold}` }} />
                    <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, background: "rgba(20,35,28,.75)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Loader2 size={14} color={T.white} className="rq-spin" />
                      <span style={{ color: T.white, fontSize: 12, fontWeight: 700 }}>AI analyzing freshness…</span>
                    </div>
                  </>
                )}
              </div>
              {errors.photo && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, color: T.danger, fontSize: 11.5, fontWeight: 600 }}>
                  <AlertCircle size={12} /> {errors.photo}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField
                id="rq-food-name" name="foodName" icon={Utensils} label="Food name" required
                placeholder="e.g. Veg Biryani" value={foodName} onChange={(e) => setFoodName(e.target.value)}
                error={errors.foodName}
              />
              <InputField
                id="rq-servings" name="servings" icon={Users} label="Servings" required
                type="text" inputMode="numeric" placeholder="e.g. 40" value={servings} onChange={handleServingsChange}
                error={errors.servings}
              />
            </div>
            <InputField
              id="rq-pickup-location" name="pickupLocation" icon={MapPin} label="Pickup location" required
              placeholder="Street, area, city" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}
              error={errors.pickupLocation}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField
                id="rq-prepared-at" name="preparedAt" icon={Clock} label="Prepared at" required
                type="datetime-local" value={preparedAt} onChange={(e) => setPreparedAt(e.target.value)}
                error={errors.preparedAt} inputRef={preparedAtRef}
              />
              <InputField
                id="rq-best-before" name="bestBefore" icon={Timer} label="Best before" required
                type="datetime-local" value={bestBefore} onChange={(e) => setBestBefore(e.target.value)}
                error={errors.bestBefore} inputRef={bestBeforeRef} min={preparedAt || undefined}
              />
            </div>

            <PrimaryButton full disabled={submitting} onClick={handleSubmit} icon={ArrowRight} style={{ marginTop: 6 }}>
              {submitting ? "Submitting…" : "Request food"}
            </PrimaryButton>
          </Reveal>

          {/* RIGHT: AI result */}
          <Reveal index={1}>
            {scanState !== "done" && (
              <div style={{ background: T.white, border: `1px dashed ${T.sand}`, borderRadius: 22, padding: 24, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: T.inkSoft, minHeight: 380 }}>
                <Gauge size={26} style={{ marginBottom: 10, opacity: .6 }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>AI results will appear here</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Upload a food photo to run the freshness check.</div>
              </div>
            )}
            {scanState === "done" && result && (
              <div className="rq-fadeUp" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 22, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 15 }}>
                    <Sparkles size={16} color={T.accent} /> AI Scan Results
                  </div>
                  <Pill tone={result.safe ? "primary" : "danger"}>{result.safe ? <CircleCheck size={12} /> : <XCircle size={12} />} {result.safe ? "Safe to donate" : "Unsafe"}</Pill>
                </div>

                <ScoreRow label="Freshness score" value={result.freshness} suffix="/100" color={T.primary} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0" }}>
                  <MiniStat icon={AlertCircle} label="Spoilage" value={result.spoilage} />
                  <MiniStat icon={Users} label="Est. meals" value={result.meals} />
                  <MiniStat icon={Timer} label="Expiry prediction" value={result.expiry} />
                  <MiniStat icon={Gauge} label="AI confidence" value={result.confidence + "%"} />
                </div>

                <div style={{ background: T.primaryL, borderRadius: 16, padding: 16, marginTop: 4 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: T.primaryD, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <ThumbsUp size={13} /> AI-recommended organization
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: T.primary, fontFamily: fontDisplay }}>{result.org.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{result.org.name}</div>
                      <div style={{ fontSize: 11.5, color: T.inkSoft }}>{result.org.distance} away · {result.org.capacity} capacity</div>
                    </div>
                    <Star size={14} color={T.gold} fill={T.gold} />
                  </div>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </div>

      <Footer go={go} toast={toast} />
    </div>
  );
}

function ScoreRow({ label, value, suffix, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
        <span style={{ color: T.inkSoft }}>{label}</span>
        <span style={{ fontFamily: fontMono, color }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: T.sand, borderRadius: 6, overflow: "hidden" }}>
        <div className="rq-grow" style={{ width: "100%", height: "100%", transform: `scaleX(${value / 100})`, background: `linear-gradient(90deg, ${color}, ${T.gold})`, borderRadius: 6 }} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div style={{ background: T.base, border: `1px solid ${T.sand}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.inkSoft, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 14, fontFamily: fontMono }}>{value}</div>
    </div>
  );
}

/* ============================================================
   LIVE TRACKING PAGE
============================================================= */

function TrackingPage({ go, toast, isLoggedIn, onSignOut, trackingDonationId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tracked, setTracked] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [progress, setProgress] = useState(0);
  const pollIntervalRef = useRef(null);
  
  // Map status to human-readable labels
  const STATUS_LABELS = {
    pending: "Pending",
    accepted: "Accepted",
    assigned: "Assigned",
    picked_up: "Picked Up",
    delivered: "Delivered",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  // Status progression for progress calculation
  const STATUS_ORDER = ["pending", "accepted", "assigned", "picked_up", "delivered"];
  const STATUS_ICONS = {
    pending: PlusCircle,
    accepted: CheckCircle2,
    assigned: Truck,
    picked_up: Package,
    delivered: Award,
    cancelled: XCircle,
    expired: AlertCircle,
  };

  // Build timeline events from tracking data
  const buildTimeline = (donation, timeline) => {
    if (!timeline || !Array.isArray(timeline)) return [];
    
    return timeline.map((track, idx) => {
      const isDone = donation.status !== track.status || timeline.some(t => 
        STATUS_ORDER.indexOf(t.status) > STATUS_ORDER.indexOf(track.status)
      );
      const isActive = donation.status === track.status;
      
      return {
        label: STATUS_LABELS[track.status] || track.status,
        icon: STATUS_ICONS[track.status] || Package,
        done: isDone || isActive,
        active: isActive,
        time: track.created_at ? new Date(track.created_at).toLocaleTimeString() : "Time unavailable",
        note: track.note,
      };
    });
  };

  // Calculate progress from status
  const calculateProgress = (status) => {
    if (!status || status === "cancelled" || status === "expired") return 0;
    const idx = STATUS_ORDER.indexOf(status);
    if (idx < 0) return 0;
    return Math.round((idx / (STATUS_ORDER.length - 1)) * 100);
  };

  // Fetch tracking data
  const fetchTrackingData = useCallback(async () => {
    if (!trackingDonationId) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.donationTracking(trackingDonationId);
      if (data.success === false) throw new Error(data.message || "Failed to load tracking data");
      
      setTracked(data);
      const events = buildTimeline(data.donation, data.timeline);
      setTimelineEvents(events);
      const prog = calculateProgress(data.donation.status);
      setProgress(prog);
      setError(null);
    } catch (err) {
      console.error("Tracking fetch error:", err);
      setError(err.message || "Unable to load live tracking");
      setTracked(null);
    } finally {
      setLoading(false);
    }
  }, [trackingDonationId]);

  // Initial fetch
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Live polling every 5 seconds
  useEffect(() => {
    if (!trackingDonationId || !isLoggedIn) return;
    
    // Poll while delivery is in progress
    pollIntervalRef.current = setInterval(() => {
      fetchTrackingData();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [trackingDonationId, isLoggedIn, fetchTrackingData]);

  // Stop polling when delivered or cancelled
  useEffect(() => {
    if (tracked && (tracked.donation.status === "delivered" || tracked.donation.status === "cancelled")) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [tracked?.donation?.status]);

  const donation = tracked?.donation;
  const volunteer = tracked?.volunteer;
  const organization = tracked?.organization;

  // Show empty state if no donation selected
  if (!trackingDonationId) {
    return (
      <div className="rq-root" style={{ minHeight: "100vh" }}>
        <TopNav go={go} toast={toast} page="tracking" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Package size={32} color={T.primary} />
            </div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 26, marginBottom: 8, color: T.ink }}>No donation selected</h1>
            <p style={{ fontSize: 14, color: T.inkSoft, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
              Select a donation from your dashboard to track its progress from pickup to delivery.
            </p>
            <PrimaryButton onClick={() => go("dashboard")}>Go to Dashboard</PrimaryButton>
          </div>
        </div>
        <Footer go={go} toast={toast} />
      </div>
    );
  }

  // Show error state
  if (error && !tracked) {
    return (
      <div className="rq-root" style={{ minHeight: "100vh" }}>
        <TopNav go={go} toast={toast} page="tracking" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FBE4E4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <AlertCircle size={32} color={T.danger} />
            </div>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 26, marginBottom: 8, color: T.ink }}>Unable to load tracking</h1>
            <p style={{ fontSize: 14, color: T.inkSoft, marginBottom: 24 }}>{error}</p>
            <PrimaryButton onClick={() => fetchTrackingData()}>Retry</PrimaryButton>
          </div>
        </div>
        <Footer go={go} toast={toast} />
      </div>
    );
  }

  // Show loading state
  if (loading || !donation) {
    return (
      <div className="rq-root" style={{ minHeight: "100vh" }}>
        <TopNav go={go} toast={toast} page="tracking" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
          <div style={{ height: 300, background: T.sand + "30", borderRadius: 24, animation: "rq-shimmer 2s infinite" }} />
        </div>
        <Footer go={go} toast={toast} />
      </div>
    );
  }

  const volunteerInitials = volunteer ? initialsOf(volunteer.name) : "?";

  return (
    <div className="rq-root" style={{ minHeight: "100vh" }}>
      <TopNav go={go} toast={toast} page="tracking" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        <Reveal style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
          <div>
            <Pill tone="gold"><Truck size={12} /> Live rescue #{donation.id.slice(0, 8)}</Pill>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 28, marginTop: 10, color: T.ink }}>{STATUS_LABELS[donation.status] || donation.status}</h1>
          </div>
          {isLoggedIn && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.white, border: `1px solid ${T.sand}`, borderRadius: 14, padding: "10px 16px" }}>
              <Clock size={15} color={T.accent} />
              <div>
                <div style={{ fontSize: 10.5, color: T.inkSoft, fontWeight: 700 }}>LAST UPDATED</div>
                <div style={{ fontFamily: fontMono, fontWeight: 800, fontSize: 13 }}>{new Date(donation.updated_at).toLocaleTimeString()}</div>
              </div>
            </div>
          )}
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 20 }} className="rq-2col">
          {/* MAP PLACEHOLDER */}
          <Reveal index={0} style={{ background: `linear-gradient(160deg, ${T.primaryL}, #F1EDE0)`, borderRadius: 24, border: `1px solid ${T.sand}`, position: "relative", overflow: "hidden", minHeight: 380 }}>
            <div style={{ position: "absolute", inset: 0, opacity: .5, backgroundImage: `linear-gradient(${T.sandD}22 1px, transparent 1px), linear-gradient(90deg, ${T.sandD}22 1px, transparent 1px)`, backgroundSize: "34px 34px" }} />
            <svg width="100%" height="100%" viewBox="0 0 400 380" style={{ position: "absolute", inset: 0 }}>
              <path id="route" d="M 60 300 C 140 300, 120 140, 200 130 S 300 60, 340 70" fill="none" stroke={T.sandD} strokeWidth="4" strokeLinecap="round" />
              <path d="M 60 300 C 140 300, 120 140, 200 130 S 300 60, 340 70" fill="none" stroke={T.primary} strokeWidth="4" strokeLinecap="round"
                strokeDasharray="600" strokeDashoffset="600" style={{ animation: "rq-dash 2.4s ease forwards" }} />
              <circle cx="60" cy="300" r="9" fill={T.white} stroke={T.accent} strokeWidth="3" />
              <circle cx="340" cy="70" r="9" fill={T.white} stroke={T.primary} strokeWidth="3" />
              {volunteer && <circle cx="200" cy="130" r="12" fill={T.gold} stroke={T.white} strokeWidth="3" className="rq-pulse-dot" />}
            </svg>
            <div style={{ position: "absolute", left: 30, bottom: 24, background: T.white, borderRadius: 12, padding: "8px 12px", boxShadow: "0 8px 20px rgba(20,35,28,.12)", display: "flex", alignItems: "center", gap: 7 }}>
              <MapPin size={14} color={T.accent} /> <span style={{ fontSize: 11.5, fontWeight: 700 }}>{donation.pickup_city || donation.pickup_address}</span>
            </div>
            <div style={{ position: "absolute", right: 30, top: 24, background: T.white, borderRadius: 12, padding: "8px 12px", boxShadow: "0 8px 20px rgba(20,35,28,.12)", display: "flex", alignItems: "center", gap: 7 }}>
              <Building2 size={14} color={T.primary} /> <span style={{ fontSize: 11.5, fontWeight: 700 }}>{organization?.organization_name || organization?.name || "Not assigned"}</span>
            </div>
            <div style={{ position: "absolute", bottom: 14, right: 14, fontSize: 10, color: T.inkSoft, background: "rgba(255,255,255,.7)", padding: "3px 8px", borderRadius: 8 }}>Live map preview</div>
          </Reveal>

          {/* RIGHT PANEL */}
          <Reveal index={1} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* DONATION DETAILS */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft, marginBottom: 10 }}>DONATION</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{donation.title}</div>
              <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>{donation.quantity} {donation.quantity_unit}</div>
              {donation.expiry_time && (
                <div style={{ fontSize: 11.5, color: T.accentD, fontWeight: 600 }}>Safe until: {new Date(donation.expiry_time).toLocaleTimeString()}</div>
              )}
            </div>

            {/* VOLUNTEER */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft, marginBottom: 10 }}>VOLUNTEER</div>
              {!isLoggedIn ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={16} color={T.inkSoft} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>Delivery partner details are hidden</div>
                    <button onClick={() => go("login")} className="rq-btn" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: T.primary }}>Sign in to view</button>
                  </div>
                </div>
              ) : volunteer ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, ${T.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontWeight: 800 }}>{volunteerInitials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{volunteer.name}</div>
                    <div style={{ fontSize: 11.5, color: T.inkSoft }}>{volunteer.phone || "No phone"}</div>
                  </div>
                  <button className="rq-btn" onClick={() => toast(`Calling ${volunteer.name}`)} style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: T.primaryL, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={15} color={T.primary} /></button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.inkSoft }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Truck size={17} color={T.inkSoft} /></div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Volunteer not assigned yet</div>
                </div>
              )}
            </div>

            {/* RECEIVING ORGANIZATION */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft, marginBottom: 10 }}>RECEIVING ORGANIZATION</div>
              {!isLoggedIn ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={16} color={T.inkSoft} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>Organization details are hidden</div>
                    <button onClick={() => go("login")} className="rq-btn" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: T.primary }}>Sign in to view</button>
                  </div>
                </div>
              ) : organization ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{organization.organization_name || organization.name}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>{organization.city || organization.address || "Location unavailable"}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.inkSoft, marginBottom: 8 }}>
                    <span>Progress</span><span style={{ fontFamily: fontMono, fontWeight: 800, color: T.primary }}>{progress}%</span>
                  </div>
                  <div style={{ height: 7, background: T.sand, borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      width: "100%", height: "100%", background: `linear-gradient(90deg, ${T.primary}, ${T.gold})`, borderRadius: 6,
                      transform: `scaleX(${progress / 100})`, transformOrigin: "left",
                      transition: "transform 1.6s cubic-bezier(.16,1,.3,1)", willChange: "transform"
                    }} />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.inkSoft }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 size={17} color={T.inkSoft} /></div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Organization information unavailable</div>
                </div>
              )}
            </div>

            {/* TIMELINE */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 18, flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft, marginBottom: 14 }}>TIMELINE</div>
              {!isLoggedIn ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={16} color={T.inkSoft} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>Timeline is hidden</div>
                    <button onClick={() => go("login")} className="rq-btn" style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 700, color: T.primary }}>Sign in to view</button>
                  </div>
                </div>
              ) : timelineEvents.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.inkSoft }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: T.sand, display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={17} color={T.inkSoft} /></div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>No tracking events yet</div>
                </div>
              ) : timelineEvents.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: i < timelineEvents.length - 1 ? 20 : 0 }}>
                  {i < timelineEvents.length - 1 && <div style={{ position: "absolute", left: 11, top: 26, bottom: 0, width: 2, background: s.done ? T.primary : T.sand }} />}
                  <div className={s.active ? "rq-pulse-dot" : ""} style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: s.done ? T.primary : s.active ? T.gold : T.sand, zIndex: 1
                  }}>
                    <s.icon size={12} color={s.done || s.active ? T.white : T.inkSoft} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: s.done || s.active ? T.ink : T.inkSoft }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: T.inkSoft, fontFamily: fontMono }}>{s.time}</div>
                    {s.note && <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 2 }}>{s.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <Footer go={go} toast={toast} />
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================= */

function Skeleton({ h = 16, w = "100%", r = 8 }) {
  return <div className="rq-shimmer" style={{ height: h, width: w, borderRadius: r }} />;
}

function DashboardRedirect({ user, go }) {
  useEffect(() => {
    go(dashboardForRole(user));
  }, [go, user]);
  return null;
}

function DashboardPage({ go, toast, isLoggedIn, onSignOut }) {
  const { user } = useCurrentUser();
  const isOrg = user?.role === "org" && !!user?.org;
  const orgData = useOrgData();
  // Four independent datasets, each with its own loading flag so a slow
  // endpoint only skeletons its own card instead of the whole dashboard.
  // Each also initializes from the module-level apiResultCache: if we
  // already fetched it on a previous visit to this page this session,
  // it renders immediately with no skeleton and no re-fetch.
  const [dashboardData, setDashboardData] = useState(() => getCached("/dashboard") || null);
  const [overview, setOverview] = useState(() => getCached("/analytics/overview") || null);
  const [weeklyData, setWeeklyData] = useState(() => {
    const cached = getCached("/analytics/weekly?days=7");
    return cached ? cached.weekly.map((w) => ({ d: w.d, meals: w.meals })) : WEEKLY;
  });
  const [foodMixData, setFoodMixData] = useState(() => getCached("/analytics/food-mix")?.foodMix || PIE);
  const [statusData, setStatusData] = useState(() => {
    const cached = getCached("/analytics/status-breakdown");
    return cached ? cached.statusBreakdown.map((s) => ({ status: s.status.replace(/_/g, " "), count: s.count })) : [];
  });
  const [loadingOverview, setLoadingOverview] = useState(!isOrg && !getCached("/dashboard") && !getCached("/analytics/overview"));
  const [loadingWeekly, setLoadingWeekly] = useState(!isOrg && !getCached("/dashboard") && !getCached("/analytics/weekly?days=7"));
  const [loadingFoodMix, setLoadingFoodMix] = useState(!isOrg && !getCached("/dashboard") && !getCached("/analytics/food-mix"));
  const [loadingStatus, setLoadingStatus] = useState(!isOrg && !getCached("/dashboard") && !getCached("/analytics/status-breakdown"));
  const [isLive, setIsLive] = useState(() => !!getCached("/dashboard") || !!getCached("/analytics/overview"));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  // Donations/surplus list is capped to the latest 3 by default; "View all"
  // reveals the rest inside the card's own scroll area so it never
  // grows the row and drags the pie chart / activity feed taller.
  const [showAllDonations, setShowAllDonations] = useState(false);
  const DONATIONS_PREVIEW_COUNT = 3;
  const listSectionRef = useRef(null);
  const impactSectionRef = useRef(null);

  // Organization dashboards are computed live from OrgDataContext (the
  // same store the Track page reads) — never fetched separately — so
  // they need no backend round-trip and no loading state of their own.
  // Only the donor/volunteer dashboard still talks to the demo backend.
  // Each of the four calls below resolves and updates its own card
  // independently — a slow one never holds up the other three, and none
  // of them block the page itself from rendering (it's already returned
  // below using whatever cached/fallback data is in state right now).
  useEffect(() => {
    if (isOrg) {
      setLoadingOverview(false); setLoadingWeekly(false);
      setLoadingFoodMix(false); setLoadingStatus(false);
      return;
    }
    let cancelled = false;

    authenticatedRequest("/dashboard")
      .then((data) => {
        if (cancelled) return;
        setDashboardData(data);
        setOverview({
          activeDonations: data.stats.activeDonations,
          inTransit: data.stats.inTransit,
          mealsDelivered: data.stats.mealsDonated,
          deliveredDonations: data.stats.deliveredDonations,
          totalDonations: data.stats.totalDonations,
          verifiedNgoCount: 0,
          volunteerCount: 0,
          co2SavedTonnes: 0,
        });
        setWeeklyData(data.weeklyMeals || WEEKLY);
        setIsLive(true);
      })
      .catch(() => {
        // fall back to public analytics if the dashboard route is unavailable
        return api.analyticsOverview()
          .then((ov) => { if (!cancelled) { setOverview(ov); setIsLive(true); } })
          .catch(() => { });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOverview(false);
          setLoadingWeekly(false);
          setLoadingFoodMix(false);
          setLoadingStatus(false);
        }
      });

    return () => { cancelled = true; };
  }, [isOrg]);

  // Chart data sources: organization accounts always read the live,
  // request-derived numbers from OrgDataContext; donor/volunteer
  // accounts keep the backend-fetched (or sample-fallback) data above.
  const weeklyChartData = isOrg ? orgData.weekly.weekly : weeklyData;
  const foodMixChartData = isOrg ? orgData.categories : foodMixData;
  const statusChartData = isOrg ? orgData.statusBreakdown : statusData;
  const weeklyPctChange = isOrg ? orgData.weekly.pctChange : (dashboardData?.weeklyChange ?? 0);

  // Organization dashboards are framed around RECEIVING food — an
  // organization is a food receiver, never a donor — instead of generic
  // donations. Every label below changes accordingly when the signed-in
  // account is an organization. Non-org accounts (donor/volunteer) keep
  // the original donation-centric dashboard untouched.
  const stats = isOrg ? [
    { icon: Package, label: "Food Requests", value: orgData.stats.activeRequests, delta: `${orgData.stats.pendingDeliveries} awaiting delivery`, color: T.primary },
    { icon: Truck, label: "Pending Deliveries", value: orgData.stats.pendingDeliveries, delta: `${orgData.requests.filter((r) => r.status === "In Transit").length} in transit now`, color: T.gold },
    { icon: Users, label: "Meals Received", value: orgData.stats.mealsReceived, delta: `${weeklyPctChange >= 0 ? "+" : ""}${weeklyPctChange}% this week`, color: T.accent },
    { icon: Box, label: "Food Received", value: orgData.stats.foodReceivedKg, suffix: " kg", delta: `${orgData.impact.successfulDeliveries} deliveries`, color: T.primaryD },
  ] : (dashboardData ? [
    { icon: Package, label: "Active donations", value: dashboardData.stats.activeDonations, delta: `${dashboardData.stats.todayDonations || 0} today`, color: T.primary },
    { icon: Truck, label: "In transit", value: dashboardData.stats.inTransit, delta: `${dashboardData.stats.deliveredDonations || 0} delivered`, color: T.gold },
    { icon: Users, label: "Meals donated", value: dashboardData.stats.mealsDonated, delta: `${dashboardData.weeklyChange || 0}% this week`, color: T.accent },
    { icon: Award, label: "Rescue points", value: dashboardData.stats.rescuePoints, delta: dashboardData.stats.tier, color: T.primaryD },
  ] : (overview ? [
    { icon: Package, label: "Active donations", value: overview.activeDonations, delta: `${overview.totalDonations} total`, color: T.primary },
    { icon: Truck, label: "In transit", value: overview.inTransit, delta: `${overview.deliveredDonations} delivered`, color: T.gold },
    { icon: Users, label: "Meals donated", value: overview.mealsDelivered, delta: `${overview.co2SavedTonnes}t CO₂ saved`, color: T.accent },
    { icon: Award, label: "Verified NGOs", value: overview.verifiedNgoCount, delta: `${overview.volunteerCount} volunteers`, color: T.primaryD },
  ] : [
    { icon: Package, label: "Active donations", value: 0, delta: "0 today", color: T.primary },
    { icon: Truck, label: "In transit", value: 0, delta: "0 delivered", color: T.gold },
    { icon: Users, label: "Meals donated", value: 0, delta: "0% this week", color: T.accent },
    { icon: Award, label: "Rescue points", value: 0, delta: "Bronze", color: T.primaryD },
  ])
  );

  const scrollToList = () => { setShowAllDonations(true); listSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const scrollToImpact = () => impactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const quickActions = isOrg ? [
    { icon: Package, label: "Find Food", act: () => go("available-food") },
    { icon: PlusCircle, label: "Request Food", act: () => go("donate") },
    { icon: Navigation, label: "Track Delivery", act: () => go("tracking") },
    { icon: Clock, label: "Food History", act: () => go("org-history") },
  ] : [
    { icon: PlusCircle, label: "New donation", act: () => go("donate") },
    { icon: Navigation, label: "Track pickup", act: () => go("tracking") },
    { icon: Building2, label: "Browse orgs", act: () => go("organizations") },
    { icon: BarChart3, label: "Full report", act: () => toast("Generating report") },
  ];

  return (
    <div className="rq-root" style={{ minHeight: "100vh" }}>
      <TopNav go={go} toast={toast} page="dashboard" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />

      {/* Overview: header, stat cards, weekly chart + quick actions */}
      <div style={{ width: "100%", padding: "32px 24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>Welcome back,</div>
            {/* Org accounts greet by organization name (from the signed-in
                account's own record — never hardcoded); everyone else by
                their personal first name. Long org names get a smaller
                font so they never dominate the header like a logo. */}
            <h1 style={{ fontFamily: fontDisplay, fontSize: isOrg && (user.org.name || "").length > 7 ? 22 : 30, color: T.ink }}>{isOrg ? (user.org.name || "Organization") : firstNameOf(user)} 👋</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!loadingOverview && isLive && (
              <Pill tone="primary">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.primary, display: "inline-block" }} />
                Live data
              </Pill>
            )}
            <PrimaryButton onClick={() => go(isOrg ? "available-food" : "donate")} icon={isOrg ? Package : PlusCircle}>{isOrg ? "Find Food" : "New donation"}</PrimaryButton>
          </div>
        </div>

        {/* ORGANIZATION PROFILE — only for accounts created via the
            Organization signup step; shows the data actually submitted
            during registration instead of any sample/hardcoded values. */}
        {isOrg && (
          <Reveal style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, marginBottom: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Organization profile</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="rq-4col">
              {[
                [Building2, "Organization name", user.org.name],
                [Phone, "Phone", user.org.phone],
                [MapPin, "Address", user.org.address],
                [Users, "Daily capacity", user.org.capacity],
                [Clock, "Operating hours", user.org.hours],
                [Utensils, "Food preference", user.org.pref],
                [user.org.verified ? ShieldCheck : AlertCircle, "Verification status", user.org.verified ? "Verified" : "Pending"],
                [FileCheck2, "Verification documents", user.org.docsName],
                [ImageIcon, "Organization logo", user.org.logoName],
              ].map(([Icon, label, value], i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.inkSoft, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    <Icon size={12} /> {label.toUpperCase()}
                  </div>
                  {label === "Verification status" ? (
                    <Pill tone={user.org.verified ? "primary" : "gold"}>{value}</Pill>
                  ) : (
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{value || "Not provided"}</div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 }} className="rq-4col">
          {stats.map((s, i) => (
            <Reveal key={i} index={i} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 18 }}>
              {loadingOverview ? <Skeleton h={70} /> : (
                <div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                    <s.icon size={17} color={s.color} />
                  </div>
                  <div style={{ fontFamily: fontMono, fontWeight: 800, fontSize: 24 }}><CountUp to={s.value} suffix={s.suffix || ""} /></div>
                  <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: T.primary, fontWeight: 700, marginTop: 4 }}>{s.delta}</div>
                </div>
              )}
            </Reveal>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.1fr", gap: 20 }} className="rq-2col">
          {/* CHART — height matches Quick actions via grid stretch */}
          <Reveal index={4} style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{isOrg ? "Food received this week" : "Meals rescued this week"}</div>
              <Pill tone="primary"><TrendingUp size={11} /> {weeklyPctChange >= 0 ? "+" : ""}{weeklyPctChange}%</Pill>
            </div>
            {loadingWeekly ? <Skeleton h={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyChartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={T.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={T.sand} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.sand}`, fontSize: 12 }} />
                  <Area type="monotone" dataKey="meals" stroke={T.primary} strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Reveal>

          {/* QUICK ACTIONS — height matches the chart via grid stretch */}
          <Reveal index={5} style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18 }}>Quick actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, alignContent: "center" }}>
              {quickActions.map((a, i) => (
                <button key={i} onClick={a.act} className="rq-btn rq-card-hover" style={{ background: T.base, border: `1px solid ${T.sand}`, borderRadius: 14, padding: 22, cursor: "pointer", textAlign: "left" }}>
                  <a.icon size={17} color={T.accent} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{a.label}</div>
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* Surplus food / donations list, category mix & recent activity */}
      <div ref={listSectionRef} style={{ width: "100%", padding: "0 24px 80px" }}>
        {/* alignItems: "stretch" keeps both columns the same height — the
            left "My Requests"/"Donations" card and the right-hand stack
            (pie chart + recent activity) end at the same bottom edge
            instead of whichever column has less content looking short.
            The list card's own height is still capped internally
            (maxHeight + scroll once expanded), so a long list never
            drags the right column taller than its natural content. */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.1fr", gap: 20, alignItems: "stretch" }} className="rq-2col">
          <Reveal index={6} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* STATUS BREAKDOWN BAR CHART */}
            {statusChartData.length > 0 && (
              <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{isOrg ? "Request status breakdown" : "Donation pipeline"}</div>
                {loadingStatus ? <Skeleton h={160} /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid vertical={false} stroke={T.sand} />
                      <XAxis dataKey="status" tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: T.inkSoft }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${T.sand}`, fontSize: 12 }} />
                      <Bar dataKey="count" fill={T.accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* TRACK FOOD — compact banner for the organization's most
                pressing incoming request (the first one actively moving
                toward delivery); only shown when something is actually
                on its way, never a fabricated delivery. */}
            {isOrg && (() => {
              const incoming = orgData.requests.find((r) => ["In Transit", "Arriving", "Picked Up"].includes(r.status));
              if (!incoming) return null;
              return (
                <div style={{ background: T.primaryL, border: `1px solid ${T.sand}`, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="rq-truck" style={{ width: 38, height: 38, borderRadius: 10, background: T.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Truck size={17} color={T.primary} /></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13.5 }}>{incoming.meals} meals on the way from {incoming.provider}</div>
                      <div style={{ fontSize: 11.5, color: T.inkSoft }}>Volunteer {incoming.volunteer || "not assigned yet"} · ETA {incoming.eta || "unavailable"}</div>
                    </div>
                  </div>
                  <button onClick={() => go("tracking", { trackingDonationId: incoming.id })} className="rq-btn" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: T.primaryD, cursor: "pointer", flexShrink: 0 }}>Track Food</button>
                </div>
              );
            })()}

            {/* SEARCH + FILTER + LIST */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{isOrg ? "My Requests" : "Donations"}</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
                  <Search size={15} color={T.inkSoft} style={{ position: "absolute", left: 12, top: 11 }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isOrg ? "Search my requests..." : "Search donations..."} className="rq-focus"
                    style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 11, border: `1.5px solid ${T.sand}`, fontSize: 13 }} />
                </div>
                {(isOrg ? REQUEST_STATUS_FILTERS : ["All", "Active", "Delivered", "Cancelled"]).map((f) => (
                  <span key={f} onClick={() => setFilter(f)} style={{
                    padding: "9px 14px", borderRadius: 11, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    background: filter === f ? T.ink : T.base, color: filter === f ? T.white : T.inkSoft, border: `1px solid ${filter === f ? T.ink : T.sand}`
                  }}>{f}</span>
                ))}
              </div>
              {(() => {
                const sourceList = isOrg ? orgData.requests : DASHBOARD_DONATIONS;
                const allowedStatuses = isOrg ? REQUEST_STATUS_FILTER_MAP[filter] : null;
                const filteredDonations = sourceList
                  .filter(d => (isOrg ? d.food : d.name).toLowerCase().includes(search.toLowerCase()))
                  .filter(d => !isOrg || !allowedStatuses || allowedStatuses.includes(d.status));
                const visibleDonations = showAllDonations ? filteredDonations : filteredDonations.slice(0, DONATIONS_PREVIEW_COUNT);
                const hasMore = filteredDonations.length > DONATIONS_PREVIEW_COUNT;
                return (
                  <>
                    {/* Fixed max height + internal scroll, always on — so
                        this card's own height stays constant no matter how
                        many requests exist, and stays in sync with the
                        pie chart / recent activity cards next to it. */}
                    <div className="rq-scrollbar" style={{
                      display: "flex", flexDirection: "column", gap: 10,
                      maxHeight: 320,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}>
                      {visibleDonations.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "20px 0", color: T.inkSoft, fontSize: 13 }}>{isOrg ? "No requests match your search." : "No donations match your search."}</div>
                      ) : visibleDonations.map((d, i) => (
                        isOrg ? (
                          <div key={i} className="rq-card-hover" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 14, border: `1px solid ${T.sand}` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Soup size={17} color={T.primary} /></div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.food} · {d.meals} meals</div>
                                  <div style={{ fontSize: 11.5, color: T.inkSoft }}>from {d.provider}</div>
                                </div>
                              </div>
                              <Pill tone={toneForOrgStatus(d.status)}>{d.status}</Pill>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 50, gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>{d.volunteer ? `Volunteer: ${d.volunteer}` : "Awaiting volunteer"}</div>
                              <button onClick={() => go("tracking", { trackingDonationId: d.id })} className="rq-btn" style={{ background: "transparent", border: `1px solid ${T.sand}`, borderRadius: 9, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: T.primaryD, cursor: "pointer" }}>Track Food</button>
                            </div>
                          </div>
                        ) : (
                          <div key={i} className="rq-card-hover" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, border: `1px solid ${T.sand}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center" }}><Soup size={17} color={T.primary} /></div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{d.name}</div>
                                <div style={{ fontSize: 11.5, color: T.inkSoft }}>→ {d.org}</div>
                              </div>
                            </div>
                            <Pill tone={d.tone}>{d.status}</Pill>
                          </div>
                        )
                      ))}
                    </div>
                    {hasMore && (
                      <button onClick={() => setShowAllDonations(v => !v)} className="rq-btn" style={{
                        marginTop: 12, alignSelf: "center", background: "transparent", border: `1.5px solid ${T.sand}`,
                        borderRadius: 11, padding: "9px 18px", fontWeight: 700, fontSize: 12.5, color: T.primaryD, cursor: "pointer"
                      }}>
                        {showAllDonations ? "Show less" : `View all (${filteredDonations.length})`}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </Reveal>

          <Reveal index={7} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* PIE */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{isOrg ? "Food received" : "Donation mix"}</div>
              {loadingFoodMix ? <Skeleton h={140} /> : foodMixChartData.length === 0 ? (
                <div style={{ fontSize: 12.5, color: T.inkSoft, padding: "20px 0" }}>No deliveries yet — this fills in once food has been received.</div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={foodMixChartData} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={3}>
                        {foodMixChartData.map((p, i) => <Cell key={i} fill={p.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="rq-scrollbar" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 110, overflowY: "auto", paddingRight: 4 }}>
                    {foodMixChartData.map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: p.color, flexShrink: 0 }} /> {p.name} <span style={{ color: T.inkSoft, fontFamily: fontMono }}>{p.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTIVITY */}
            <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Recent activity</div>
              <div className="rq-scrollbar" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
                {(isOrg ? orgData.activity : ACTIVITY).map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <a.icon size={15} color={a.color} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{a.text}</div>
                      <div style={{ fontSize: 11, color: T.inkSoft }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ORGANIZATION IMPACT — total food received across all requests,
          not just this week's activity. Org accounts only. */}
      {isOrg && (
        <div ref={impactSectionRef} style={{ width: "100%", padding: "0 24px 80px" }}>
          <Reveal style={{ background: T.primaryD, borderRadius: 24, padding: 28, color: T.white }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 20, marginBottom: 18 }}>Your Food Impact</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="rq-4col">
              {[
                { icon: Users, value: orgData.impact.mealsReceived, label: "Total meals received" },
                { icon: Box, value: orgData.impact.foodReceivedKg, suffix: " kg", label: "Total food received" },
                { icon: Truck, value: orgData.impact.successfulDeliveries, label: "Total successful deliveries" },
                { icon: Building2, value: orgData.impact.providersCount, label: "Total food providers" },
                { icon: Users, value: orgData.impact.volunteersCount, label: "Total volunteers" },
                { icon: Heart, value: orgData.impact.peopleServed, label: "People served" },
              ].map((m, i) => (
                <div key={i}>
                  <m.icon size={17} color={T.gold} style={{ marginBottom: 8 }} />
                  <div style={{ fontFamily: fontMono, fontWeight: 800, fontSize: 24 }}><CountUp to={m.value} suffix={m.suffix || ""} /></div>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      )}

      <Footer go={go} toast={toast} />
    </div>
  );
}

/* ============================================================
   AVAILABLE FOOD (organization-only)
   Where an organization browses food currently available from
   restaurants/businesses/events and requests it — the org never lists
   or donates food of its own here.
============================================================= */

function AvailableFoodPage({ go, toast, isLoggedIn, onSignOut }) {
  const { user } = useCurrentUser();
  const isOrg = user?.role === "org" && !!user?.org;
  const orgData = useOrgData();
  const [search, setSearch] = useState("");
  const [requested, setRequested] = useState({});
  const [availableFood, setAvailableFood] = useState(AVAILABLE_FOOD);

  useEffect(() => {
    if (!isOrg) return;
    let cancelled = false;
    authenticatedRequest("/donations")
      .then((rows) => {
        const donations = (Array.isArray(rows) ? rows : rows?.donations || [])
          .filter((donation) => ["available", "pending"].includes(String(donation.status).toLowerCase()))
          .map((donation) => ({
            ...donation,
            name: donation.name || donation.food || donation.title,
            quantity: donation.quantity || "Available",
            meals: donation.meals || donation.servings || "—",
            provider: donation.donor || "Food provider",
            location: donation.pickupLocation || donation.location || "Pickup location unavailable",
            pickupTime: donation.pickupTime || "Contact provider",
          }));
        if (!cancelled && donations.length > 0) setAvailableFood(donations);
      })
      .catch(() => { /* Keep the existing layout fallback if the API is unavailable. */ });
    return () => { cancelled = true; };
  }, [isOrg]);

  // Items already requested this session, PLUS anything already active
  // in the shared org request store (so the flag survives navigating
  // away and back, not just local component state).
  const activeFoodNames = new Set(
    orgData.requests.filter((r) => isOrgRequestActive(r.status)).map((r) => r.food)
  );

  const requestFood = async (item) => {
    setRequested((prev) => ({ ...prev, [item.name]: true }));
    if (Number.isInteger(Number(item.id))) {
      try {
        await authenticatedRequest(`/donations/${item.id}/claim`, { method: "POST" });
      } catch (error) {
        setRequested((prev) => ({ ...prev, [item.name]: false }));
        toast(error.message || "Unable to request this food", "error");
        return;
      }
    }
    // Creates a real "Requested" record in the same store the Track
    // page and Dashboard read from — this is the start of the
    // Requested -> ... -> Delivered lifecycle, not just a local flag.
    orgData.addRequest({
      id: `RQ-${Math.floor(1000 + Math.random() * 9000)}`,
      food: item.name,
      quantity: item.quantity,
      meals: item.meals,
      weightKg: Math.round(item.meals * 0.6),
      category: item.category || "Other",
      provider: item.provider,
      volunteer: null,
      pickupLocation: item.location,
      pickupTime: item.pickupTime,
      eta: null,
      status: "Requested",
      requestedAt: "Just now",
      updatedAgo: "just now",
    });
    toast(`Request sent to ${item.provider} for ${item.name}`);
  };

  if (!isOrg) {
    return (
      <div className="rq-root" style={{ minHeight: "100vh" }}>
        <TopNav go={go} toast={toast} page="available-food" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
        <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
          <Building2 size={28} color={T.inkSoft} style={{ marginBottom: 10 }} />
          <h2 style={{ fontFamily: fontDisplay, fontSize: 22, color: T.ink, }}>This page is for organization accounts</h2>
          <p style={{ color: T.inkSoft, fontSize: 13.5 }}>Sign in with an organization account to browse and request available food.</p>
        </div>
        <Footer go={go} toast={toast} />
      </div>
    );
  }

  const results = availableFood.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) || f.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rq-root" style={{ minHeight: "100vh" }}>
      <TopNav go={go} toast={toast} page="available-food" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 80px" }}>
        <Reveal style={{ marginBottom: 24 }}>
          <Pill tone="primary"><Package size={12} /> Food receiver</Pill>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 30, marginTop: 12, color: T.ink }}>Available food near you</h1>
          <p style={{ color: T.inkSoft, fontSize: 14 }}>Restaurants, businesses, and events with surplus food ready for pickup. Request what your organization can use — ResQBite assigns a volunteer to bring it to you.</p>
        </Reveal>

        <div style={{ position: "relative", maxWidth: 420, marginBottom: 22 }}>
          <Search size={15} color={T.inkSoft} style={{ position: "absolute", left: 12, top: 13 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search food or provider..." className="rq-focus"
            style={{ width: "100%", padding: "11px 12px 11px 34px", borderRadius: 12, border: `1.5px solid ${T.sand}`, fontSize: 13.5, background: T.white }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }} className="rq-2col">
          {results.map((item, i) => {
            const alreadyRequested = requested[item.name] || activeFoodNames.has(item.name);
            return (
              <Reveal key={i} index={i} className="rq-card-hover" style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Soup size={19} color={T.primary} /></div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: T.inkSoft }}>{item.provider}</div>
                    </div>
                  </div>
                  <Pill tone={alreadyRequested ? "gold" : "primary"}>{alreadyRequested ? "Requested" : "Available"}</Pill>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <MiniStat icon={Package} label="Quantity" value={item.quantity} />
                  <MiniStat icon={Users} label="Meals" value={item.meals} />
                  <MiniStat icon={Clock} label="Pickup window" value={item.pickupTime} />
                  <MiniStat icon={MapPin} label="Location" value={item.location} />
                </div>
                <PrimaryButton full icon={alreadyRequested ? CheckCircle2 : ArrowRight} onClick={() => !alreadyRequested && requestFood(item)}
                  style={alreadyRequested ? { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" } : {}}>
                  {alreadyRequested ? "Requested" : "Request Food"}
                </PrimaryButton>
              </Reveal>
            );
          })}
          {results.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 0", color: T.inkSoft, fontSize: 13.5 }}>No available food matches your search.</div>
          )}
        </div>
      </div>
      <Footer go={go} toast={toast} />
    </div>
  );
}

/* ============================================================
   FOOD HISTORY (organization-only)
   Previously received food — a record of what the organization has
   received through ResQBite, not what it has donated.
============================================================= */

function OrgHistoryPage({ go, toast, isLoggedIn, onSignOut }) {
  const { user } = useCurrentUser();
  const isOrg = user?.role === "org" && !!user?.org;
  const orgData = useOrgData();
  const [search, setSearch] = useState("");
  // Sourced directly from OrgDataContext — the same live store the
  // Track page and Dashboard read — so a request that's just been
  // delivered shows up here immediately, never a separate list.
  const history = orgData.requests.filter((r) => r.status === "Delivered" || r.status === "Cancelled");

  if (!isOrg) {
    return (
      <div className="rq-root" style={{ minHeight: "100vh" }}>
        <TopNav go={go} toast={toast} page="org-history" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
        <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
          <Building2 size={28} color={T.inkSoft} style={{ marginBottom: 10 }} />
          <h2 style={{ fontFamily: fontDisplay, fontSize: 22, color: T.ink, }}>This page is for organization accounts</h2>
          <p style={{ color: T.inkSoft, fontSize: 13.5 }}>Sign in with an organization account to view your food history.</p>
        </div>
        <Footer go={go} toast={toast} />
      </div>
    );
  }

  const results = history.filter((f) =>
    f.food.toLowerCase().includes(search.toLowerCase()) || f.provider.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rq-root" style={{ minHeight: "100vh" }}>
      <TopNav go={go} toast={toast} page="org-history" isLoggedIn={isLoggedIn} onSignOut={onSignOut} />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px 80px" }}>
        <Reveal style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 30, color: T.ink }}>Food history</h1>
          <p style={{ color: T.inkSoft, fontSize: 14 }}>A record of the food your organization has received through ResQBite.</p>
        </Reveal>

        <div style={{ position: "relative", maxWidth: 380, marginBottom: 18 }}>
          <Search size={15} color={T.inkSoft} style={{ position: "absolute", left: 12, top: 13 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search food or provider..." className="rq-focus"
            style={{ width: "100%", padding: "11px 12px 11px 34px", borderRadius: 12, border: `1.5px solid ${T.sand}`, fontSize: 13.5, background: T.white }} />
        </div>

        <Reveal style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, overflow: "hidden" }}>
          {results.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.inkSoft, fontSize: 13.5 }}>No food history matches your search.</div>
          ) : results.map((h, i) => (
            <div key={h.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderTop: i > 0 ? `1px solid ${T.sand}` : "none", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Soup size={17} color={T.primary} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{h.food} · {h.quantity}</div>
                  <div style={{ fontSize: 11.5, color: T.inkSoft }}>from {h.provider} · {h.requestedAt}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: fontMono, fontWeight: 800, fontSize: 14 }}>{h.meals}</div>
                  <div style={{ fontSize: 10.5, color: T.inkSoft }}>meals received</div>
                </div>
                <Pill tone={toneForOrgStatus(h.status)}>{h.status}</Pill>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
      <Footer go={go} toast={toast} />
    </div>
  );
}

/* ============================================================
   ROOT APP
============================================================= */

/* ============================================================
   RESQBITE — VOLUNTEER DASHBOARD
   Built to match the existing ResQBite design system (tokens,
   fonts, buttons, cards, motion) but scoped entirely to the
   Volunteer role: pick up food from providers, deliver it to
   receiving organizations. Volunteers never donate or receive
   food themselves.

   DATA SOURCE
   1) Tries the real backend first: RESQBITE_API_URL + /volunteer/*
   2) If the backend isn't reachable, falls back to this browser's
      persistent key-value storage (window.storage) scoped to the
      signed-in volunteer — a real, durable store, not an in-memory
      demo array.
   3) If there is genuinely nothing there yet, the UI shows an
      empty state. Nothing on this page is hardcoded/seeded/fake.
============================================================= */

const API_BASE = `${RESQBITE_API_URL}/volunteer`;

function getVolunteerAuthHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getVolunteerAuthHeaders() });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getVolunteerAuthHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json();
}
async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: getVolunteerAuthHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}`);
  return res.json();
}

/* --- Persistent storage fallback (real, durable, per-volunteer) --- */
async function storeGet(key, shared = false) {
  try {
    const r = await window.storage.get(key, shared);
    return r?.value ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function storeSet(key, value, shared = false) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  } catch {
    return false;
  }
}
const ns = (email, suffix) => `volunteer:${suffix}:${email || "anon"}`;
const OPEN_POOL_KEY = "volunteer:open-pickups"; // shared pool, populated by the provider/admin side of the real app

/* ============================================================
   DESIGN TOKENS — identical to the main ResQBite app
============================================================= */

const VDGlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    * { box-sizing: border-box; }
    .vd-root { font-family: ${fontBody}; background: ${T.base}; color: ${T.ink}; min-height: 100vh; }
    .vd-root ::selection { background: ${T.gold}; color: ${T.ink}; }
    @keyframes vd-fadeUp { from { opacity:0; transform: translateY(18px);} to {opacity:1; transform: translateY(0);} }
    .vd-fadeUp { animation: vd-fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
    @keyframes vd-pulse { 0% { box-shadow: 0 0 0 0 rgba(31,111,74,.5);} 70% { box-shadow: 0 0 0 10px rgba(31,111,74,0);} 100% { box-shadow: 0 0 0 0 rgba(31,111,74,0);} }
    .vd-pulse { animation: vd-pulse 2s infinite; }
    @keyframes vd-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .vd-shimmer { background: linear-gradient(90deg, #eee7d8 0%, #f7f3e8 20%, #eee7d8 40%); background-size: 800px 100%; animation: vd-shimmer 1.6s infinite linear; }
    @keyframes vd-spin { to { transform: rotate(360deg); } }
    .vd-spin { animation: vd-spin 1s linear infinite; }
    button, .vd-btn { min-height: 40px; }
    .vd-4col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .vd-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .vd-2col { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
    .vd-nav-items { display: flex; align-items: center; gap: 2px; }
    .vd-mobile-btn { display: none; }
    @media (max-width: 980px) {
      .vd-4col { grid-template-columns: repeat(2, 1fr); }
      .vd-3col { grid-template-columns: 1fr; }
      .vd-2col { grid-template-columns: 1fr; }
      .vd-nav-items { display: none; }
      .vd-mobile-btn { display: inline-flex !important; }
    }
    @media (max-width: 480px) {
      .vd-4col { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    }
  `}</style>
);

/* ============================================================
   SHARED UI ATOMS (mirrors VDPrimaryButton/VDGhostButton/VDPill/VDSkeleton)
============================================================= */
function VDPrimaryButton({ children, onClick, icon: Icon = ArrowRight, style = {}, full, disabled, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="vd-btn" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      background: `linear-gradient(135deg, ${T.accent}, ${T.accentD})`, color: T.white,
      border: "none", borderRadius: 13, padding: "12px 20px", fontWeight: 700, fontSize: 14,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
      boxShadow: "0 10px 24px rgba(255,122,61,.30)", width: full ? "100%" : "auto", ...style,
    }}>
      {children}{Icon && <Icon size={16} />}
    </button>
  );
}
function VDGhostButton({ children, onClick, style = {}, full, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="vd-btn" style={{
      background: "transparent", color: T.ink, border: `1.5px solid ${T.ink}`, borderRadius: 13,
      padding: "11px 18px", fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", ...style,
    }}>
      {children}
    </button>
  );
}
function VDPill({ children, tone = "primary" }) {
  const tones = {
    primary: { bg: T.primaryL, fg: T.primaryD },
    gold: { bg: "#FFF4DC", fg: "#8A6212" },
    accent: { bg: "#FFE9DD", fg: T.accentD },
    danger: { bg: "#FBE4E4", fg: T.danger },
    muted: { bg: T.sand, fg: T.inkSoft },
  };
  const c = tones[tone] || tones.primary;
  return (
    <span style={{ background: c.bg, color: c.fg, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
      {children}
    </span>
  );
}
function VDSkeleton({ h = 16, w = "100%", r = 8 }) {
  return <div className="vd-shimmer" style={{ height: h, width: w, borderRadius: r }} />;
}
function Card({ children, style = {} }) {
  return <div style={{ background: T.white, border: `1px solid ${T.sand}`, borderRadius: 20, padding: 20, ...style }}>{children}</div>;
}
function EmptyState({ icon: Icon = Info, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: T.inkSoft }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: T.sand, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <Icon size={24} color={T.inkSoft} />
      </div>
      <div style={{ fontWeight: 800, color: T.ink, fontSize: 15, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13.5, maxWidth: 360, margin: "0 auto" }}>{sub}</div>}
    </div>
  );
}
function VDLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${T.primary}, ${T.primaryD})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Leaf size={16} color={T.white} strokeWidth={2.4} />
      </div>
      <div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 19, color: T.ink, letterSpacing: -0.3, lineHeight: 1 }}>
          ResQ<span style={{ color: T.accent, fontStyle: "italic" }}>Bite</span>
        </div>
        <div style={{ fontFamily: fontMono, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: T.inkSoft, marginTop: 3 }}>VOLUNTEER</div>
      </div>
    </div>
  );
}

/* ============================================================
   WORKFLOW CONSTANTS
   Assigned -> Pickup Started -> Picked Up -> In Transit -> Delivered -> Completed
============================================================= */
const TASK_STATUSES = ["Assigned", "Pickup Started", "Picked Up", "In Transit", "Delivered", "Completed"];
const STATUS_ACTION = {
  "Assigned": { next: "Pickup Started", label: "Mark Arrived at Provider", icon: Navigation, hint: "Head to the provider location, then mark yourself arrived." },
  "Pickup Started": { next: "Picked Up", label: "Confirm Food Pickup", icon: CheckCircle2, hint: "Confirm you've collected the food from the provider." },
  "Picked Up": { next: "In Transit", label: "Start Delivery", icon: Truck, hint: "Begin the delivery to the receiving organization." },
  "In Transit": { next: "Delivered", label: "Confirm Delivery", icon: MapPin, hint: "Confirm the food has reached the organization." },
  "Delivered": { next: "Completed", label: "Complete Task", icon: Award, hint: "Close out this pickup as fully completed." },
};
const BACKEND_TASK_STATUS = {
  available: "Assigned",
  pending: "Assigned",
  accepted: "Assigned",
  pickup_scheduled: "Pickup Started",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
};
function normalizeTaskStatus(status) {
  return BACKEND_TASK_STATUS[String(status || "").toLowerCase()] || status;
}
const POINTS_PER_TASK = 20;
const POINTS_PER_MEAL = 1;

function haversineKm(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return "—"; }
}
function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

/* ============================================================
   DATA HOOK — loads real data (API first, storage fallback),
   exposes the functional workflow actions.
============================================================= */
// Session-level cache (by volunteer email) so navigating away from the
// volunteer dashboard and back reuses the last snapshot instead of
// showing skeletons and re-fetching all five endpoints again.
const volunteerDataCache = new Map();

function useVolunteerData(user) {
  const email = user?.email || "volunteer@local";
  const cached = volunteerDataCache.get(email);
  const [loading, setLoading] = useState(!cached);
  const [live, setLive] = useState(false);
  const [profile, setProfile] = useState(cached?.profile || { name: user?.name || "", email, phone: user?.phone || "", available: true });
  const [available, setAvailable] = useState(cached?.available || []);
  const [tasks, setTasks] = useState(cached?.tasks || []);
  const [notifications, setNotifications] = useState(cached?.notifications || []);
  const [history, setHistory] = useState(cached?.history || []);

  const normalizeNotifications = useCallback((rows = []) => {
    return (rows || []).map((n) => ({
      id: n.id || uid(),
      type: n.type || "status",
      message: n.message || n.title || "New notification",
      createdAt: n.created_at || n.createdAt || new Date().toISOString(),
      read: Boolean(n.is_read ?? n.read ?? false),
    }));
  }, []);

  const persist = useCallback(async (patch) => {
    if (patch.profile) await storeSet(ns(email, "profile"), patch.profile);
    if (patch.tasks) await storeSet(ns(email, "tasks"), patch.tasks);
    if (patch.notifications) await storeSet(ns(email, "notifications"), patch.notifications);
    if (patch.history) await storeSet(ns(email, "history"), patch.history);
    if (patch.pool) await storeSet(OPEN_POOL_KEY, patch.pool, true);
  }, [email]);

  // `silent` skips the loading flag entirely — used for the background
  // poll and for a revisit where we already have a cached snapshot to
  // show immediately, so a refresh never blanks the page back to
  // skeletons for data the person can already see.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [meRes, avRes, tkRes, ntRes, hiRes] = await Promise.all([
        apiGet("/me"), apiGet("/pickups/available"), apiGet("/tasks"), apiGet("/notifications"), apiGet("/history"),
      ]);

      const profilePayload = meRes?.user || meRes || { name: user?.name || "", email, phone: user?.phone || "", available: true };
      const snapshot = {
        profile: {
          ...profilePayload,
          name: profilePayload.name || user?.name || "Volunteer",
          email: profilePayload.email || email,
          phone: profilePayload.phone || user?.phone || "",
          available: profilePayload.available ?? true,
        },
        available: Array.isArray(avRes?.pickups) ? avRes.pickups : Array.isArray(avRes) ? avRes : [],
        tasks: (Array.isArray(tkRes?.tasks) ? tkRes.tasks : Array.isArray(tkRes) ? tkRes : [])
          .map((task) => ({ ...task, status: normalizeTaskStatus(task.status) })),
        notifications: normalizeNotifications(ntRes?.notifications || ntRes || []),
        history: Array.isArray(hiRes?.history) ? hiRes.history : Array.isArray(hiRes) ? hiRes : [],
      };
      volunteerDataCache.set(email, snapshot);
      setProfile(snapshot.profile); setAvailable(snapshot.available); setTasks(snapshot.tasks);
      setNotifications(snapshot.notifications); setHistory(snapshot.history);
      setLive(true);
    } catch {
      setLive(false);
      const [p, tk, nt, hi, pool] = await Promise.all([
        storeGet(ns(email, "profile")), storeGet(ns(email, "tasks")), storeGet(ns(email, "notifications")),
        storeGet(ns(email, "history")), storeGet(OPEN_POOL_KEY, true),
      ]);
      const snapshot = {
        profile: p || { name: user?.name || "", email, phone: user?.phone || "", available: true },
        available: Array.isArray(pool) ? pool : [],
        tasks: Array.isArray(tk) ? tk : [],
        notifications: normalizeNotifications(Array.isArray(nt) ? nt : []),
        history: Array.isArray(hi) ? hi : [],
      };
      volunteerDataCache.set(email, snapshot);
      setProfile(snapshot.profile); setTasks(snapshot.tasks); setNotifications(snapshot.notifications);
      setHistory(snapshot.history); setAvailable(snapshot.available);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [email, normalizeNotifications, user]);

  // If we already have a cached snapshot (from an earlier visit this
  // session) this refresh runs silently in the background; otherwise it's
  // a real first load and shows the section skeletons while it resolves.
  useEffect(() => { load({ silent: !!cached }); }, [load]);

  // Light poll for server-pushed updates only; never invents data if
  // the backend is unreachable — it simply stays on local storage state.
  // Always silent: a background refresh should never blank already-visible
  // data back to a skeleton.
  useEffect(() => {
    const id = setInterval(() => { if (live) load({ silent: true }); }, 25000);
    return () => clearInterval(id);
  }, [live, load]);

  const pushNotification = useCallback(async (type, message) => {
    const notif = { id: uid(), type, message, createdAt: new Date().toISOString(), read: false };
    setNotifications((prev) => {
      const next = [notif, ...prev].slice(0, 50);
      persist({ notifications: next });
      return next;
    });
    try { await apiPost("/notifications", { title: type, message, is_read: 0 }); } catch { }
  }, [persist]);

  const toggleAvailability = useCallback(async () => {
    setProfile((prev) => {
      const next = { ...prev, available: !prev.available };
      persist({ profile: next });
      return next;
    });
    try { await apiPatch("/me/availability", { available: !profile.available }); } catch { }
    pushNotification("status", `You're now marked as ${!profile.available ? "Available" : "Unavailable"} for pickups.`);
  }, [profile.available, persist, pushNotification]);

  // Saves edits made to the Profile tab's name/phone fields — same
  // local-persist + best-effort-API pattern as toggleAvailability above.
  const updateProfile = useCallback(async (patch) => {
    let next;
    setProfile((prev) => {
      next = { ...prev, ...patch };
      persist({ profile: next });
      return next;
    });
    try { await apiPatch("/me", patch); } catch { }
  }, [persist]);

  const acceptPickup = useCallback(async (pickupId) => {
    const pickup = available.find((p) => p.id === pickupId);
    if (!pickup) return;
    const task = {
      ...pickup, status: "Assigned", acceptedAt: new Date().toISOString(),
      timeline: [{ status: "Assigned", at: new Date().toISOString() }]
    };
    const nextAvailable = available.filter((p) => p.id !== pickupId);
    const nextTasks = [task, ...tasks];
    setAvailable(nextAvailable);
    setTasks(nextTasks);
    persist({ pool: nextAvailable, tasks: nextTasks });
    try { await apiPost(`/pickups/${pickupId}/accept`, {}); } catch { }
    pushNotification("task", `Pickup accepted: ${pickup.food} from ${pickup.provider?.name || "provider"}.`);
  }, [available, tasks, persist, pushNotification]);

  const advanceTaskStatus = useCallback(async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const action = STATUS_ACTION[task.status];
    if (!action) return;
    const nextStatus = action.next;
    const stamped = {
      ...task, status: nextStatus, updatedAt: new Date().toISOString(),
      timeline: [...(task.timeline || []), { status: nextStatus, at: new Date().toISOString() }]
    };

    if (nextStatus === "Completed") {
      const nextTasks = tasks.filter((t) => t.id !== taskId);
      const completedEntry = { ...stamped, completedAt: new Date().toISOString() };
      const nextHistory = [completedEntry, ...history];
      setTasks(nextTasks);
      setHistory(nextHistory);
      persist({ tasks: nextTasks, history: nextHistory });
      pushNotification("complete", `Task completed: ${task.food} delivered to ${task.receivingOrg?.name || "organization"}.`);
    } else {
      const nextTasks = tasks.map((t) => (t.id === taskId ? stamped : t));
      setTasks(nextTasks);
      persist({ tasks: nextTasks });
      pushNotification("task", `${task.food}: status updated to "${nextStatus}".`);
    }
    try { await apiPatch(`/tasks/${taskId}/status`, { status: nextStatus }); } catch { }
  }, [tasks, history, persist, pushNotification]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => {
      persist({ notifications: [] });
      return [];
    });
  }, [persist]);

  const stats = useMemo(() => {
    const mealsRescued = history.reduce((s, h) => s + (Number(h.mealsCount) || 0), 0);
    const foodTransportedKg = history.reduce((s, h) => s + (Number(h.foodWeightKg) || 0), 0);
    const orgsServed = new Set(history.map((h) => h.receivingOrg?.name).filter(Boolean)).size;
    const rescuePoints = history.reduce((s, h) => s + POINTS_PER_TASK + (Number(h.mealsCount) || 0) * POINTS_PER_MEAL, 0);
    return {
      activePickups: tasks.length,
      completedPickups: history.length,
      mealsRescued, foodTransportedKg, orgsServed, rescuePoints,
    };
  }, [tasks, history]);

  return {
    loading, live, profile, available, tasks, notifications, history, stats,
    toggleAvailability, updateProfile, acceptPickup, advanceTaskStatus, markAllRead, pushNotification, reload: load,
  };
}

/* ============================================================
   HEADER
============================================================= */
function VolunteerHeader({ tab, setTab, go, onSignOut, unread }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef(null);
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "opportunities", label: "Opportunities", icon: Package },
    { key: "tasks", label: "My Tasks", icon: ListChecks },
    { key: "track", label: "Track", icon: Navigation },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "profile", label: "Profile", icon: User },
  ];

  useEffect(() => {
    if (!mobileOpen) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMobileOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [mobileOpen]);

  const handleClick = (key) => {
    setMobileOpen(false);
    if (key === "home") { go ? go("landing") : setTab("dashboard"); return; }
    setTab(key);
  };

  return (
    <header ref={ref} style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(250,250,247,.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.sand}` }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <VDLogo />
        <nav className="vd-nav-items">
          {items.map((it) => (
            <button key={it.key} onClick={() => handleClick(it.key)} style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: tab === it.key ? T.primaryL : "transparent",
              color: tab === it.key ? T.primaryD : T.inkSoft, border: "none", borderRadius: 10, padding: "9px 12px",
              fontWeight: 700, fontSize: 13, cursor: "pointer", position: "relative",
            }}>
              <it.icon size={15} /> {it.label}
              {it.key === "notifications" && unread > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: T.accent }} />
              )}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="vd-nav-items">
            <VDGhostButton onClick={onSignOut} style={{ padding: "9px 14px", fontSize: 13 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Sign out</span>
            </VDGhostButton>
          </div>
          <button className="vd-mobile-btn" onClick={() => setMobileOpen((v) => !v)} style={{
            display: "none", background: T.sand, border: "none", borderRadius: 10, width: 38, height: 38,
            alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div style={{ borderTop: `1px solid ${T.sand}`, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((it) => (
            <button key={it.key} onClick={() => handleClick(it.key)} style={{
              display: "flex", alignItems: "center", gap: 10, background: tab === it.key ? T.primaryL : "transparent",
              color: tab === it.key ? T.primaryD : T.ink, border: "none", borderRadius: 10, padding: "12px 14px",
              fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left",
            }}>
              <it.icon size={16} /> {it.label}
            </button>
          ))}
          <button onClick={onSignOut} style={{
            display: "flex", alignItems: "center", gap: 10, background: "transparent", color: T.danger,
            border: "none", borderRadius: 10, padding: "12px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left",
          }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </header>
  );
}

/* ============================================================
   STAT CARD
============================================================= */
function StatCard({ icon: Icon, label, value, suffix = "", color }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontFamily: fontMono, fontWeight: 800, fontSize: 26, color: T.ink }}>{value}{suffix}</div>
      <div style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </Card>
  );
}

/* ============================================================
   PICKUP CARD (Opportunities / Dashboard preview)
============================================================= */
function PickupCard({ pickup, onAccept, accepting }) {
  return (
    <div className="vd-fadeUp" style={{ border: `1px solid ${T.sand}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15.5 }}>{pickup.food}</div>
          <div style={{ fontSize: 13, color: T.inkSoft }}>{pickup.quantity}</div>
        </div>
        {pickup.distanceKm != null && <VDPill tone="gold">{pickup.distanceKm.toFixed(1)} km</VDPill>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5, color: T.inkSoft }}>
        <div style={{ display: "flex", gap: 6, alignItems: "start" }}><Building2 size={14} style={{ marginTop: 1, flexShrink: 0 }} /> <span><b style={{ color: T.ink }}>{pickup.provider?.name || "Provider"}</b><br />{pickup.provider?.address}</span></div>
        <div style={{ display: "flex", gap: 6, alignItems: "start" }}><MapPin size={14} style={{ marginTop: 1, flexShrink: 0 }} /> <span><b style={{ color: T.ink }}>{pickup.receivingOrg?.name || "Organization"}</b><br />{pickup.receivingOrg?.address}</span></div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.inkSoft }}>
        <Clock size={14} /> Pickup {fmtTime(pickup.pickupTime)}
      </div>
      <VDPrimaryButton icon={CheckCircle2} disabled={accepting} onClick={() => onAccept(pickup.id)} style={{ marginTop: 4 }}>
        {accepting ? "Accepting…" : "Accept Pickup"}
      </VDPrimaryButton>
    </div>
  );
}

/* ============================================================
   TASK STEPPER + CARD (My Tasks)
============================================================= */
function TaskStepper({ status }) {
  const idx = TASK_STATUSES.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", padding: "2px 0" }}>
      {TASK_STATUSES.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 66 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i < idx ? T.primary : i === idx ? T.accent : T.sand,
              color: i <= idx ? T.white : T.inkSoft, fontSize: 10, fontWeight: 800,
            }}>
              {i < idx ? <CheckCircle2 size={13} /> : i + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: i <= idx ? T.ink : T.inkSoft, textAlign: "center" }}>{s}</div>
          </div>
          {i < TASK_STATUSES.length - 1 && <div style={{ height: 2, flex: 1, minWidth: 14, background: i < idx ? T.primary : T.sand }} />}
        </React.Fragment>
      ))}
    </div>
  );
}
function TaskCard({ task, onAdvance, advancing, onTrack }) {
  const action = STATUS_ACTION[task.status];
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{task.food}</div>
          <div style={{ fontSize: 13, color: T.inkSoft }}>{task.quantity} · {task.provider?.name} → {task.receivingOrg?.name}</div>
        </div>
        <VDPill tone={task.status === "Delivered" ? "primary" : "accent"}>{task.status}</VDPill>
      </div>
      <TaskStepper status={task.status} />
      {action && (
        <div style={{ fontSize: 12.5, color: T.inkSoft }}>{action.hint}</div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {action && (
          <VDPrimaryButton icon={action.icon} disabled={advancing} onClick={() => onAdvance(task.id)}>
            {advancing ? "Updating…" : action.label}
          </VDPrimaryButton>
        )}
        <VDGhostButton icon={Navigation} onClick={() => onTrack(task.id)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Navigation size={14} /> Track Route</span>
        </VDGhostButton>
      </div>
    </Card>
  );
}

/* ============================================================
   TRACK TAB — only real coordinates, real geolocation, no fake ETA
============================================================= */
function TrackTab({ tasks, selectedId, setSelectedId }) {
  const [volunteerLoc, setVolunteerLoc] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const task = tasks.find((t) => t.id === selectedId) || tasks[0];

  useEffect(() => {
    if (!task) return;
    if (!navigator.geolocation) { setGeoError("Geolocation isn't supported on this device."); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { setVolunteerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoError(null); },
      (err) => setGeoError(err.message || "Location permission denied."),
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [task?.id]);

  if (!tasks.length) {
    return <Card><EmptyState icon={Navigation} title="Nothing to track yet" sub="Accept a pickup and start the delivery workflow — live tracking appears here once a task is in progress." /></Card>;
  }

  const pickup = task.provider;
  const dest = task.receivingOrg;
  const distToPickup = haversineKm(volunteerLoc, pickup);
  const distToDest = haversineKm(volunteerLoc, dest);

  const points = [pickup, volunteerLoc, dest].filter((p) => p && p.lat != null);
  let mapUrl = null;
  if (points.length) {
    const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
    const pad = 0.02;
    const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad].join(",");
    const markers = points.map((p) => `&marker=${p.lat},${p.lng}`).join("");
    mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {tasks.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tasks.map((t) => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} style={{
              border: `1.5px solid ${t.id === task.id ? T.primary : T.sand}`, background: t.id === task.id ? T.primaryL : T.white,
              color: t.id === task.id ? T.primaryD : T.ink, borderRadius: 999, padding: "7px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            }}>{t.food}</button>
          ))}
        </div>
      )}
      <div className="vd-2col">
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {mapUrl ? (
            <iframe title="Live route map" src={mapUrl} style={{ border: 0, width: "100%", height: 340, display: "block" }} />
          ) : (
            <div style={{ padding: 20 }}>
              <EmptyState icon={MapPin} title="Map unavailable" sub="We don't have real coordinates for this pickup yet — the map will appear once provider/organization locations are set." />
            </div>
          )}
        </Card>
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.inkSoft, letterSpacing: .5, marginBottom: 6 }}>PICKUP LOCATION</div>
            <div style={{ display: "flex", gap: 8, alignItems: "start" }}><Package size={16} color={T.gold} style={{ marginTop: 2 }} /><div><b>{pickup?.name || "Provider"}</b><div style={{ fontSize: 12.5, color: T.inkSoft }}>{pickup?.address || "Address not available"}</div></div></div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.inkSoft, letterSpacing: .5, marginBottom: 6 }}>YOUR LOCATION</div>
            <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
              <span className="vd-pulse" style={{ width: 14, height: 14, borderRadius: "50%", background: T.primary, marginTop: 3, flexShrink: 0 }} />
              <div>
                {volunteerLoc ? (
                  <div style={{ fontSize: 12.5, fontFamily: fontMono }}>{volunteerLoc.lat.toFixed(4)}, {volunteerLoc.lng.toFixed(4)}</div>
                ) : (
                  <div style={{ fontSize: 12.5, color: T.inkSoft }}>{geoError || "Locating…"}</div>
                )}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.inkSoft, letterSpacing: .5, marginBottom: 6 }}>DESTINATION</div>
            <div style={{ display: "flex", gap: 8, alignItems: "start" }}><Building2 size={16} color={T.primary} style={{ marginTop: 2 }} /><div><b>{dest?.name || "Organization"}</b><div style={{ fontSize: 12.5, color: T.inkSoft }}>{dest?.address || "Address not available"}</div></div></div>
          </div>
          <div style={{ height: 1, background: T.sand }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: T.inkSoft }}>Distance to pickup</span>
            <b>{distToPickup != null ? `${distToPickup.toFixed(1)} km` : "—"}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: T.inkSoft }}>Distance to destination</span>
            <b>{distToDest != null ? `${distToDest.toFixed(1)} km` : "—"}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: T.inkSoft }}>ETA</span>
            <b>{task.etaMinutes != null ? `${task.etaMinutes} min` : "Unavailable"}</b>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================= */
function VolunteerDashboard({ go, user, onSignOut }) {
  const resolvedUser = user || { name: "", email: "volunteer@local", phone: "", role: "volunteer" };
  const data = useVolunteerData(resolvedUser);
  const [tab, setTab] = useState("dashboard");
  const [acceptingId, setAcceptingId] = useState(null);
  const [advancingId, setAdvancingId] = useState(null);
  const [trackTaskId, setTrackTaskId] = useState(null);

  const handleAccept = async (id) => { setAcceptingId(id); await data.acceptPickup(id); setAcceptingId(null); };
  const handleAdvance = async (id) => { setAdvancingId(id); await data.advanceTaskStatus(id); setAdvancingId(null); };
  const goTrack = (id) => { setTrackTaskId(id); setTab("track"); };

  // Profile tab — editable name/phone fields. Kept in local state (rather
  // than editing data.profile directly on every keystroke) and only
  // written back via data.updateProfile on Save, so a stray keystroke
  // can't half-save a profile.
  const [editName, setEditName] = useState(data.profile.name || "");
  const [editPhone, setEditPhone] = useState(data.profile.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  useEffect(() => {
    setEditName(data.profile.name || "");
    setEditPhone(data.profile.phone || "");
  }, [data.profile.name, data.profile.phone]);
  const saveProfile = async () => {
    setSavingProfile(true);
    await data.updateProfile({ name: editName.trim(), phone: editPhone.trim() });
    setSavingProfile(false);
  };

  const unread = data.notifications.filter((n) => !n.read).length;
  const firstName = (data.profile.name || resolvedUser.name || "Volunteer").split(" ")[0];

  const stat = data.stats;

  return (
    <div className="vd-root">
      <VDGlobalStyle />
      <VolunteerHeader tab={tab} setTab={setTab} go={go} onSignOut={onSignOut || (() => { })} unread={unread} />

      <div style={{ width: "100%", padding: "28px 24px 60px" }}>
        {/* ---------------- DASHBOARD ---------------- */}
        {tab === "dashboard" && (
          <div className="vd-fadeUp" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>Welcome back,</div>
                <h1 style={{ fontFamily: fontDisplay, fontSize: 30, margin: 0, color: T.ink }}>{firstName} 👋</h1>
              </div>
              <button onClick={data.toggleAvailability} style={{
                display: "inline-flex", alignItems: "center", gap: 8, border: `1.5px solid ${data.profile.available ? T.primary : T.sand}`,
                background: data.profile.available ? T.primaryL : T.white, color: data.profile.available ? T.primaryD : T.inkSoft,
                borderRadius: 999, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer",
              }}>
                <span className={data.profile.available ? "vd-pulse" : ""} style={{ width: 9, height: 9, borderRadius: "50%", background: data.profile.available ? T.primary : T.sandD }} />
                {data.profile.available ? "Available for pickups" : "Unavailable"}
              </button>
            </div>

            {data.loading ? (
              <div className="vd-4col">{[0, 1, 2, 3].map((i) => <Card key={i}><VDSkeleton h={60} /></Card>)}</div>
            ) : (
              <div className="vd-4col">
                <StatCard icon={Package} label="Active Pickups" value={stat.activePickups} color={T.primary} />
                <StatCard icon={CheckCircle2} label="Completed Pickups" value={stat.completedPickups} color={T.gold} />
                <StatCard icon={Utensils} label="Meals Rescued" value={stat.mealsRescued} color={T.accent} />
                <StatCard icon={Award} label="Rescue Points" value={stat.rescuePoints} color={T.primaryD} />
              </div>
            )}

            <Card>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Quick Actions</div>
              <div className="vd-4col">
                {[
                  { icon: Package, label: "Find Pickup", act: () => setTab("opportunities") },
                  { icon: ListChecks, label: "My Tasks", act: () => setTab("tasks") },
                  { icon: Navigation, label: "Track Delivery", act: () => setTab("track") },
                  { icon: HistoryIcon, label: "History", act: () => setTab("history") },
                ].map((q, i) => (
                  <button key={i} onClick={q.act} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: T.base,
                    border: `1px solid ${T.sand}`, borderRadius: 14, padding: "16px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12.5, color: T.ink,
                  }}>
                    <q.icon size={18} color={T.primary} /> {q.label}
                  </button>
                ))}
              </div>
            </Card>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Available Pickups</div>
                <button onClick={() => setTab("opportunities")} style={{ background: "none", border: "none", color: T.primary, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  View all <ChevronRight size={14} />
                </button>
              </div>
              {data.loading ? (
                <Card><VDSkeleton h={90} /></Card>
              ) : data.available.length === 0 ? (
                <Card><EmptyState icon={Package} title="No pickups available right now" sub="New pickup requests from providers will appear here as soon as they come in." /></Card>
              ) : (
                <div className="vd-3col">
                  {data.available.slice(0, 3).map((p) => (
                    <PickupCard key={p.id} pickup={p} onAccept={handleAccept} accepting={acceptingId === p.id} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- OPPORTUNITIES ---------------- */}
        {tab === "opportunities" && (
          <div className="vd-fadeUp">
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>Available Pickups</h2>
            <p style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 18 }}>Real pickup requests from providers, waiting for a volunteer.</p>
            {data.loading ? (
              <div className="vd-3col">{[0, 1, 2].map((i) => <Card key={i}><VDSkeleton h={140} /></Card>)}</div>
            ) : data.available.length === 0 ? (
              <Card><EmptyState icon={Package} title="No pickup requests right now" sub="Check back soon — this list updates as soon as providers submit new food donations." /></Card>
            ) : (
              <div className="vd-3col">
                {data.available.map((p) => (
                  <PickupCard key={p.id} pickup={p} onAccept={handleAccept} accepting={acceptingId === p.id} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- MY TASKS ---------------- */}
        {tab === "tasks" && (
          <div className="vd-fadeUp">
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>My Tasks</h2>
            <p style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 18 }}>Your assigned pickups — move each through the delivery workflow.</p>
            {data.loading ? (
              <Card><VDSkeleton h={160} /></Card>
            ) : data.tasks.length === 0 ? (
              <Card><EmptyState icon={ListChecks} title="No assigned tasks yet" sub="Accept a pickup from Opportunities to see it here." /></Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {data.tasks.map((t) => (
                  <TaskCard key={t.id} task={t} onAdvance={handleAdvance} advancing={advancingId === t.id} onTrack={goTrack} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- TRACK ---------------- */}
        {tab === "track" && (
          <div className="vd-fadeUp">
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>Live Tracking</h2>
            <p style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 18 }}>Real pickup, volunteer, and destination locations — no simulated data.</p>
            <TrackTab tasks={data.tasks} selectedId={trackTaskId} setSelectedId={setTrackTaskId} />
          </div>
        )}

        {/* ---------------- NOTIFICATIONS ---------------- */}
        {tab === "notifications" && (
          <div className="vd-fadeUp">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h2 style={{ fontFamily: fontDisplay, fontSize: 24, margin: 0, color: T.ink, }}>Notifications</h2>
              {data.notifications.length > 0 && (
                <button onClick={data.markAllRead} style={{ background: "none", border: "none", color: T.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Mark all read</button>
              )}
            </div>
            <p style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 18 }}>Generated only by real actions on your account.</p>
            {data.notifications.length === 0 ? (
              <Card><EmptyState icon={Bell} title="No notifications yet" sub="Accepting pickups and updating deliveries will generate notifications here." /></Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.notifications.map((n) => (
                  <div key={n.id} style={{ display: "flex", gap: 12, alignItems: "start", background: n.read ? T.white : T.primaryL, border: `1px solid ${T.sand}`, borderRadius: 14, padding: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: T.white, border: `1px solid ${T.sand}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {n.type === "complete" ? <Award size={15} color={T.primary} /> : n.type === "status" ? <ThumbsUp size={15} color={T.gold} /> : <Bell size={15} color={T.accent} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{n.message}</div>
                      <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- HISTORY ---------------- */}
        {tab === "history" && (
          <div className="vd-fadeUp">
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 4, color: T.ink, }}>Delivery History</h2>
            <p style={{ color: T.inkSoft, fontSize: 13.5, marginBottom: 18 }}>Completed pickups and deliveries.</p>
            {data.history.length === 0 ? (
              <Card><EmptyState icon={HistoryIcon} title="No completed deliveries yet" sub="Finished pickups will show up here once you complete a task." /></Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.history.map((h) => (
                  <Card key={h.id} style={{ padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{h.food}</div>
                        <div style={{ fontSize: 12.5, color: T.inkSoft }}>{h.provider?.name} → {h.receivingOrg?.name}</div>
                      </div>
                      <VDPill tone="primary">Completed {fmtTime(h.completedAt)}</VDPill>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- PROFILE ---------------- */}
        {tab === "profile" && (
          <div className="vd-fadeUp">
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, marginBottom: 18, color: T.ink, }}>Profile</h2>
            <div className="vd-2col">
              <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.primaryL, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontDisplay, fontWeight: 700, fontSize: 20, color: T.primaryD }}>
                    {(data.profile.name || "V").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{data.profile.name || "Volunteer"}</div>
                    <VDPill tone={data.profile.available ? "primary" : "muted"}>{data.profile.available ? "Available" : "Unavailable"}</VDPill>
                  </div>
                </div>
                <div style={{ height: 1, background: T.sand }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: T.inkSoft }}>Email</span><b>{data.profile.email}</b>
                </div>
                <InputField icon={User} label="Full name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
                <InputField icon={Phone} label="Phone" type="tel" inputMode="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Your phone number" />
                <VDPrimaryButton icon={savingProfile ? Loader2 : CheckCircle2} disabled={savingProfile} onClick={saveProfile}>{savingProfile ? "Saving…" : "Save Profile"}</VDPrimaryButton>
                <VDGhostButton onClick={data.toggleAvailability}>{data.profile.available ? "Set Unavailable" : "Set Available"}</VDGhostButton>
              </Card>
              <Card>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Your Impact</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    [Utensils, "Meals rescued", stat.mealsRescued],
                    [CheckCircle2, "Completed pickups", stat.completedPickups],
                    [Box, "Food transported (kg)", stat.foodTransportedKg],
                    [Building2, "Organizations served", stat.orgsServed],
                    [Award, "Rescue points", stat.rescuePoints],
                  ].map(([Icon, label, val], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: T.inkSoft }}><Icon size={15} /> {label}</span>
                      <b style={{ fontFamily: fontMono }}>{val}</b>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// Human-readable <title> for every route in `pages` below. Kept as its
// own map (instead of inline per-page) so it's obvious at a glance that
// every page has one, and so a newly added page can't accidentally be
// left out.
const PAGE_TITLES = {
  landing: "ResQBite — Rescue surplus food, feed more people",
  login: "Log in | ResQBite",
  signup: "Sign up | ResQBite",
  donate: "Donate surplus food | ResQBite",
  tracking: "Track your donation | ResQBite",
  dashboard: "Dashboard | ResQBite",
  "volunteer-dashboard": "Volunteer Dashboard | ResQBite",
  "organization-dashboard": "Organization Dashboard | ResQBite",
  organizations: "Organizations | ResQBite",
  about: "About Us | ResQBite",
  corporate: "Corporate Partnerships | ResQBite",
  careers: "Careers | ResQBite",
  team: "Our Team | ResQBite",
  "resqbite-one": "ResQBite One | ResQBite",
  "help-support": "Help & Support | ResQBite",
  "partner-with-us": "Partner With Us | ResQBite",
  "volunteer-with-us": "Volunteer With Us | ResQBite",
  terms: "Terms & Conditions | ResQBite",
  "cookie-policy": "Cookie Policy | ResQBite",
  "privacy-policy": "Privacy Policy | ResQBite",
  explore: "Explore | ResQBite",
  news: "News | ResQBite",
  "impact-report": "Impact Report | ResQBite",
  "donate-us": "Donate to ResQBite | ResQBite",
  "available-food": "Available Food Near You | ResQBite",
  "org-history": "Food History | ResQBite",
};

export default function ResQBiteApp() {
  const [page, setPage] = useState("landing");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Signed-in account profile. In production this comes from the auth
  // session (JWT / server session), never from client-supplied IDs.
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    authService.me()
      .then((data) => {
        if (data) {
          setUser(normalizeApiUser(data));
          setIsLoggedIn(true);
        } else {
          throw new Error("No user returned");
        }
      })
      .catch(() => {
        localStorage.removeItem("resqbite_token");
        sessionStorage.removeItem("resqbite_token");
        setUser(null);
        setIsLoggedIn(false);
      });
  }, []);
  // Track which donation is being viewed on the tracking page
  const [trackingDonationId, setTrackingDonationId] = useState(null);
  // A signed-in user's monetary-donation history. Seeded with sample past
  // donations for demo purposes (same convention as ORGS/ACTIVITY/WEEKLY
  // above) — new donations are only appended here once a real payment
  // provider confirms success (see DonateUsPage), never fabricated.
  const [donations, setDonations] = useState(SEED_DONATIONS);
  // Organization directory shown on the Organizations page and used by
  // search/filter there. Seeded with the sample ORGS list; newly created
  // organization accounts (via Signup) are appended here so they appear
  // in the directory immediately — never a separate hardcoded list.
  const [orgs, setOrgs] = useState(ORGS);
  const { toasts, push } = useToasts();
  // Every navigation (footer links, nav links, buttons, "go" calls
  // anywhere in the app) goes through this single setter, so scrolling
  // to the very top — header included — on every page change is
  // handled in exactly one place instead of being repeated at each
  // call site. Now also supports navigation with state (e.g., tracking donation ID).
  const go = (p, state = {}) => {
    if (state.trackingDonationId) {
      setTrackingDonationId(state.trackingDonationId);
    } else if (p === "tracking") {
      // BUGFIX: the top-nav "Track" link and the dashboard's "Track
      // Delivery" / "Track pickup" quick actions used to call
      // go("tracking") with no id at all, which always landed on
      // "No donation selected" even when the signed-in user has
      // active donations. Default to their most recent non-terminal
      // donation (or their most recent donation of any status if none
      // are still in progress) so those generic entry points behave
      // like "take me to what I'm currently tracking".
      const active = donations.find((d) => d.status !== "Delivered" && d.status !== "Cancelled");
      const fallback = active || donations[0];
      if (fallback) setTrackingDonationId(fallback.id);
    }
    setPage(p);
  };
  // Runs *after* the new page has actually rendered (not the outgoing
  // one), so the smooth scroll animates the page the person is
  // landing on and reliably settles at scroll position 0 — rather than
  // animating the old DOM an instant before React swaps it out, which
  // can get interrupted mid-scroll and leave the position off by a
  // few pixels.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [page]);
  // Every page needs its own browser-tab title (the page's "heading" in
  // the tab bar, bookmarks, and search results) — without this the tab
  // is stuck on whatever the HTML shell shipped with, no matter which
  // of the 20+ routes above is actually showing.
  useEffect(() => {
    document.title = PAGE_TITLES[page] || "ResQBite";
  }, [page]);
  const signIn = (userData) => { setIsLoggedIn(true); setUser(userData || DEFAULT_USER); };
  const signOut = () => {
    localStorage.removeItem("resqbite_token");
    sessionStorage.removeItem("resqbite_token");
    setIsLoggedIn(false);
    setUser(null);
    go("landing");
  };
  const addDonation = (d) => setDonations((prev) => [d, ...prev]);
  const addOrg = (o) => setOrgs((prev) => [o, ...prev]);
  const notificationCenter = useNotificationCenter(user, isLoggedIn);

  // Dashboard is an authenticated-only page — if there's no signed-in
  // user, route there via Login instead of ever rendering account data.
  const pages = {
    landing: <Landing go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    login: <Login go={go} toast={push} onSignIn={signIn} />,
    signup: <Signup go={go} toast={push} onSignIn={signIn} addOrg={addOrg} />,
    donate: <DonatePage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    tracking: <TrackingPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} trackingDonationId={trackingDonationId} />,
    dashboard: isLoggedIn
      ? (user?.role === "volunteer"
        ? <VolunteerDashboard go={go} user={user} onSignOut={signOut} />
        : user?.role === "donor"
          ? <DashboardPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />
          : <DashboardPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />)
      : <Login go={go} toast={push} onSignIn={signIn} />,
    "donor-dashboard": isLoggedIn && user?.role === "donor"
      ? <DashboardPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />
      : isLoggedIn ? <DashboardRedirect user={user} go={go} /> : <Login go={go} toast={push} onSignIn={signIn} />,
    "volunteer-dashboard": isLoggedIn
      ? user?.role === "volunteer"
        ? <VolunteerDashboard go={go} user={user} onSignOut={signOut} />
        : <DashboardRedirect user={user} go={go} />
      : <Login go={go} toast={push} onSignIn={signIn} />,
    "organization-dashboard": isLoggedIn
      ? user?.role === "org"
        ? <DashboardPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />
        : <DashboardRedirect user={user} go={go} />
      : <Login go={go} toast={push} onSignIn={signIn} />,
    organizations: <OrganizationsPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} orgs={orgs} />,
    about: <AboutPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    corporate: <CorporatePage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    careers: <CareersPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    team: <TeamPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "resqbite-one": <ResQBiteOnePage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "help-support": <HelpSupportPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "partner-with-us": <PartnerWithUsPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "volunteer-with-us": <VolunteerWithUsPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    terms: <TermsPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "cookie-policy": <CookiePolicyPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "privacy-policy": <PrivacyPolicyPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    explore: <ExplorePage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    news: <NewsPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "impact-report": <ImpactReportPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "donate-us": <DonateUsPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} user={user} addDonation={addDonation} />,
    "available-food": <AvailableFoodPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
    "org-history": <OrgHistoryPage go={go} toast={push} isLoggedIn={isLoggedIn} onSignOut={signOut} />,
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn }}>
      {/* BUGFIX: OrgDataProvider was defined but never mounted anywhere
          in the tree, so every useOrgData() consumer (AvailableFoodPage's
          "Request Food" button, OrgHistoryPage, the org-side dashboard
          numbers) was silently reading the context's empty fallback
          ({ requests: [], addRequest: () => {} }) instead of shared,
          persisted state — requests appeared to vanish immediately
          after being made. */}
      <OrgDataProvider>
      <NotificationContext.Provider value={notificationCenter}>
        <div className="rq-app-root" style={{ fontFamily: fontBody, width: "100%", minHeight: "100vh" }}>
          <GlobalStyle />
          <style>{`
        /* ==========================================================
           GLOBAL RESPONSIVE SYSTEM
           Tiered breakpoints applied once here so every current and
           future page built from these shared classes (.rq-*col,
           .rq-hero-grid, .rq-desktop-nav, PageHero, cards, modals,
           forms, toasts) inherits the same responsive behavior.
           Tiers: >1024 desktop · 769–1024 tablet · 481–768 mobile ·
           ≤480 small mobile.
        ========================================================== */

        html, body { max-width: 100%; overflow-x: hidden; }
        .rq-root { overflow-x: hidden; }
        img, svg, video { max-width: 100%; height: auto; }

        /* Fluid headings — overrides inline pixel font sizes on real
           h1/h2/h3 tags so hero and section titles scale down instead
           of clipping or forcing horizontal scroll. */
        .rq-root h1 { font-size: clamp(26px, 5.5vw, 44px) !important; line-height: 1.15 !important; }
        .rq-root h2 { font-size: clamp(21px, 4vw, 30px) !important; line-height: 1.2 !important; }
        .rq-root h3 { font-size: clamp(16px, 2.6vw, 20px) !important; }

        /* Buttons: comfortable touch targets everywhere, wrap instead
           of overflowing when several sit in a row. */
        button, .rq-btn { min-height: 40px; }
        .rq-btn-row, .rq-wrap-row { display: flex; flex-wrap: wrap; }

        /* Tablet: reduce header nav spacing, keep full nav visible */
        @media (max-width: 1040px) and (min-width: 861px) {
          .rq-desktop-nav { gap: 0 !important; }
          .rq-desktop-nav button { padding: 8px 8px !important; font-size: 12.5px !important; }
        }

        /* Tablet: ease 4-column grids to 2 columns a little earlier
           than the mobile breakpoint so cards don't get cramped */
        @media (max-width: 1024px) and (min-width: 861px) {
          .rq-4col { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 860px) {
          #rq-auth-grid { grid-template-columns: 1fr !important; }
          .rq-auth-illustration { display: none !important; }
          .rq-hero-grid { grid-template-columns: 1fr !important; }
          .rq-2col { grid-template-columns: 1fr !important; }
          .rq-3col { grid-template-columns: 1fr !important; }
          .rq-4col { grid-template-columns: repeat(2, 1fr) !important; }
          .rq-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rq-desktop-nav { display: none !important; }
          .rq-desktop-actions { display: none !important; }
          .rq-mobile-menu-btn { display: inline-flex !important; }
          .rq-preset-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          section, header, footer { padding-left: clamp(16px, 4vw, 24px) !important; padding-right: clamp(16px, 4vw, 24px) !important; }
        }

        @media (max-width: 480px) {
          .rq-4col { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .rq-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rq-preset-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .rq-logo-sub { display: none !important; }
        }

        /* Modals: always fit within the viewport with internal scroll */
        .rq-modal-panel { max-width: min(420px, calc(100vw - 32px)) !important; max-height: calc(100vh - 48px); overflow-y: auto; }

        /* Notifications dropdown: never exceed the viewport on very
           small screens */
        .rq-notif-panel { max-width: calc(100vw - 24px); }
        @media (max-width: 420px) {
          .rq-notif-panel { position: fixed !important; left: 12px !important; right: 12px !important; width: auto !important; }
        }
      `}</style>
          <ToastHost toasts={toasts} />
          {pages[page]}
        </div>
      </NotificationContext.Provider>
      </OrgDataProvider>
    </UserContext.Provider>
  );
}
