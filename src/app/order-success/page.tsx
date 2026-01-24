import { Suspense } from "react";
import OrderSuccessClient from "../../components/OrderSuccessClient";

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading order details…</div>}>
            <OrderSuccessClient />
        </Suspense>
    );
}