export interface TransactionDetail {
    id: number;
    transaction_id: number;

    amount: number;
    amount_decimal: number;

    description?: string;
    note?: string;
    tags?: string;

    color: string;
    icon: string;
}
