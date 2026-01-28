"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { FALLBACK_TEXTS, TRANSLATIONS } from "@/language/translations";

const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LANG || "en";
const SUPPORT_EMAIL = "service@lukiora.com";

type TranslationKey = keyof typeof TRANSLATIONS;
type TranslationEntry = typeof FALLBACK_TEXTS;
type LegalKind = "privacy" | "cookies";

const FALLBACK_LANG = (Object.keys(TRANSLATIONS)[0] as TranslationKey) || "en";

function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, value);
}

function getInitialLang(): TranslationKey {
  const fallback = isTranslationKey(DEFAULT_LANG) ? DEFAULT_LANG : FALLBACK_LANG;

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("webpify_lang");
    if (saved && isTranslationKey(saved)) return saved;
  }

  if (typeof navigator !== "undefined") {
    const base = navigator.language.slice(0, 2).toLowerCase();
    if (isTranslationKey(base)) return base;
  }

  return fallback;
}

export default function LegalPage({ kind }: { kind: LegalKind }) {
  const [lang] = useState<TranslationKey>(() => getInitialLang());

  const t = useMemo(() => {
    const base =
      (isTranslationKey(lang)
        ? TRANSLATIONS[lang]
        : TRANSLATIONS[FALLBACK_LANG]) || {};
    return { ...FALLBACK_TEXTS, ...base } as TranslationEntry;
  }, [lang]);

  const dataItems = Array.isArray((t as any).privacyDataItems)
    ? (t as any).privacyDataItems
    : [];

  const purposeItems = Array.isArray((t as any).privacyPurposeItems)
    ? (t as any).privacyPurposeItems
    : [];

  const legalItems = Array.isArray((t as any).privacyLegalItems)
    ? (t as any).privacyLegalItems
    : [];

  const recipientsItems = Array.isArray((t as any).privacyRecipientsItems)
    ? (t as any).privacyRecipientsItems
    : [];

  const retentionItems = Array.isArray((t as any).privacyRetentionItems)
    ? (t as any).privacyRetentionItems
    : [];

  const rights = Array.isArray(t.privacyRightsItems)
    ? t.privacyRightsItems
    : FALLBACK_TEXTS.privacyRightsItems;

  const cookiesTypesItems = Array.isArray((t as any).cookiesTypesItems)
    ? (t as any).cookiesTypesItems
    : [];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    document.cookie = `webpify_lang=${encodeURIComponent(
      lang
    )}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [lang]);

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-violet-300 hover:text-violet-200">
          ← {t.backToConverter}
        </Link>

        {kind === "privacy" ? (
          <>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-100">
              {t.privacyTitle}
            </h1>

            <p className="mt-2 text-slate-300">{t.privacyIntro}</p>

            <section className="mt-6 space-y-6 text-sm text-slate-300">
              <div>
                <h2 className="font-semibold text-slate-100">
                  {t.privacyDataTitle}
                </h2>
                <p>{t.privacyDataText}</p>

                {dataItems.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {dataItems.map((i: string, n: number) => (
                      <li key={n}>{i}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  {t.privacyPurposeTitle}
                </h2>
                <p>{t.privacyPurposeText}</p>

                {purposeItems.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {purposeItems.map((i: string, n: number) => (
                      <li key={n}>{i}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  {(t as any).privacyRecipientsTitle ?? "Recipients"}
                </h2>

                {recipientsItems.length > 0 ? (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {recipientsItems.map((i: string, n: number) => (
                      <li key={n}>{i}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{(t as any).privacyRecipientsText ?? ""}</p>
                )}
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  {t.privacyRightsTitle}
                </h2>

                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {rights.map((i: string, n: number) => (
                    <li key={n}>{i}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  {t.privacyContactTitle}
                </h2>
                <p>
                  {t.privacyContactText}{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="underline text-violet-300"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
            </section>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-100">
              {t.cookiesPageTitle}
            </h1>

            <p className="mt-2 text-slate-300">{t.cookiesIntro}</p>

            <section className="mt-6 space-y-6 text-sm text-slate-300">
              <div>
                <h2 className="font-semibold text-slate-100">
                  {(t as any).cookiesTypesTitle ?? "Cookies types"}
                </h2>

                {cookiesTypesItems.length > 0 ? (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {cookiesTypesItems.map((i: string, n: number) => (
                      <li key={n}>{i}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{(t as any).cookiesTypesText ?? ""}</p>
                )}
              </div>

              <div>
                <h2 className="font-semibold text-slate-100">
                  {t.cookiesContactTitle}
                </h2>
                <p>
                  {t.cookiesContactText}{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="underline text-violet-300"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
