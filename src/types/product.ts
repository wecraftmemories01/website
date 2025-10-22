export interface Product {
    _id?: string;
    masterCategoryId: string;
    superCategoryId: string;
    categoryId: string;
    subCategoryId: string;
    ageGroupId: string;
    genderId: string;
    productThemeId: string;
    productDesignId: string;
    productEditionId: string;
    productName: string;
    productImage: string;
    description: string;
    showOnWeb: boolean;
    sortNumber: number;
    colors: string[];
    sellStockQuantity: number;
    rentStockQuantity: number;
    inUse?: boolean;
    createdAt?: string;
    updatedAt?: string;
    masterCategoryName?: string;
    masterCategoryPublicName?: string;
    superCategoryName?: string;
    superCategoryPublicName?: string;
    categoryName?: string;
    categoryPublicName?: string;
    subCategoryName?: string;
    subCategoryPublicName?: string;
    ageGroupMinRange: string;
    ageGroupMaxRange: string;
    ageGroupPublicName: string;
    genderPublicName: string;
    themePublicName: string;
    designPublicName: string;
    editionPublicName: string;

    latestSalePrice?: {
        _id: string;
        discountedPrice: number;
        actualPrice: number;
        createdAt: string;
        updatedAt: string;
    };
}