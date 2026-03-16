import React from "react";
import ResetPasswordClient from "../../../components/ResetPasswordClient";

export const metadata = {
    title: "Reset Password | Secure Account Recovery – WeCraftMemories",
    description:
        "Create a new password for your WeCraftMemories account securely. Use the reset link sent to your email to regain access to your account.",
    robots: {
        index: false,
        follow: false,
    },
};

export default async function Page({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;

    return <ResetPasswordClient code={code} />;
}