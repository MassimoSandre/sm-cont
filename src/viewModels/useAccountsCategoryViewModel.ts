import {useCallback, useEffect, useState} from 'react';
import {supabase, getSession} from '../supabaseClient';
import type {AccountCategory} from '../models/AccountCategory';

export function useAccountsCategoryViewModel() {
    const [accountCategories, setAccountCategories] = useState<AccountCategory[]>([]);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // lazy login + initial load
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const s = await getSession();
                if (!mounted) return;
                setSession(s);
                await fetchCategories();
            } catch (err: any) {
                console.error('Login / fetch error', err);
                if (mounted) setError(err?.message ?? String(err));
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        const {data, error} = await supabase
            .from('accounts_categories')
            .select('*')
            .order('id', {ascending: true});
        if (error) {
            console.error('Fetch error', error);
            setError(error.message);
            setAccountCategories([]);
        } else {
            setAccountCategories(data ?? []);
        }
        setLoading(false);
    }, []);

    const addAccountCategory = useCallback(async (newCategory: AccountCategory) => {
        if (!session) throw new Error('Not authenticated');
        // explicit mapping => do not rely on model field names matching DB columns
        const record = {
            user_id: session.user.id,
            parent_id: newCategory.parent_id ?? null,
            name: (newCategory.name ?? '').trim(),
            description: newCategory.description ?? null,
            type: (newCategory.type ?? '').trim() || 'other',
            color: newCategory.color ?? '#000000',
            icon: newCategory.icon ?? 'mdi:bank',
        };

        const {data, error} = await supabase
            .from('accounts_categories')
            .insert([record])
            .select();

        if (error) {
            console.error('Insert error', error);
            throw error;
        }

        // append new rows to state
        setAccountCategories(prev => [...prev, ...(data ?? [])]);
        return data?.[0] ?? null;
    }, [session]);

    const updateAccountCategory = useCallback(async (id: number, updates: AccountCategory) => {
        if (!session) throw new Error('Not authenticated');
        // explicit mapping => do not rely on model field names matching DB columns
        const record: any = {
            parent_id: updates.parent_id ?? null,
            name: (updates.name ?? '').trim(),
            description: updates.description ?? null,
            type: (updates.type ?? '').trim() || 'other',
            color: updates.color ?? '#000000',
            icon: updates.icon ?? 'mdi:bank',
        };
        const {data, error} = await supabase
            .from('accounts_categories')
            .update(record)
            .eq('id', id)
            .select();
        if (error) {
            console.error('Update error', error);
            throw error;
        }
        // update row in state
        setAccountCategories(prev => prev.map(cat => (cat.id === id ? {...cat, ...(data?.[0] ?? {})} : cat)));
        return data?.[0] ?? null;
    }, [session]);

    const deleteAccountCategory = useCallback(async (id: number) => {
        if (!session) throw new Error('Not authenticated');
        const {error} = await supabase
            .from('accounts_categories')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Delete error', error);
            throw error;
        }
        // remove row from state
        setAccountCategories(prev => prev.filter(cat => cat.id !== id));
    }, [session]);


    return {
        accountCategories,
        addAccountCategory,
        fetchCategories,
        updateAccountCategory,
        deleteAccountCategory,
        loading,
        error,
    };
}
