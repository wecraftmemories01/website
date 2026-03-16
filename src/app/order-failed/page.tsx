import { Suspense } from "react";
import OrderFailedClient from "../../components/OrderFailedClient";

export const metadata = {
    title: "Payment Failed | Order Could Not Be Completed – WeCraftMemories",
    description:
        "Your order payment could not be completed. Please try again or use another payment method to continue shopping handmade crochet gifts at WeCraftMemories.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function OrderFailedPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading order details…</div>}>
            <OrderFailedClient />
        </Suspense>
    );
}