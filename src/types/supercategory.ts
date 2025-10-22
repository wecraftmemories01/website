export interface SuperCategory {
    _id?: string;
    masterCategoryId: string;
    name: string;
    publicName: string;
    description: string;
    sortNumber: number;
    inUse?: boolean;
    createdAt?: string;
    updatedAt?: string;
    masterCategoryName?: string;
    masterCategoryPublicName?: string;
}