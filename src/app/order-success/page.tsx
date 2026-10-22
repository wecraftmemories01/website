import { Suspense } from "react";
import OrderSuccessClient from "../../components/OrderSuccessClient";
import { OrderConfirmationState } from "@/components/OrderConfirmationView";

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
        <Suspense fallback={<OrderConfirmationState loading />}>
            <OrderSuccessClient />
        </Suspense>
    );
}