import type { Metadata } from 'next';
import { plainTextFromHtml, resolveHamperImageUrl } from '@/lib/hamperDisplay';

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
    return { title, description, openGraph: { title, description, images: image ? [image] : [] } };
  } catch {
    return { title: 'Gift Hampers | We Craft Memories', description: 'Explore our curated gift hampers.' };
  }
}

export default function HamperDetailsLayout({ children }: { children: React.ReactNode }) {
  return children;
}