import { Suspense } from "react";
import ProfileClient from "../../components/ProfileClient";

export const metadata = {
    title: "My Profile | Account Dashboard – WeCraftMemories",
    description:
        "Manage your WeCraftMemories account, view orders, update addresses, and track your handmade gift purchases.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8">Loading profile...</div>}>
            <ProfileClient />
        </Suspense>
    );
}