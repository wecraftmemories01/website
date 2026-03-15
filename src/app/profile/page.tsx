import { Suspense } from "react";
import ProfileClient from "../../components/ProfileClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8">Loading profile...</div>}>
            <ProfileClient />
        </Suspense>
    );
}