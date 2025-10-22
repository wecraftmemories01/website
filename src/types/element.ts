export interface Element {
    _id?: string;
    elementName: string;
    elementImage: string;
    description: string;
    showOnWeb: boolean;
    sortNumber: number;
    stockSaleQuantity: number;
    stockRentQuantity: number;
    alertOnQuantity: number;
    colors: string[];
    inUse?: boolean;
    createdAt?: string;
    updatedAt?: string;
}