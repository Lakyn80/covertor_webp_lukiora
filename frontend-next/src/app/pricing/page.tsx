import type { Metadata } from "next";

const title = "Pricing";
const description = "Simple pricing for unlimited WebP conversions. Start with 3 free images, then unlock monthly access.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title,
    description,
    url: "/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-4 text-slate-300">
          Start with 3 free image conversions. Upgrade to monthly access for unlimited conversions and ZIP downloads.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-sm uppercase tracking-widest text-violet-300">Plans</div>
          <div className="mt-3 space-y-3 text-slate-200">
            <div>Free: 3 images to try the converter.</div>
            <div>Monthly access: unlimited conversions and priority processing.</div>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Log in to see your current access status.
          </p>
        </div>
      </div>
    </main>
  );
}
