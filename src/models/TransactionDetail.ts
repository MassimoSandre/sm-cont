export interface TransactionDetail {
    id: number;
    transaction_id: number;

    amount: number;
    amount_decimal: number;

    description?: string;
    notes?: string;
    tags?: string;

    color: string;
    icon: string;
}
