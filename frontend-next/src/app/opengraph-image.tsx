import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { FALLBACK_TEXTS, TRANSLATIONS } from "@/translations";

const siteUrl = "https://convertor.lukiora.com";
const siteHost = siteUrl.replace(/^https?:\/\//, "");
const logoUrl = new URL("/icon-512.svg", siteUrl).toString();
const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LANG || "en";

type TranslationKey = keyof typeof TRANSLATIONS;

const FALLBACK_LANG = (Object.keys(TRANSLATIONS)[0] as TranslationKey) || "en";

function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, value);
}

function parseAcceptLanguage(value: string) {
  return value
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
}

async function resolveLang(preferred?: string) {
  if (preferred && isTranslationKey(preferred)) {
    return preferred;
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

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpengraphImage({
  searchParams,
}: {
  searchParams?: { lang?: string };
}) {
  const lang = await resolveLang(searchParams?.lang);
  const base = (TRANSLATIONS[lang] || {}) as Partial<typeof FALLBACK_TEXTS>;
  const title = base.seoTitle || FALLBACK_TEXTS.seoTitle || base.heroTitle || FALLBACK_TEXTS.heroTitle;
  const description = base.seoDescription || FALLBACK_TEXTS.seoDescription || base.subtitle || FALLBACK_TEXTS.subtitle;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          padding: "64px",
          background: "linear-gradient(135deg, #0b1024 0%, #1b0b36 55%, #0a0d1a 100%)",
          color: "#e2e8f0",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "220px",
            height: "220px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "48px",
            background: "rgba(15, 23, 42, 0.6)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires img for embedded assets. */}
          <img src={logoUrl} width={180} height={180} alt="Lukiora logo" />
        </div>

        <div style={{ textAlign: "center", maxWidth: "900px" }}>
          <div style={{ fontSize: "52px", fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: "24px", color: "#cbd5f5", marginTop: "14px" }}>{description}</div>
        </div>

        <div style={{ fontSize: "22px", color: "#94a3b8" }}>{siteHost}</div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}
