import { Suspense } from "react";
import OrderFailedClient from "../../components/OrderFailedClient";

export default function OrderFailedPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading order details…</div>}>
            <OrderFailedClient />
        </Suspense>
    );
}