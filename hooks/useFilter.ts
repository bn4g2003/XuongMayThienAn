'use client'

import _, { get } from 'lodash';
import { useState } from 'react';


export type IParams = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    page?: string | number;
    sort?: string;
    limit?: string;
};

const searchKey = 'search';

const useFilter =() => {
    const [query, setQuery] = useState<IParams>({});

    const reset = () => {
        setQuery({});
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQuery = (key: string, value: any) => {
        const validateParams = _.omitBy({ ...query, [key]: value }, (value) => value === undefined || value === '' || value === null || value === 'all');
       setQuery(validateParams)
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateQueries = (params: { key: string; value: any }[]) => {
        const newQuery = { ...query };
        params.forEach(({ key, value }) => {
            newQuery[key] = value;
        });
        const validateParams = _.omitBy(newQuery, (value) => value === undefined || value === '' || value === null || value === 'all');
        setQuery(validateParams);
    };
    const applyFilter = <T extends object>(data: T[]) => {
        return data.filter(item => {
            return Object.entries(query).every(([key, value]) => {
                const isSearchKey = key.includes(searchKey);
                if (isSearchKey) {
                    const searchFields = key.split(',').slice(1);
                    return searchFields.some(field => get(item, field)?.toString().toLowerCase().includes(value.toString().toLowerCase()));
                }
                return get(item, key)?.toString().toLowerCase().includes(value.toString().toLowerCase());
            });
        });
    };

    return { query, updateQuery, updateQueries, reset, applyFilter };
};

export default useFilter;
