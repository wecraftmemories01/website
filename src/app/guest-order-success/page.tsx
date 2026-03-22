import GuestOrderSuccessClient from "../../components/GuestOrderSuccessClient";

export default async function OrderSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;

    const tokenRaw = params?.token;

    const token = Array.isArray(tokenRaw)
        ? tokenRaw[0]
        : tokenRaw;

    if (!token) {
        return (
            <div className="p-6 text-sm text-red-600">
                Invalid request. Missing token.
            </div>
        );
    }

    return <GuestOrderSuccessClient token={token} />;
}