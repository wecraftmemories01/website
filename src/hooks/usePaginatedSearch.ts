import { useState, useEffect } from 'react';
import axios from '@/services/api';

interface UsePaginatedSearchProps<T> {
    endpoint: string;
    dataKey?: string;
    countKey?: string;
    defaultLimit?: number;
    params?: Record<string, any>;
}

export function usePaginatedSearch<T>({
    endpoint,
    dataKey = 'items',
    countKey = 'totalCount',
    defaultLimit = 10,
    params = {},
}: UsePaginatedSearchProps<T>) {
    const [data, setData] = useState<T[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(defaultLimit);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchId, setFetchId] = useState(0);

    const refetch = () => setFetchId((prev) => prev + 1);

    useEffect(() => {
        const shouldFetch = searchTerm.length === 0 || searchTerm.length >= 3;
    
        if (!shouldFetch) {
            setTotalCount(0);
            return;
        }
    
        setLoading(true);
        axios
            .get(endpoint, {
                params: {
                    publicName: searchTerm,
                    page,
                    limit,
                    ...params,
                },
            })
            .then((res) => {
                setData(res.data[dataKey] || []);
                setTotalCount(res.data[countKey] || 0);
            })
            .finally(() => setLoading(false));
    }, [endpoint, page, limit, searchTerm, fetchId]);    

    return {
        data,
        searchTerm,
        setSearchTerm,
        page,
        setPage,
        limit,
        setLimit,
        totalCount,
        loading,
        refetch,
    };
}