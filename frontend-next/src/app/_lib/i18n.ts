import { cookies, headers } from "next/headers";
import { FALLBACK_TEXTS, TRANSLATIONS } from "@/translations";

type TranslationKey = keyof typeof TRANSLATIONS;

const FALLBACK_LANG = (Object.keys(TRANSLATIONS)[0] as TranslationKey) || "en";
const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LANG || "en";

function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, value);
}

function parseAcceptLanguage(value: string) {
  return value
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
}

export async function getRequestLang(): Promise<TranslationKey> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("webpify_lang")?.value || "";
  if (cookieLang && isTranslationKey(cookieLang)) {
    return cookieLang;
  }

  const headerList = await headers();
  const header = headerList.get("accept-language") || "";
  const candidates = parseAcceptLanguage(header);
  for (const tag of candidates) {
    const base = tag.split("-")[0];
    if (isTranslationKey(base)) {
      return base as TranslationKey;
    }
  }

  if (isTranslationKey(DEFAULT_LANG)) {
    return DEFAULT_LANG as TranslationKey;
  }
  return FALLBACK_LANG;
}

export function getTranslations(lang: TranslationKey) {
  const base = (TRANSLATIONS[lang] || {}) as Partial<typeof FALLBACK_TEXTS>;
  return { ...FALLBACK_TEXTS, ...base };
}
