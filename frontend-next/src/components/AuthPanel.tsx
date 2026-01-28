"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { AuthPayload, User } from "@/types";

function isPlanActive(user?: User | null) {
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
  freeLeft: (left: number, total: number) => `Free left: ${left} / ${total}`,
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
  supportNote: "Activation happens automatically after payment. If it doesn't show in 1-2 minutes, contact support",
  supportEmail: "service@lukiora.com",
};

type AuthTexts = typeof DEFAULT_AUTH_TEXTS;

type AuthPanelProps = {
  apiBase: string;
  currentUser: User | null;
  planActive?: boolean;
  onAuthChange: (payload: AuthPayload) => void;
  t?: { auth?: Partial<AuthTexts> } & Record<string, unknown>;
  allowExternalServices?: boolean;
};

export default function AuthPanel({
  apiBase,
  currentUser,
  planActive,
  onAuthChange,
  t,
  allowExternalServices = true,
}: AuthPanelProps) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bankQrDataUrl, setBankQrDataUrl] = useState("");
  const tr = useMemo(() => ({ ...DEFAULT_AUTH_TEXTS, ...(t?.auth || {}) }), [t]);

  const monthlyUrl = process.env.NEXT_PUBLIC_BMC_MONTHLY_URL || "https://www.buymeacoffee.com/lukiora";
  const bmcWidgetConfig = useMemo(
    () => ({
      id: process.env.NEXT_PUBLIC_BMC_ID || "lukiora",
      description: process.env.NEXT_PUBLIC_BMC_DESCRIPTION || "Support me on Buy me a coffee!",
      message:
        process.env.NEXT_PUBLIC_BMC_MESSAGE
        || "Webpify Batch saves time and storage. Support the project and help us build better image tools.",
      color: process.env.NEXT_PUBLIC_BMC_COLOR || "#7c3aed",
      position: process.env.NEXT_PUBLIC_BMC_POSITION || "Right",
      xMargin: process.env.NEXT_PUBLIC_BMC_X_MARGIN || "18",
      yMargin: process.env.NEXT_PUBLIC_BMC_Y_MARGIN || "18",
    }),
    []
  );

  const bankEnabled = (process.env.NEXT_PUBLIC_BANK_QR_ENABLED || "true").toLowerCase() === "true";
  const bankTitle = process.env.NEXT_PUBLIC_BANK_QR_TITLE || "Bank transfer (Air Bank)";
  const bankSubtitle = process.env.NEXT_PUBLIC_BANK_QR_SUBTITLE
    || "Pay by QR code and include your login email in the message.";
  const bankNote = process.env.NEXT_PUBLIC_BANK_QR_NOTE
    || "Activation happens after the payment confirmation email arrives.";
  const bankLoginNote = process.env.NEXT_PUBLIC_BANK_QR_LOGIN_NOTE
    || "Log in to generate a QR with your email.";
  const bankMissingConfig = process.env.NEXT_PUBLIC_BANK_QR_MISSING_NOTE
    || "Bank payment is not configured yet.";
  const bankIban = process.env.NEXT_PUBLIC_BANK_QR_IBAN || "";
  const bankAccount = process.env.NEXT_PUBLIC_BANK_QR_ACC || "";
  const bankAmount = process.env.NEXT_PUBLIC_BANK_QR_AMOUNT || "";
  const bankCurrency = process.env.NEXT_PUBLIC_BANK_QR_CURRENCY || "CZK";
  const bankMessageTemplate = process.env.NEXT_PUBLIC_BANK_QR_MESSAGE_TEMPLATE || "Membership for {{email}}";
  const bankVariableSymbol = process.env.NEXT_PUBLIC_BANK_QR_VS || "";
  const bankAccountValue = bankIban || bankAccount;
  const bankConfigured = bankEnabled && bankAccountValue && bankAmount;

  const ensureBmcWidget = () => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[id^="bmc-wbtn"]'));
    if (buttons.length > 1) {
      buttons.slice(1).forEach((btn) => btn.remove());
    }
    if (buttons.length === 0 && !window.__bmcWidgetInitRequested) {
      const script = document.querySelector<HTMLScriptElement>('script[data-name="BMC-Widget"]');
      const scriptReady = !!window.__bmcWidgetScriptLoaded
        || script?.dataset?.loaded === "true"
        || script?.getAttribute("data-loaded") === "true";
      if (scriptReady) {
        window.__bmcWidgetInitRequested = true;
        window.dispatchEvent(new Event("DOMContentLoaded"));
      }
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!allowExternalServices) {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('[id^="bmc-wbtn"]'));
      buttons.forEach((btn) => btn.remove());
      const script = document.querySelector<HTMLScriptElement>('script[data-name="BMC-Widget"]');
      if (script) {
        script.remove();
      }
      window.__bmcWidgetInitRequested = false;
      window.__bmcWidgetScriptLoaded = false;
      return;
    }
    if (document.querySelector('script[data-name="BMC-Widget"]')) {
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
      ensureBmcWidget();
      setTimeout(() => {
        ensureBmcWidget();
      }, 300);
    };

    document.body.appendChild(script);
  }, [allowExternalServices, bmcWidgetConfig]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!allowExternalServices) return;
    const handleBmcClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest('[id^="bmc-wbtn"]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof window !== "undefined") {
        window.open(monthlyUrl, "_blank", "noreferrer");
      }
    };

    document.addEventListener("click", handleBmcClick, true);
    return () => document.removeEventListener("click", handleBmcClick, true);
  }, [allowExternalServices, monthlyUrl]);

  const bankMessage = useMemo(() => {
    const emailValue = currentUser?.email || "";
    return bankMessageTemplate
      .replace(/\{\{\s*email\s*\}\}/gi, emailValue)
      .replace(/\{\s*email\s*\}/gi, emailValue)
      .trim();
  }, [bankMessageTemplate, currentUser]);

  const bankSpd = useMemo(() => {
    if (!bankConfigured) return "";
    const sanitize = (value: string) => value.replace(/\*/g, " ").replace(/[\r\n]+/g, " ").trim();
    const parts = [
      "SPD*1.0",
      `ACC:${sanitize(bankAccountValue)}`,
      `AM:${sanitize(bankAmount)}`,
      `CC:${sanitize(bankCurrency)}`,
    ];
    if (bankMessage) {
      parts.push(`MSG:${sanitize(bankMessage)}`);
    }
    if (bankVariableSymbol) {
      parts.push(`X-VS:${sanitize(bankVariableSymbol)}`);
    }
    return parts.join("*");
  }, [bankConfigured, bankAccountValue, bankAmount, bankCurrency, bankMessage, bankVariableSymbol]);

  useEffect(() => {
    let cancelled = false;
    if (!bankSpd) {
      setBankQrDataUrl("");
      return undefined;
    }
    QRCode.toDataURL(bankSpd, { width: 240, margin: 1 })
      .then((url) => {
        if (!cancelled) {
          setBankQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBankQrDataUrl("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bankSpd]);

  const active = useMemo(() => {
    if (typeof planActive === "boolean") return planActive;
    return isPlanActive(currentUser);
  }, [planActive, currentUser]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function persistAuth(token: string, user: User | null, planActiveOverride?: boolean) {
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
      planActive: typeof planActiveOverride === "boolean" ? planActiveOverride : isPlanActive(user),
    });
  }

  async function submitAuth(e: React.FormEvent<HTMLFormElement>) {
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
      const message = err instanceof Error ? err.message : tr.activationError;
      setError(message || tr.activationError);
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

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-100 font-['Space_Grotesk']">{tr.purchaseTitle}</span>
              {currentUser ? (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={monthlyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 border border-white/80 hover:bg-slate-100 transition"
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
                <img
                  className="rounded-lg shadow-md shadow-black/30"
                  src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=lukiora&button_colour=5F7FFF&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"
                  alt="Buy Me a Coffee"
                />
              </a>
            </div>
            <p className="text-sm text-slate-300">
              {tr.supportNote}{" "}
              <a className="text-violet-300 underline hover:text-violet-200" href={`mailto:${tr.supportEmail}`}>{tr.supportEmail}</a>.
            </p>
          </div>

          {/*
          {bankEnabled && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-100 font-['Space_Grotesk']">{bankTitle}</span>
                <p className="text-sm text-slate-300">{bankSubtitle}</p>
              </div>
              {!currentUser && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
                  {bankLoginNote}
                </div>
              )}
              {currentUser && !bankConfigured && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
                  {bankMissingConfig}
                </div>
              )}
              {currentUser && bankConfigured && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    {bankQrDataUrl ? (
                      <img src={bankQrDataUrl} alt="Bank payment QR" className="h-48 w-48 rounded-lg" />
                    ) : (
                      <div className="text-xs text-slate-400">Generating QR...</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-slate-300">
                    <div><span className="text-slate-200 font-semibold">Amount:</span> {bankAmount} {bankCurrency}</div>
                    <div><span className="text-slate-200 font-semibold">Account:</span> {bankAccountValue}</div>
                    {bankVariableSymbol && (
                      <div><span className="text-slate-200 font-semibold">VS:</span> {bankVariableSymbol}</div>
                    )}
                    {bankMessage && (
                      <div className="break-all"><span className="text-slate-200 font-semibold">Message:</span> {bankMessage}</div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400">{bankNote}</p>
            </div>
          )}
          */}
        </div>
      </div>
    </div>
  );
}
