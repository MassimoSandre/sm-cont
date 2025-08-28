import { useEffect, useState } from 'react';
import { supabase, getSession } from '../supabaseClient';
import type { TransactionCategory } from '../models/TransactionCategory';

export function useTransactionsCategoryViewModel() {
  const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        setSession(session);
        await fetchCategories();
      } catch (err) {
        console.error("Login error", err);
      }
    })();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('transactions_categories')
      .select('*');
    if (error) {
      console.error("Fetch error", error);
    } else {
      setTransactionCategories(data || []);
    }
  }

    async function addTransactionCategory(newCategory: TransactionCategory) {
        if (!session) return;

        const record = {
            user_id: session.user.id,       // obbligatorio da schema
            parent_id: newCategory.parent_id ?? null,
            name: newCategory.name,
            description: newCategory.description ?? null,
            type: newCategory.type,        // mapping esplicito
            color: newCategory.color || "#000000",
            icon: newCategory.icon || "mdi:bank",
        };

        const { data, error } = await supabase
        .from("transactions_categories")
        .insert([record])
        .select();

        if (error) {
        console.error("Insert error", error);
        } else {
        setTransactionCategories(prev => [...prev, ...(data || [])]);
        }
    }


  return { transactionCategories, fetchCategories, addTransactionCategory, };
}
