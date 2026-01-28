import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Webpify from "@/components/Webpify";

const FORMATS = {
  jpg: { label: "JPG" },
  png: { label: "PNG" },
  heic: { label: "HEIC" },
  webp: { label: "WebP" },
};

type FormatKey = keyof typeof FORMATS;
type PageProps = {
  params: { format: string };
};

function normalizeFormat(value: string | undefined): FormatKey | null {
  if (!value) return null;
  const key = value.toLowerCase();
  return Object.prototype.hasOwnProperty.call(FORMATS, key) ? (key as FormatKey) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const formatKey = normalizeFormat(params.format);
  if (!formatKey) {
    return {
      title: "Image Converter",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const label = FORMATS[formatKey].label;
  const title = `${label} to WebP Converter`;
  const description = `Convert ${label} images to WebP online. Fast batch conversion with quality and resize controls.`;
  const url = `/convert/${formatKey}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ConvertFormatPage({ params }: PageProps) {
  const formatKey = normalizeFormat(params.format);
  if (!formatKey) {
    notFound();
  }
  return <Webpify />;
}
