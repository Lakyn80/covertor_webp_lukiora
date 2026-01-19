import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import AuthPanel from "./AuthPanel";
import { AUTH_TRANSLATIONS, DEFAULT_KEYWORDS, FALLBACK_TEXTS, LANGUAGE_ORDER, TRANSLATIONS } from "../language/translations";

const ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,.gif";
const FREE_LIMIT = 3;

// API base is configurable
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof window !== "undefined" && window.__API_BASE__) ||
  "/api";



function userHasActivePlan(user) {
  if (!user || !user.plan_expires_at) return false;
  try {
    return new Date(user.plan_expires_at) > new Date();
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

function parseDownloadName(res, fallback = "converted.webp") {
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename\*?=([^;]+)/i);
  if (!m) return fallback;
  let v = m[1].trim();
  v = v.replace(/^filename\*?=/i, "").replace(/^["']|["']$/g, "");
  try {
    if (v.includes("''")) {
      const [, enc] = v.split("''");
      return decodeURIComponent(enc);
    }
    return v;
  } catch { return fallback; }
}

function fileStem(name) {
  const parts = (name || "").split(".");
  if (parts.length <= 1) return name || "converted";
  return parts.slice(0, -1).join(".") || "converted";
}

function getInitialLang() {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("webpify_lang");
    if (saved && TRANSLATIONS[saved]) return saved;
  }
  if (typeof navigator !== "undefined") {
    const base = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
    if (base && TRANSLATIONS[base]) return base;
  }
  return "en";
}

export default function Webpify() {
  const [authToken, setAuthToken] = useState(() => {
    if (typeof localStorage === "undefined") return "";
    return localStorage.getItem("webpify_token") || "";
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [planActive, setPlanActive] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [items, setItems] = useState([]); // {id, file, size, type, name, status, outBlob, outName, error}
  const [quality, setQuality] = useState(72);
  const [maxWidth, setMaxWidth] = useState(1200);
  const [concurrency, setConcurrency] = useState(4);
  const [running, setRunning] = useState(false);
  const [lang, setLang] = useState(() => getInitialLang());
  const [anonUsed, setAnonUsed] = useState(0);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installState, setInstallState] = useState("idle"); // idle | ready | installing | installed

  const total = items.length;
  const done = items.filter(i => i.status === "done").length;
  const failed = items.filter(i => i.status === "error").length;
  const inProgress = items.filter(i => i.status === "processing").length;
  const isUnlimited = useMemo(() => planActive || (currentUser && currentUser.is_vip), [planActive, currentUser]);
  const handleAuthChange = useCallback((payload) => {
    const token = (payload && payload.token) || "";
    const user = payload && payload.user ? payload.user : null;
    const active = typeof payload?.planActive === "boolean" ? payload.planActive : userHasActivePlan(user);
    setAuthToken(token);
    setCurrentUser(user);
    setPlanActive(active);
    if (user) {
      setAnonUsed(0); // reset anonymous counter once user logs in
    }
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem("webpify_token", token);
      } else {
        localStorage.removeItem("webpify_token");
      }
    }
  }, []);

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      setPlanActive(false);
      return;
    }
    const controller = new AbortController();
    const fetchMe = async () => {
      setAuthLoading(true);
      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        });
        if (!res.ok && [401, 404].includes(res.status)) {
          handleAuthChange({ token: "" });
          return;
        }
        if (!res.ok) {
          return; // keep token on transient errors (502 etc.)
        }
        const data = await res.json().catch(() => ({}));
        if (data.user) {
          handleAuthChange({ token: authToken, user: data.user, planActive: data.plan_active });
        }
      } catch {
        // ignore
      } finally {
        setAuthLoading(false);
      }
    };
    fetchMe();
    return () => controller.abort();
  }, [authToken, handleAuthChange]);

  // Periodic revalidation to auto-logout if user/token becomes invalid (e.g., account deleted)
  useEffect(() => {
    if (!authToken) return;
    let intervalId;

    const revalidate = async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.status === 401 || res.status === 404) {
          handleAuthChange({ token: "" });
          return;
        }
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (data.user) {
          handleAuthChange({ token: authToken, user: data.user, planActive: data.plan_active });
        }
      } catch {
        // ignore
      }
    };

    intervalId = setInterval(revalidate, 60_000);

    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        revalidate();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [authToken, handleAuthChange]);

  const t = useMemo(() => {
    const base = TRANSLATIONS[lang] || TRANSLATIONS.en || {};
    const auth = AUTH_TRANSLATIONS[lang] || AUTH_TRANSLATIONS.en || {};
    return {
      ...FALLBACK_TEXTS,
      ...base,
      auth,
      seoTitle: base.seoTitle || `Webpify Batch – ${base.convertAll || FALLBACK_TEXTS.convertAll}`,
      seoDescription: base.seoDescription || base.subtitle || FALLBACK_TEXTS.seoDescription,
      seoKeywords: base.seoKeywords || FALLBACK_TEXTS.seoKeywords || DEFAULT_KEYWORDS,
    };
  }, [lang]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setPropertyMeta = (property, content) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    document.title = t.seoTitle;
    const desc = t.seoDescription || FALLBACK_TEXTS.seoDescription || FALLBACK_TEXTS.subtitle;
    setMeta("description", desc);
    const keywords = Array.isArray(t.seoKeywords) ? t.seoKeywords.join(", ") : (t.seoKeywords || DEFAULT_KEYWORDS);
    setMeta("keywords", keywords);
    setMeta("theme-color", "#0b1024");
    setPropertyMeta("og:title", t.seoTitle);
    setPropertyMeta("og:description", desc);
    setPropertyMeta("og:type", "website");
    setPropertyMeta("og:locale", lang);
    document.documentElement.lang = lang;
  }, [t, lang]);

  const overallPct = useMemo(() => {
    if (!total) return 0;
    const finished = done + failed;
    return Math.round((finished / total) * 100);
  }, [total, done, failed]);

  const addFiles = useCallback((files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    setItems(prev => {
      const activeCount = prev.filter(p => ["pending", "waiting", "processing"].includes(p.status)).length;
      const capacity = isUnlimited ? arr.length : Math.max(0, FREE_LIMIT - activeCount);
      const trimmed = capacity < arr.length ? arr.slice(0, capacity) : arr;
      if (!isUnlimited && trimmed.length === 0) {
        window.alert("Najednou můžeš konvertovat maximálně 3 fotky. Spusť konverzi a pak přidej další.");
        return prev;
      }

      const existingNames = new Set(prev.map(p => p.name + ":" + p.size));

      const toAdd = trimmed
        .filter(f => !existingNames.has(f.name + ":" + f.size))
        .map((f, idx) => ({
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          size: f.size,
          type: f.type || "",
          name: f.name || `image_${idx}`,
          status: "pending", // pending | waiting | processing | done | error
          outBlob: null,
          outName: "",
          error: "",
        }));
      return [...prev, ...toAdd];
    });
  }, [isUnlimited]);

  const onPick = useCallback((e) => {
    addFiles(e.target.files);
    e.target.value = ""; // allow picking the same files again
  }, [addFiles]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const canInstall = installState === "ready" && !!installPrompt;

  async function triggerInstall() {
    if (!installPrompt) {
      return;
    }
    setInstallState("installing");
    installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" }));
    setInstallState(choice && choice.outcome === "accepted" ? "installed" : "ready");
    setInstallPrompt(null);
  }

  function resetAll() {
    setItems([]);
  }

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function clearCompleted() {
    setItems(prev => prev.filter(i => i.status !== "done"));
  }

  async function convertOne(item, opts) {
    const { quality, maxWidth } = opts;
    const fd = new FormData();
    fd.append("image", item.file);
    fd.append("quality", String(quality));
    if (maxWidth) fd.append("max_width", String(maxWidth));

    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const res = await fetch(`${API_BASE}/convert`, { method: "POST", body: fd, headers });
    if (res.status === 401) {
      throw new Error(t.needLoginConvert || FALLBACK_TEXTS.needLoginConvert);
    }
    if (res.status === 402) {
      const data = await res.json().catch(() => ({}));
      if (data.code === "free_limit_reached") {
        throw new Error(t.freeLimitReached || FALLBACK_TEXTS.freeLimitReached);
      }
      throw new Error(t.membershipRequired || FALLBACK_TEXTS.membershipRequired);
    }
    if (!res.ok) {
      const tx = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${tx || "Conversion failed"}`);
    }
    const blob = await res.blob();
    const name = parseDownloadName(res, fileStem(item.name) + ".webp");
    if (!planActive && !(currentUser && currentUser.is_vip)) {
      if (authToken) {
        setCurrentUser(prev => prev ? { ...prev, conversions_used: (prev.conversions_used || 0) + 1 } : prev);
      } else {
        setAnonUsed(prev => prev + 1);
      }
    }
    return { blob, name };
  }

  async function runQueue() {
    if (!items.length) return;
    setRunning(true);

    setItems(prev => prev.map(i => i.status === "pending" ? { ...i, status: "waiting" } : i));

    const opts = { quality, maxWidth };
    const queue = [...items].filter(i => i.status === "waiting" || i.status === "pending");
    let idx = 0;
    const limit = Math.max(1, Math.min(concurrency, 12));

    async function worker() {
      while (true) {
        let myIndex = idx; idx++;
        if (myIndex >= queue.length) return;

        const item = queue[myIndex];
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "processing", error: "" } : i));

        try {
          const { blob, name } = await convertOne(item, opts);
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "done", outBlob: blob, outName: name } : i));
        } catch (e) {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: e.message || String(e) } : i));
        }
      }
    }

    const workers = Array.from({ length: limit }, () => worker());
    await Promise.allSettled(workers);
    setRunning(false);
  }

  async function downloadAllZip() {
    const zip = new JSZip();
    const doneItems = items.filter(i => i.status === "done" && i.outBlob);
    if (!doneItems.length) return;
    for (const it of doneItems) {
      const arrBuf = await it.outBlob.arrayBuffer();
      zip.file(it.outName || (fileStem(it.name) + ".webp"), arrBuf);
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `webpify_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.zip`);
  }

  React.useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("webpify_lang", lang);
    }
  }, [lang]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator?.standalone;
      if (standalone) {
        setInstallState("installed");
      }
    }
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setInstallState("ready");
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setInstallState("installed");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onClickOutside = (e) => {
      if (!langMenuRef.current) return;
      if (!langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1024] via-[#0a0d1a] to-[#1b0b36] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-['Space_Grotesk']">{t.heroTitle}</h1>
            <p className="text-slate-300 mt-2">{t.subtitle}</p>
            {t.shortDescription && (
              <p className="text-slate-300 mt-2">{t.shortDescription}</p>
            )}
          </div>
          <div className="flex items-start gap-3 sm:items-center">
            <button
              type="button"
              onClick={triggerInstall}
              disabled={!canInstall || installState === "installing" || installState === "installed"}
              title={!canInstall && installState !== "installed" ? t.installUnavailable : ""}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                installState === "installed"
                  ? "border-emerald-400/40 bg-emerald-900/30 text-emerald-200"
                  : canInstall
                    ? "border-slate-600 bg-slate-900/70 text-slate-200 hover:bg-slate-900"
                    : "border-slate-800 bg-slate-950/60 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-violet-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 3v13m0 0 4-4m-4 4-4-4" />
                  <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
                </svg>
              </span>
              <span>
                {installState === "installed"
                  ? t.installInstalled
                  : installState === "installing"
                    ? t.installInstalling
                    : canInstall
                      ? t.installApp
                      : t.installUnavailable}
              </span>
            </button>
            <div ref={langMenuRef} className="relative self-start">
              <button
                type="button"
                onClick={() => setLangMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm hover:bg-slate-900 transition"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-violet-300">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
                    <path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18 0 0 0-18 0-18Zm0 0C9.5 5.5 9.5 18.5 12 21" />
                  </svg>
                </span>
                <span>{`${t.languageLabel}: ${t.label}`}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 shadow-lg backdrop-blur">
                  {LANGUAGE_ORDER.map((code) => {
                    const langDef = TRANSLATIONS[code];
                    if (!langDef) return null;
                    const isActive = code === lang;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => { setLang(code); setLangMenuOpen(false); }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                          isActive ? "bg-slate-800 text-slate-100 font-semibold" : "hover:bg-slate-800/60 text-slate-200"
                        }`}
                      >
                        <span>{langDef.label}</span>
                        {isActive && <span className="text-violet-300">*</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        <AuthPanel
          apiBase={API_BASE}
          authToken={authToken}
          currentUser={currentUser}
          planActive={planActive}
          onAuthChange={handleAuthChange}
          t={t}
        />

        {/* Upload */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed rounded-2xl p-8 bg-slate-900/60 border-slate-700/80 hover:border-violet-400 transition"
        >
          <div className="flex flex-col items-center gap-3">
            <label className="px-4 py-2 rounded-full bg-violet-600 text-white font-semibold cursor-pointer hover:bg-violet-500 transition">
              {t.chooseFiles}
              <input
                type="file"
                accept={ACCEPT}
                multiple
                onChange={onPick}
                className="hidden"
              />
            </label>
            <p className="text-sm text-slate-300">{t.dropHint}</p>
          </div>
        </div>

        {/* Options */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 shadow border border-slate-800">
            <label className="text-sm font-semibold text-slate-200">{t.qualityLabel}</label>
            <input
              type="range"
              min={40}
              max={95}
              step={1}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full mt-2"
            />
            <div className="text-xs text-slate-400">{t.qualityValue(quality)}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 shadow border border-slate-800">
            <label className="text-sm font-semibold text-slate-200">{t.maxWidthLabel}</label>
            <input
              type="number"
              min={0}
              step={10}
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950/50 px-2 py-1 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={t.maxWidthPlaceholder}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 shadow border border-slate-800">
            <label className="text-sm font-semibold text-slate-200">{t.concurrencyLabel}</label>
            <input
              type="number"
              min={1}
              max={12}
              value={concurrency}
              onChange={(e) => setConcurrency(Math.max(1, Math.min(12, Number(e.target.value))))}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950/50 px-2 py-1 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="text-xs text-slate-400">{t.concurrencyHint}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 shadow border border-slate-800">
            <div className="text-sm font-semibold mb-2 text-slate-200">{t.actionsTitle}</div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!items.length || running}
                onClick={runQueue}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                  !items.length || running
                    ? "bg-slate-700/60 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-500"
                }`}
              >
                {running ? t.converting : t.convertAll}
              </button>

              <button
                disabled={!items.some(i => i.status === "done")}
                onClick={downloadAllZip}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                  items.some(i => i.status === "done") ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-900/40 cursor-not-allowed"
                }`}
              >
                {t.downloadAll}
              </button>

              <button
                disabled={!items.length || running}
                onClick={resetAll}
                className="px-4 py-2 rounded-lg font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
              >
                {t.resetList}
              </button>

              <button
                disabled={!items.some(i => i.status === "done")}
                onClick={clearCompleted}
                className="px-4 py-2 rounded-lg font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
              >
                {t.clearDone}
              </button>
            </div>

            {!isUnlimited && (
              <div className="mt-2 text-xs text-slate-400">
                Najednou můžeš konvertovat maximálně 3 fotky. Po dokončení můžeš přidat další.
              </div>
            )}

            {!!items.length && (
              <div className="mt-3 text-sm text-slate-200">
                {t.status(done, total, failed, inProgress)}
                <div className="mt-2 h-2 bg-slate-800 rounded">
                  <div
                    className="h-2 bg-violet-500 rounded transition-all"
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List */}
        <div className="mt-6">
          {!items.length ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
              {t.emptyState}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map(it => (
                <div key={it.id} className="p-4 rounded-xl bg-slate-900/70 shadow border border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold break-all">{it.name}</div>
                      <div className="text-xs text-slate-400">
                        {formatBytes(it.size)} {it.type && `| ${it.type}`}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {it.status === "done" && it.outBlob && (
                        <a
                          href={URL.createObjectURL(it.outBlob)}
                          download={it.outName || fileStem(it.name) + ".webp"}
                          className="px-3 py-1 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition"
                          onClick={(e) => {
                            const url = e.currentTarget.getAttribute("href");
                            setTimeout(() => URL.revokeObjectURL(url), 15000);
                          }}
                        >
                          {t.download}
                        </a>
                      )}
                      <button
                        onClick={() => removeItem(it.id)}
                        className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
                        disabled={running && (it.status === "processing")}
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-sm">
                    {it.status === "pending" && <span className="text-slate-400">{t.pending}</span>}
                    {it.status === "waiting" && <span className="text-slate-400">{t.waiting}</span>}
                    {it.status === "processing" && <span className="text-slate-400">{t.processing}</span>}
                    {it.status === "done" && it.outBlob && (
                      <span className="text-emerald-300">
                        {t.done(formatBytes(it.outBlob.size), (it.outName || "converted.webp"))}
                      </span>
                    )}
                    {it.status === "error" && (
                      <span className="text-rose-300">{t.error(it.error)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
