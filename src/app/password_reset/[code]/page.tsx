import React from "react";
import ResetPasswordClient from "../../../components/ResetPasswordClient";

export default async function Page({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;

    return <ResetPasswordClient code={code} />;
}