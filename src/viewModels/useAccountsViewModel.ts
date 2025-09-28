import {useCallback, useEffect, useState} from 'react';
import {supabase, getSession} from '../supabaseClient';
import type {Account} from '../models/Account';


export function useAccountsViewModel() {
    const [accounts, setAccounts] = useState<Account[]>([]);
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
                await fetchAccounts();
            } catch (err: any) {
                console.error('Login / fetch error', err);
                if (mounted) setError(err?.message ?? String(err));
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        setError(null);
        const {data, error} = await supabase
            .from('accounts')
            .select('*')
            .order('id', {ascending: true});
        if (error) {
            console.error('Fetch error', error);
            setError(error.message);
            setAccounts([]);
        } else {
            setAccounts(data ?? []);
        }
        setLoading(false);
    }, []);

    const addAccount = useCallback(async (payload: Account) => {
        if (!session) throw new Error('Not authenticated');

        // Map fields explicitly and force virtual & budget to false
        const record = {
            user_id: session.user.id,
            category_id: payload.category_id ?? 0,
            parent_id: payload.parent_id ?? null,
            name: (payload.name ?? '').trim(),
            description: payload.description ?? null,
            type: (payload.type ?? '').trim() || 'other',
            balance: payload.balance ?? 0,
            balance_decimal: payload.balance_decimal ?? 2,
            virtual: false, // forced
            budget: false,  // forced
            currency: payload.currency ?? 'EUR',
            color: payload.color ?? '#000000',
            icon: payload.icon ?? 'mdi:bank',
        };

        const {data, error} = await supabase
            .from('accounts')
            .insert([record])
            .select();

        if (error) {
            console.error('Insert error', error);
            throw error;
        }

        setAccounts(prev => [...prev, ...(data ?? [])]);
        return data?.[0] ?? null;
    }, [session]);

    const updateAccount = useCallback(async (id: number, patch: Account) => {
        if (!session) throw new Error('Not authenticated');

        const update: any = {};
        if (patch.category_id !== undefined) update.category_id = patch.category_id;
        if (patch.parent_id !== undefined) update.parent_id = patch.parent_id;
        if (patch.name !== undefined) update.name = patch.name.trim();
        if (patch.description !== undefined) update.description = patch.description;
        if (patch.type !== undefined) update.type = patch.type;
        if (patch.balance !== undefined) update.balance = patch.balance;
        if (patch.balance_decimal !== undefined) update.balance_decimal = patch.balance_decimal;
        // DO NOT allow updating virtual/budget from this UI — force false
        // if (patch.virtual !== undefined) update.virtual = patch.virtual; // omitted
        // if (patch.budget !== undefined) update.budget = patch.budget; // omitted
        if (patch.currency !== undefined) update.currency = patch.currency;
        if (patch.color !== undefined) update.color = patch.color;
        if (patch.icon !== undefined) update.icon = patch.icon;

        // Ensure we always keep virtual/budget false on update (if you want to keep prior DB value, remove next lines)
        update.virtual = false;
        update.budget = false;

        const {data, error} = await supabase
            .from('accounts')
            .update(update)
            .eq('user_id', session.user.id)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Update error', error);
            throw error;
        }

        if (data && data.length > 0) {
            setAccounts(prev => prev.map(a => (a.id === id ? data[0] : a)));
        }

        return data?.[0] ?? null;
    }, [session]);

    const deleteAccount = useCallback(async (id: number) => {
        if (!session) throw new Error('Not authenticated');

        const {error} = await supabase
            .from('accounts')
            .delete()
            .eq('user_id', session.user.id)
            .eq('id', id);

        if (error) {
            console.error('Delete error', error);
            throw error;
        }

        setAccounts(prev => prev.filter(a => a.id !== id));
        return true;
    }, [session]);

    return {
        accounts,

        fetchAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
        loading,
        error,
    };
}
