import React from "react";
import ResetPasswordClient from "../../../components/ResetPasswordClient";

type PageProps = {
    params: {
        code: string;
    };
    searchParams?: Record<string, string | string[] | undefined>;
};

export default function Page({ params }: PageProps) {
    const { code } = params;

    return <ResetPasswordClient code={code} />;
}