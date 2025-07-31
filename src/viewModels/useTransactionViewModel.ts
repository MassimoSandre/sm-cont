import { useState, useEffect } from 'react';
import type { Transaction } from '../models/Transaction';
import { invoke } from '@tauri-apps/api/core';

export function useTransactionViewModel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        invoke<Transaction[]>('get_transactions')
            .then((data) => {
                setTransactions(data);
            })
            .catch((err) => {
                setError('Errore nel caricamento delle transazioni: ' + err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

  const addTransaction = async (transaction: Transaction) => {
    try {
      const newTransaction = await invoke<Transaction>('add_transaction', { transaction });
      setTransactions((prev) => [...prev, newTransaction]);
    } catch (err) {
      setError('Errore nell\'aggiunta della transazione: ' + err);
    }

    
};
return {
    transactions,
    addTransaction,
  };
}