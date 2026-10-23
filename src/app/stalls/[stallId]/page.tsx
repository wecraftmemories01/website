import type { Metadata } from "next";
import StallDetailClient from "@/components/stalls/StallDetailClient";

export const metadata: Metadata = {
    title: "Stall Details & Handmade Showcase | We Craft Memories",
    description:
        "Find We Craft Memories stall timings, address, stall number and the handmade products we'll showcase in person.",
};

export default async function StallDetailPage({
    params,
}: {
    params: Promise<{ stallId: string }>;
}) {
    const { stallId } = await params;
    return <StallDetailClient stallId={stallId} />;
}