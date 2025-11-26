import React from "react";
import ResetPasswordClient from "../../../components/ResetPasswordClient";

type PageProps = {
    params: { code: string } | Promise<{ code: string }>;
    searchParams?: Record<string, string | string[] | undefined>;
};

export default async function Page({ params }: PageProps) {
    const resolvedParams =
        params && typeof (params as any).then === "function" ? await params : params;
    const code = (resolvedParams as { code: string })?.code ?? "";

    return <ResetPasswordClient code={code} />;
}