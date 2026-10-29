import type { Metadata } from 'next';
import { plainTextFromHtml, resolveHamperImageUrl } from '@/lib/hamperDisplay';

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wecraftmemories.com').replace(/\/+$/, '');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const base = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') || '';
  const endpoint = /^[0-9a-f]{24}$/i.test(slug)
    ? `/hamper/sell/${encodeURIComponent(slug)}`
    : `/hamper/sell/slug/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(`${base}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Not found');
    const json = await res.json();
    const hamper = json?.hamper;
    if (!hamper) throw new Error('Not found');
    const title = hamper.seo?.metaTitle || `${hamper.hamperName} | We Craft Memories`;
    const description = plainTextFromHtml(hamper.seo?.metaDescription || hamper.shortDescription) || 'A thoughtfully curated gift hamper.';
    const image = resolveHamperImageUrl(hamper.hamperImage);
    const canonicalUrl = `${SITE_ORIGIN}/hampers/${encodeURIComponent(hamper.seo?.slug || hamper.hamperId || slug)}`;
    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: { type: 'website', title, description, url: canonicalUrl, siteName: 'We Craft Memories', images: image ? [{ url: image }] : [] },
      twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
    };
  } catch {
    return { title: 'Gift Hampers | We Craft Memories', description: 'Explore our curated gift hampers.' };
  }
}

export default function HamperDetailsLayout({ children }: { children: React.ReactNode }) {
  return children;
}