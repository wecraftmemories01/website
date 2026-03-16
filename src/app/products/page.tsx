import { Suspense } from "react"
import ProductsClient from "../../components/ProductsClient"

export const metadata = {
    title: "Shop Handmade Crochet Gifts & Cute Decor | WeCraftMemories",
    description:
        "Browse adorable handmade crochet toys, amigurumi gifts, sunflower decor, and unique handcrafted items at WeCraftMemories. Find the perfect cute gift today.",
};

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading products...</div>}>
            <ProductsClient />
        </Suspense>
    )
}