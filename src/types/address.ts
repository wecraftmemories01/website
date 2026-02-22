export type Address = {
    id: string;
    serverId?: string | null;
    recipientName: string;
    recipientContact: string;
    addressLine1: string;
    addressLine2?: string | null;
    addressLine3?: string | null;
    landmark?: string | null;
    state: string;
    district: string;
    city: string;
    country?: string;
    pincode: string;
    isDefault?: boolean;
};