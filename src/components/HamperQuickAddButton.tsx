"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { addHamperToCart, type Hamper } from "@/lib/hampers";

export default function HamperQuickAddButton({ hamper }: { hamper: Hamper }) {
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState("");
    if (!hamper.isAvailableForSale || hamper.maxOrderQuantity < 1) {
        return (
            <button type="button" disabled className="flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold sm:text-sm">
                Out of stock
            </button>
        );
    }
    return (
        <div>
            {added ? (
                <Link href="/cart" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e9f4e9] text-[#065975] text-xs font-bold hover:bg-[#d6ebdc] sm:text-sm">
                    <Check size={16} /> View cart
                </Link>
            ) : (
                <button type="button" disabled={adding} onClick={async () => {
                    if (adding) return;
                    setAdding(true);
                    setError("");
                    try {
                        await addHamperToCart(hamper, 1);
                        setAdded(true);
                    } catch (e: any) {
                        setError(typeof e?.response?.data?.error === "string" ? e.response.data.error : e?.message || "Could not add this hamper. Please try again.");
                    } finally {
                        setAdding(false);
                    }
                }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#065975] px-2 py-2 text-xs font-bold text-white hover:bg-[#03465e] disabled:opacity-50 sm:text-sm">
                    <ShoppingCart size={16} /> {adding ? "Adding…" : "Add to cart"}
                </button>
            )}
            {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
        </div>
    );
}
