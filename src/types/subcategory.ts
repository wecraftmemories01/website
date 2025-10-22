export interface SubCategory {
    _id?: string;
    masterCategoryId: string;
    superCategoryId: string;
    categoryId: string;
    name: string;
    publicName: string;
    description: string;
    sortNumber: number;
    inUse?: boolean;
    createdAt?: string;
    updatedAt?: string;
    masterCategoryName?: string;
    masterCategoryPublicName?: string;
    superCategoryName?: string;
    superCategoryPublicName?: string;
    categoryName?: string;
    categoryPublicName?: string;
}