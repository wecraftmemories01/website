export type StallStatus = "upcoming" | "ongoing" | "completed";

export interface StallDay {
    date: string; // Calendar date from the API: YYYY-MM-DD
    startTime: string;
    endTime: string;
}

export interface StallShowcaseProduct {
    id: string;
    slug: string | null;
    name: string;
    image: string | null;
}

export interface PublicStall {
    id: string;
    slug: string | null;
    name: string;
    stallNumber: string;
    description: string;
    locationName: string;
    address: string;
    schedule: StallDay[];
    startDate: string;
    endDate: string;
    dayCount: number;
    status: StallStatus;
    productCount?: number; // Number of public designs, not stall stock quantities.
    products: StallShowcaseProduct[];
}
