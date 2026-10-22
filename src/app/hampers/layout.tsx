import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gift Hampers | We Craft Memories',
  description: 'Discover beautifully curated gift hampers for birthdays, special occasions and celebrations at We Craft Memories.',
};

export default function HampersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
