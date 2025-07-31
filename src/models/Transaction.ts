export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO string
  description?: string;
}