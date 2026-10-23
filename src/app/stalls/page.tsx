import type { Metadata } from "next";
import StallsClient from "@/components/stalls/StallsClient";

export const metadata: Metadata = {
    title: "Our Upcoming & Past Stalls | We Craft Memories",
    description:
        "Come meet We Craft Memories in person! Discover upcoming, ongoing and past pop-up stalls, locations, timings and handmade products on display.",
};

export default function StallsPage() {
    return <StallsClient />;
}