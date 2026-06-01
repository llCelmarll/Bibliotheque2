import { LoanStatus } from './loan';

export type Periodicity = 'monthly' | 'weekly' | 'quarterly' | 'irregular';

export interface MagazineSeries {
    id: number;
    title: string;
    publisher?: string;
    periodicity?: Periodicity;
    cover_url?: string;
    owner_id?: number;
    created_at: string;
    updated_at?: string;
    issue_count: number;
}

export interface MagazineIssue {
    id: number;
    series_id: number;
    series_title?: string;
    issue_number?: number;
    title?: string;
    published_date?: string;
    cover_url?: string;
    owner_id?: number;
    is_read?: boolean | null;
    read_date?: string;
    rating?: number | null;
    notes?: string | null;
    is_lendable: boolean;
    created_at: string;
    updated_at?: string;
    current_loan?: MagazineCurrentLoan;
}

export interface MagazineCurrentLoan {
    id: number;
    contact_id: number;
    contact?: {
        id: number;
        name: string;
    };
    loan_date: string;
    due_date?: string;
    return_date?: string;
    status: LoanStatus;
    notes?: string;
}

export interface MagazineSeriesCreate {
    title: string;
    publisher?: string;
    periodicity?: Periodicity;
    cover_url?: string;
}

export interface MagazineSeriesUpdate {
    title?: string;
    publisher?: string;
    periodicity?: Periodicity;
    cover_url?: string;
}

export interface MagazineIssueCreate {
    series_id: number;
    issue_number?: number;
    title?: string;
    published_date?: string;
    cover_url?: string;
    is_read?: boolean;
    rating?: number;
    notes?: string;
    is_lendable?: boolean;
}

export interface MagazineIssueUpdate {
    issue_number?: number;
    title?: string;
    published_date?: string;
    cover_url?: string;
    is_read?: boolean | null;
    read_date?: string | null;
    rating?: number | null;
    notes?: string | null;
    is_lendable?: boolean;
}

export interface MagazineIssueBulkCreate {
    series_id: number;
    issue_range: string;
    published_date_prefix?: string;
}

export interface MagazineLoanCreate {
    issue_id: number;
    contact: number | string | { name: string; email?: string; phone?: string };
    loan_date?: string;
    due_date?: string;
    notes?: string;
}
