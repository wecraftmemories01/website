import { Suspense } from "react";
import OrderSuccessClient from "../../components/OrderSuccessClient";

export const metadata = {
    title: "Order Confirmed | Thank You for Shopping – WeCraftMemories",
    description:
        "Your order has been successfully placed at WeCraftMemories. Thank you for shopping our handmade crochet gifts, amigurumi toys, and adorable handcrafted decor.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading order details…</div>}>
            <OrderSuccessClient />
        </Suspense>
    );
}