import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { getRequestLang, getTranslations } from "@/app/_lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const t = getTranslations(lang);
  const title = t.privacyTitle;
  const description = t.privacyIntro;
  return {
    title,
    description,
    alternates: {
      canonical: "/privacy",
    },
    openGraph: {
      title,
      description,
      url: "/privacy",
      type: "article",
      locale: lang,
      images: [
        {
          url: `/opengraph-image?lang=${lang}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [`/twitter-image?lang=${lang}`],
    },
  };
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
