export interface TransactionCategory {
    id: number;
    parent_id?: number;

    name: string;
    description?: string;
    _type: string;

    color: string;
    icon: string;
}