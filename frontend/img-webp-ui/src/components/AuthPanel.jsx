import React, { useEffect, useMemo, useState } from "react";

function isPlanActive(user) {
  if (!user || !user.plan_expires_at) return false;
  try {
    return new Date(user.plan_expires_at) > new Date();
  } catch {
    return false;
  }
}

const FREE_LIMIT = 3;
const DEFAULT_AUTH_TEXTS = {
  membershipTitle: "Membership",
  membershipSubtitle: "3 images free. Then optional monthly membership.",
  notLogged: "Not logged in",
  statusActive: "Membership active",
  statusInactive: "Expired / inactive",
  expiry: "Expires:",
  vip: "VIP unlimited",
  freeLeft: (left, total) => `Free left: ${left} / ${total}`,
  loginTab: "Login",
  registerTab: "Register",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  password: "Password",
  submitLogin: "Log in",
  submitRegister: "Sign up",
  loginSuccess: "Login successful.",
  registerSuccess: "Registration successful.",
  loading: "Processing...",
  logout: "Log out",
  needLogin: "Log in first.",
  activationError: "Activation failed",
  activationSuccess: "Access activated.",
  purchaseTitle: "Buy access (Buy Me a Coffee)",
  mustLoginLinks: "Log in to see membership links.",
  dailyAccess: "Daily access",
  monthlyAccess: "Monthly access",
  profileCta:
    "Visit full profile and give a like/coffee on Buy Me a Coffee. Membership activation links work after login.",
  loginBeforeWidget: "Log in or register before activating membership via the widget.",
  supportNote: "Activation happens automatically after payment. If it doesn't show in 1–2 minutes, contact support",
  supportEmail: "service@lukiora.com",
};

