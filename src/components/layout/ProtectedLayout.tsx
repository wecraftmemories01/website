'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            router.push('/portal/auth/login');
        } else {
            setIsReady(true);
        }
    }, [router]);

    // Avoid flash of layout while checking token
    if (!isReady || pathname.startsWith('/auth')) return null;

    return (
        <div className="flex">
            <div className="flex-1">
                <Header />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}