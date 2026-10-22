import React from "react";
import ClientCart from "../../components/ClientCart";

export const metadata = {
    title: "Your Shopping Cart | Cute Handmade Gifts & Crochet Toys – WeCraftMemories",
    description:
        "Check your cart and complete your order at WeCraftMemories. Buy adorable handmade crochet toys, sunflower decor, and unique handcrafted gifts made with care.",
};

export default function Page() {
    return (
        <div className="w-full max-w-[1520px] mx-auto">
            <header className="mb-6">
                <h1 className="site-section-title">Your shopping bag</h1>
            </header>

            <ClientCart />
        </div>
    );
}
