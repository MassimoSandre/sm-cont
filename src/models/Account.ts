export interface Account {
    id: number;

    category_id: number;
    parent_id?: number;

    name: string;
    description?: string;
    type: string;

    balance: number;
    balance_decimal: number;

    virtual: boolean;
    budget: boolean;
    currency: string;

    color: string;
    icon: string;
}