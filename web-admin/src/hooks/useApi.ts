import { useCallback, useState } from 'react';
import apiClient from '../api/client';

interface UseApiOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
}

export const useApi = <T = any,>(options: UseApiOptions = {}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<T | null>(null);

    const request = useCallback(
        async (
            method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
            url: string,
            payload?: any
        ) => {
            setLoading(true);
            setError(null);
            try {
                const config = {
                    method,
                    url,
                    ...(payload && { data: payload }),
                };

                const response = (await apiClient(config)) as any;
                const apiResponse = response;

                if (!apiResponse?.success) {
                    throw new Error(apiResponse?.message || 'Request failed');
                }

                const responseData = apiResponse.data || null;
                setData(responseData);

                if (options.onSuccess) {
                    options.onSuccess(responseData);
                }

                return responseData;
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
                setError(errorMessage);

                if (options.onError) {
                    options.onError(err);
                }

                throw err;
            } finally {
                setLoading(false);
            }
        },
        [options]
    );

    const get = useCallback(
        (url: string) => request('GET', url),
        [request]
    );

    const post = useCallback(
        (url: string, payload?: any) => request('POST', url, payload),
        [request]
    );

    const put = useCallback(
        (url: string, payload?: any) => request('PUT', url, payload),
        [request]
    );

    const remove = useCallback(
        (url: string) => request('DELETE', url),
        [request]
    );

    return {
        get,
        post,
        put,
        delete: remove,
        loading,
        error,
        data,
    };
};
