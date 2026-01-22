'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumb() {
    const pathname = usePathname();

    // Split and filter segments, ignoring "portal"
    const rawSegments = pathname.split('/').filter(Boolean);
    const filteredSegments = rawSegments.filter((seg) => seg !== 'portal');

    // Create URLs for each breadcrumb item
    const paths = filteredSegments.map((_, i) => {
        const base = rawSegments.slice(0, rawSegments.indexOf(filteredSegments[0]) + i + 1);
        return '/' + base.join('/');
    });

    return (
        <nav className="text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
                {filteredSegments.map((label, index) => (
                    <li key={index} className="flex items-center gap-2">
                        <span className="text-gray-400">/</span>
                        {index === filteredSegments.length - 1 ? (
                            <span className="text-gray-500 capitalize">{formatLabel(label)}</span>
                        ) : (
                            <Link href={paths[index]} className="hover:underline text-blue-600 font-medium capitalize">
                                {formatLabel(label)}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

// Helper to capitalize words and replace hyphens
function formatLabel(text: string) {
    return text
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}