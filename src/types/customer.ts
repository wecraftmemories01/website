export interface Customer {
    _id?: string;
    name: string;
    email: string;
    mobile: string;
    password: string;
    isEmailVerified: boolean;
    isCancelled: boolean;
    isBanned: boolean;
    isSuspended: boolean;
    isActive: boolean;
    isCreatedByStaff: boolean;
    createdAt?: string;
    updatedAt?: string;
}