export interface Transaction {
  id: number;
  category_id: number;
  from_account_id?: number;
  to_account_id?: number;

  _type: string;
  status: string;
  method: string;

  amount: number;
  amount_decimal: number;

  currency: string;
  exchange_rate: number;

  date: string; 
  transaction_date: string;
  scheduled_date?: string;

  description?: string;

  note?: string;
  tags?: string;

  color: string;
  icon: string;
}