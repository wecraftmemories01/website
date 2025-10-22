export interface AgeGroup {
    _id?: string;
    minRange?: number;
    maxRange?: number;
    name: string;
    publicName: string;
    description: string;
    sortNumber: number;
    inUse: boolean;
    createdAt?: string;
    updatedAt?: string;
}