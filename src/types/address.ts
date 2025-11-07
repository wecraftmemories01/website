export type Address = {
    id: string | number;
    serverId?: string | null;
    recipientName: string;
    recipientContact: string;
    addressLine1: string;
    addressLine2?: string | null;
    addressLine3?: string | null;
    landmark?: string | null;
    countryId?: string | null;
    stateId?: string | null;
    cityId?: string | null;
    countryName?: string | null;
    stateName?: string | null;
    cityName?: string | null;
    pincode: string;
    isDefault?: boolean;
};