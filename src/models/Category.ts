export interface Category {
    id : number;
    parent_id?: number;

    name: string;
    description?: string;

    type: string;

    color: string;
    icon: string;
}