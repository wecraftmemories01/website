export interface Color {
    _id?: string;
    name: string;
    publicName: string;
    colorCode: string;
    description: string;
    sortNumber: number;
    inUse: boolean;
    createdAt?: string;
    updatedAt?: string;
}