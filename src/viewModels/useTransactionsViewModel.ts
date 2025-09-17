import { useCallback, useEffect, useState } from 'react';
import { supabase, getSession } from '../supabaseClient';
import type { Transaction } from '../models/Transaction';
import type { TransactionDetail } from '../models/TransactionDetail';


export function useTransactionsViewModel() {
  const [session, setSession] = useState<any>(null);
  const [headers, setHeaders] = useState<Transaction[]>([]);
  const [details, setDetails] = useState<Record<number, TransactionDetail[]>>({}); // key: transaction_id
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getSession();
        if (!mounted) return;
        setSession(s);
        await fetchHeaders();
      } catch (err: any) {
        console.error('login/fetch error', err);
        if (mounted) setError(err?.message ?? String(err));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fetchHeaders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(200); // limit per pagina (puoi cambiare/paginare)

    if (error) {
      console.error('fetch headers error', error);
      setError(error.message);
      setHeaders([]);
    } else {
      setHeaders(data ?? []);
    }
    setLoading(false);
  }, []);

  const fetchDetailsFor = useCallback(async (transaction_id: number) => {
    const { data, error } = await supabase
      .from('transaction_details')
      .select('*')
      .eq('transaction_id', transaction_id)
      .order('id', { ascending: true });

    if (error) {
      console.error('fetch details error', error);
      return;
    }
    setDetails(prev => ({ ...prev, [transaction_id]: data ?? [] }));
  }, []);

  // helper: convert user-friendly decimal string to minor units bigint
  function parseDecimalToMinor(amountStr: string, decimals: number) {
    // amountStr like "12.34" or "12"
    const normalized = String(amountStr).replace(',', '.').trim();
    if (normalized === '') return (0);
    const parts = normalized.split('.');
    let whole = parts[0] || '0';
    let frac = parts[1] || '';
    if (frac.length > decimals) frac = frac.slice(0, decimals); // truncate
    while (frac.length < decimals) frac += '0';
    const combined = whole + frac;
    // remove non-digits (shouldn't be any)
    const digits = combined.replace(/[^\d-]/g, '');
    return (digits || '0');
  }

  function formatMinorToDecimal(minor: number, decimals: number) {
    const sign = minor < 0n ? '-' : '';
    const m = minor < 0n ? -minor : minor;
    const s = m.toString().padStart(decimals + 1, '0');
    const len = s.length;
    const w = s.slice(0, len - decimals);
    const f = s.slice(len - decimals);
    return `${sign}${w}.${f}`;
  }

  // create transaction header + optional details
  const createTransaction = useCallback(async (headerInput: {
    category_id: number;
    from_account_id?: number | null;
    to_account_id?: number | null;
    type: string;
    status?: string;
    method?: string;
    amountMinor: number;
    amount_decimal?: number;
    currency?: string;
    exchange_rate?: number;
    dateISO: string;
    transaction_dateISO: string;
    scheduled_dateISO?: string | null;
    description?: string | null;
    notes?: string | null;
    tags?: string | null;
    color?: string;
    icon?: string;
  }, detailInputs?: Array<{
    amountMinor: number;
    amount_decimal?: number;
    description?: string | null;
    notes?: string | null;
    tags?: string | null;
    color?: string;
    icon?: string;
  }>) => {
    if (!session) throw new Error('Not authenticated');

    // build record for header (explicit mapping)
    const record: any = {
      user_id: session.user.id,
      category_id: headerInput.category_id,
      from_account_id: headerInput.from_account_id ?? null,
      to_account_id: headerInput.to_account_id ?? null,
      type: headerInput.type,
      status: headerInput.status ?? 'completed',
      method: headerInput.method ?? 'other',
      amount: headerInput.amountMinor,
      amount_decimal: headerInput.amount_decimal ?? 2,
      currency: headerInput.currency ?? 'EUR',
      exchange_rate: headerInput.exchange_rate ?? 1.0,
      date: headerInput.dateISO,
      transaction_date: headerInput.transaction_dateISO,
      scheduled_date: headerInput.scheduled_dateISO ?? null,
      description: headerInput.description ?? null,
      notes: headerInput.notes ?? null,
      tags: headerInput.tags ?? null,
      color: headerInput.color ?? '#000000',
      icon: headerInput.icon ?? 'mdi:bank',
    };

    // insert header
    const { data: headerData, error: headerError } = await supabase
      .from('transactions')
      .insert([record])
      .select()
      .single();

    if (headerError) {
      console.error('insert header error', headerError);
      throw headerError;
    }
    const createdHeader: Transaction = headerData;

    // if there are details, insert them referencing transaction_id
    if (detailInputs && detailInputs.length > 0) {
      const detailRecords = detailInputs.map(d => ({
        user_id: session.user.id,
        transaction_id: createdHeader.id,
        amount: d.amountMinor,
        amount_decimal: d.amount_decimal ?? createdHeader.amount_decimal,
        description: d.description ?? null,
        notes: d.notes ?? null,
        tags: d.tags ?? null,
        color: d.color ?? '#000000',
        icon: d.icon ?? 'mdi:bank',
      }));

      const { data: detailsData, error: detailsError } = await supabase
        .from('transaction_details')
        .insert(detailRecords)
        .select();

      if (detailsError) {
        console.error('insert details error', detailsError);
        // ATTENZIONE: header è stato creato. In produzione preferibile usare una funzione server-side per rendere l'insert atomico.
        throw detailsError;
      }

      // update local state
      setDetails(prev => ({ ...prev, [createdHeader.id!]: detailsData ?? [] }));
    } else {
      setDetails(prev => ({ ...prev, [createdHeader.id!]: [] }));
    }

    // update headers state
    setHeaders(prev => [createdHeader, ...prev]);
    return createdHeader;
  }, [session]);

  const updateTransaction = useCallback(async (id: number, headerPatch: Transaction) => {
    if (!session) throw new Error('Not authenticated');

    const updateFields: any = {};
    // map allowed fields explicitly
    if (headerPatch.category_id !== undefined) updateFields.category_id = headerPatch.category_id;
    if (headerPatch.from_account_id !== undefined) updateFields.from_account_id = headerPatch.from_account_id;
    if (headerPatch.to_account_id !== undefined) updateFields.to_account_id = headerPatch.to_account_id;
    if (headerPatch.type !== undefined) updateFields.type = headerPatch.type;
    if (headerPatch.status !== undefined) updateFields.status = headerPatch.status;
    if (headerPatch.method !== undefined) updateFields.method = headerPatch.method;
    if (headerPatch.amount !== undefined) updateFields.amount = headerPatch.amount;
    if (headerPatch.amount_decimal !== undefined) updateFields.amount_decimal = headerPatch.amount_decimal;
    if (headerPatch.currency !== undefined) updateFields.currency = headerPatch.currency;
    if (headerPatch.exchange_rate !== undefined) updateFields.exchange_rate = headerPatch.exchange_rate;
    if (headerPatch.date !== undefined) updateFields.date = headerPatch.date;
    if (headerPatch.transaction_date !== undefined) updateFields.transaction_date = headerPatch.transaction_date;
    if (headerPatch.scheduled_date !== undefined) updateFields.scheduled_date = headerPatch.scheduled_date;
    if (headerPatch.description !== undefined) updateFields.description = headerPatch.description;
    if (headerPatch.notes !== undefined) updateFields.notes = headerPatch.notes;
    if (headerPatch.tags !== undefined) updateFields.tags = headerPatch.tags;
    if (headerPatch.color !== undefined) updateFields.color = headerPatch.color;
    if (headerPatch.icon !== undefined) updateFields.icon = headerPatch.icon;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateFields)
      .eq('user_id', session.user.id)
      .eq('id', id)
      .select();

    if (error) {
      console.error('update header error', error);
      throw error;
    }

    if (data && data.length > 0) {
      setHeaders(prev => prev.map(h => (h.id === id ? data[0] : h)));
    }

    return data?.[0] ?? null;
  }, [session]);

  const deleteTransaction = useCallback(async (id: number) => {
    if (!session) throw new Error('Not authenticated');

    // delete details (cascade is set on FK, but safe to delete explicitly)
    const { error: delDetailsErr } = await supabase
      .from('transaction_details')
      .delete()
      .eq('user_id', session.user.id)
      .eq('transaction_id', id);

    if (delDetailsErr) {
      console.error('delete details error', delDetailsErr);
      throw delDetailsErr;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', session.user.id)
      .eq('id', id);

    if (error) {
      console.error('delete header error', error);
      throw error;
    }

    setHeaders(prev => prev.filter(h => h.id !== id));
    setDetails(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    return true;
  }, [session]);

  return {
    session,
    headers,
    details,

    fetchHeaders,
    fetchDetailsFor,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    parseDecimalToMinor,
    formatMinorToDecimal,
    loading,
    error,
  };
}
