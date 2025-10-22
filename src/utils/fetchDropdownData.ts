import axios from '@/services/api';

export const fetchDropdownData = async (endpoint: string) => {
    try {
        const res = await axios.get(endpoint);
        return res.data;
    } catch (error: any) {
        console.error(`Failed to fetch from ${endpoint}:`, error?.response?.data?.error?.message || error.message);
        throw new Error('Failed to fetch dropdown data');
    }
};