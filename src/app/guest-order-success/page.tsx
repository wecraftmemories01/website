import GuestOrderSuccessClient from "../../components/GuestOrderSuccessClient";
import { OrderConfirmationState } from "@/components/OrderConfirmationView";

export const metadata = {
    title: "Order Confirmed | We Craft Memories",
    robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;

    const tokenRaw = params?.token;

    const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

    if (!token) {
        return (
            <OrderConfirmationState
                message="This guest order link is missing its access token. Please use the link in your confirmation email or contact us for help."
                guest
            />
        );
    }

    return <GuestOrderSuccessClient token={token} />;
}