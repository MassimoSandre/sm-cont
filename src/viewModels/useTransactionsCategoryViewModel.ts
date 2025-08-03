import { useState, useEffect } from 'react';
import type { TransactionCategory } from '../models/TransactionCategory';
import { invoke } from '@tauri-apps/api/core';

export function useTransactionsCategoryViewModel() {
    const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        invoke<TransactionCategory[]>('get_transaction_categories')
            .then((data) => {
                setTransactionCategories(data);
            })
            .catch((err) => {
                setError('Error loading transaction categories: ' + err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const addTransactionCategory = async (ttt: TransactionCategory) => {
        try {
            const aaa = await invoke<TransactionCategory>('add_transaction_category', { 
                newCategory: ttt
            });
            setTransactionCategories((prev) => [...prev, aaa]);
        } catch (err) {
            setError('Error adding transaction category: ' + err);
        }
    };

    return {
        transactionCategories,
        addTransactionCategory,
    };
}