export default function AuthPanel({
  apiBase,
  authToken,
  currentUser,
  planActive,
  onAuthChange,
  t,
}) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [widgetBooted, setWidgetBooted] = useState(false);
  const tr = useMemo(() => ({ ...DEFAULT_AUTH_TEXTS, ...(t?.auth || {}) }), [t]);

  const monthlyUrl = import.meta.env.VITE_BMC_MONTHLY_URL || "https://www.buymeacoffee.com/lukiora";
  const bmcWidgetConfig = useMemo(
    () => ({
      id: import.meta.env.VITE_BMC_ID || "lukiora",
      description: import.meta.env.VITE_BMC_DESCRIPTION || "Support me on Buy me a coffee!",
      message: import.meta.env.VITE_BMC_MESSAGE || "Webpify Batch saves time and storage. Support the project and help us build better image tools.",
      color: import.meta.env.VITE_BMC_COLOR || "#7c3aed",
      position: import.meta.env.VITE_BMC_POSITION || "Right",
      xMargin: import.meta.env.VITE_BMC_X_MARGIN || "18",
      yMargin: import.meta.env.VITE_BMC_Y_MARGIN || "18",
    }),
    []
  );

  const ensureBmcWidget = () => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const buttons = Array.from(document.querySelectorAll('[id^="bmc-wbtn"]'));
    if (buttons.length > 1) {
      buttons.slice(1).forEach((btn) => btn.remove());
    }
    if (buttons.length === 0 && !window.__bmcWidgetInitRequested) {
      const script = document.querySelector('script[data-name="BMC-Widget"]');
      const scriptReady = !!window.__bmcWidgetScriptLoaded
        || script?.dataset?.loaded === "true"
        || script?.readyState === "complete"
        || script?.readyState === "loaded";
      if (scriptReady) {
        window.__bmcWidgetInitRequested = true;
        window.dispatchEvent(new Event("DOMContentLoaded"));
      }
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-name="BMC-Widget"]')) {
      setWidgetBooted(true);
      ensureBmcWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
    script.dataset.name = "BMC-Widget";
    script.dataset.cfasync = "false";
    script.dataset.id = bmcWidgetConfig.id;
    script.dataset.description = bmcWidgetConfig.description;
    script.dataset.message = bmcWidgetConfig.message;
    script.dataset.color = bmcWidgetConfig.color;
    script.dataset.position = bmcWidgetConfig.position;
    script.dataset.x_margin = String(bmcWidgetConfig.xMargin);
    script.dataset.y_margin = String(bmcWidgetConfig.yMargin);
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      window.__bmcWidgetScriptLoaded = true;
      // Widget script initializes on DOMContentLoaded. When injected in SPA after load, trigger once if needed.
      setWidgetBooted(true);
      ensureBmcWidget();
      setTimeout(() => {
        ensureBmcWidget();
      }, 300);
    };

    document.body.appendChild(script);
  }, [bmcWidgetConfig]);

  const active = useMemo(() => {
    if (typeof planActive === "boolean") return planActive;
    return isPlanActive(currentUser);
  }, [planActive, currentUser]);

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function persistAuth(token, user, planActive) {
    if (typeof localStorage !== "undefined") {
      if (token) {
        localStorage.setItem("webpify_token", token);
      } else {
        localStorage.removeItem("webpify_token");
      }
    }
    onAuthChange({
      token,
      user,
      planActive: typeof planActive === "boolean" ? planActive : isPlanActive(user),
    });
  }

  async function submitAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name };

      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Auth failed");
      }
      persistAuth(data.token, data.user, data.plan_active);
      setMessage(mode === "login" ? tr.loginSuccess : tr.registerSuccess);
    } catch (err) {
      setError(err.message || tr.activationError);
    } finally {
      setLoading(false);
    }
  }

  async function activate(plan) {
    if (!authToken) {
      setError(tr.needLogin);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiBase}/activate-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || tr.activationError);
      }
      persistAuth(data.token, data.user, data.plan_active);
      setMessage(tr.activationSuccess);
    } catch (err) {
      setError(err.message || tr.activationError);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setForm({ first_name: "", last_name: "", email: "", password: "" });
    setMessage("");
    setError("");
    persistAuth("", null, false);
  }

  function openBmcWidget(fallbackUrl, retries = 2) {
    if (typeof document !== "undefined") {
      if (widgetBooted) {
        ensureBmcWidget();
      }
      const btn = document.querySelector('[id^="bmc-wbtn"]');
      if (btn) {
        btn.click();
        return;
      }
      if (retries > 0) {
        setTimeout(() => openBmcWidget(fallbackUrl, retries - 1), 250);
        return;
      }
    }
    if (fallbackUrl && typeof window !== "undefined") {
      window.open(fallbackUrl, "_blank", "noreferrer");
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 font-['Space_Grotesk']">{tr.membershipTitle}</h2>
          <p className="text-sm text-slate-300">{tr.membershipSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
          {currentUser ? (
            <>
              <span className="rounded-full bg-slate-800/70 px-3 py-1 font-semibold text-slate-200 border border-slate-700">
                {currentUser.email}
              </span>
              <span className={`rounded-full px-3 py-1 font-semibold border ${active ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" : "bg-amber-500/15 text-amber-200 border-amber-500/30"}`}>
                {active ? tr.statusActive : tr.statusInactive}
              </span>
              {currentUser.plan_expires_at && (
                <span className="rounded-full bg-slate-900/60 px-3 py-1 text-slate-300 border border-slate-700">
                  {tr.expiry} {new Date(currentUser.plan_expires_at).toLocaleString()}
                </span>
              )}
              {currentUser.is_vip && (
                <span className="rounded-full bg-violet-500/15 px-3 py-1 font-semibold text-violet-200 border border-violet-500/30">
                  {tr.vip}
                </span>
              )}
              {!active && !currentUser.is_vip && (
                <span className="rounded-full bg-slate-900/60 px-3 py-1 text-slate-300 border border-slate-700">
                  {tr.freeLeft(Math.max(0, FREE_LIMIT - (currentUser.conversions_used || 0)), FREE_LIMIT)}
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                {tr.logout}
              </button>
            </>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 font-semibold text-amber-200 border border-amber-500/30">
              {tr.notLogged}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {!currentUser && (
          <form onSubmit={submitAuth} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${mode === "login" ? "bg-violet-600 text-white border-violet-500/60" : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"}`}
              >
                {tr.loginTab}
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${mode === "register" ? "bg-violet-600 text-white border-violet-500/60" : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"}`}
              >
                {tr.registerTab}
              </button>
            </div>

            {mode === "register" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  className="rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={tr.firstName}
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  autoComplete="given-name"
                />
                <input
                  type="text"
                  className="rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={tr.lastName}
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            )}

            <input
              type="email"
              className="rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={tr.email}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              className="rounded border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={tr.password}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white shadow hover:bg-violet-500 transition disabled:opacity-60"
            >
              {loading ? tr.loading : mode === "login" ? tr.submitLogin : tr.submitRegister}
            </button>
            {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{error}</div>}
            {message && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{message}</div>}
          </form>
        )}

        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-slate-100 font-['Space_Grotesk']">{tr.purchaseTitle}</span>
            {currentUser ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={monthlyUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    openBmcWidget(monthlyUrl);
                  }}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-violet-600 px-3 py-1 text-sm font-semibold text-white hover:bg-violet-500 transition"
                >
                  {tr.monthlyAccess}
                </a>
              </div>
            ) : (
              <div className="text-sm text-slate-300">
                {tr.mustLoginLinks}
              </div>
            )}
          </div>
          <p className="text-sm text-slate-300">{tr.profileCta}</p>
          {!currentUser && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
              {tr.loginBeforeWidget}
            </div>
          )}
          <div className="flex justify-start">
            <a href="https://www.buymeacoffee.com/lukiora" target="_blank" rel="noreferrer">
              <img className="rounded-lg shadow-md shadow-black/30" src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=lukiora&button_colour=5F7FFF&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00" alt="Buy Me a Coffee" />
            </a>
          </div>
          <p className="text-sm text-slate-300">
            {tr.supportNote}{" "}
            <a className="text-violet-300 underline hover:text-violet-200" href={`mailto:${tr.supportEmail}`}>{tr.supportEmail}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
