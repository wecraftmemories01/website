export interface MasterCategory {
    _id?: string;
    name: string;
    publicName: string;
    description: string;
    sortNumber: number;
    inUse: boolean;
    createdAt?: string;
    updatedAt?: string;
}