import React from "react";
import ClientCart from "../../components/ClientCart";

export default function Page() {
    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight">My Cart</h1>
            </header>

            <ClientCart />
        </div>
    );
}