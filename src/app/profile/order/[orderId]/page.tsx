import React from "react";
import Link from "next/link";
import OrderDetails from "../../../../components/OrderDetails";

type Props = {
    params: { orderId: string };
};

export default function ProfileOrderPage({ params }: Props) {
    const orderId = params?.orderId ?? "";
    const defaultCustomerId = "68d98d10d8e1d8ae4744079c";

    return (
        <div className="min-h-screen p-6 md:p-8 bg-gradient-to-b from-[#fbfdff] to-white">
            <div className="max-w-4xl mx-auto">
                <OrderDetails customerId={defaultCustomerId} orderId={orderId} />
            </div>
        </div>
    );
}