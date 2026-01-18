// types/borrowedBook.ts
import { BookRead } from './scanTypes';

export enum BorrowStatus {
	ACTIVE = 'active',
	RETURNED = 'returned',
	OVERDUE = 'overdue'
}

export interface BorrowedBook {
	id: number;
	book_id: number;
	user_id: number;
	borrowed_from: string;
	borrowed_date: string;
	expected_return_date?: string;
	return_date?: string;
	status: BorrowStatus;
	notes?: string;
	created_at: string;
	updated_at: string;

	// Relations
	book?: BookRead;  // Import depuis scanTypes
}

export interface BorrowedBookCreate {
	book_id: number;
	borrowed_from: string;
	borrowed_date?: string;
	expected_return_date?: string;
	notes?: string;
}

export interface BorrowedBookUpdate {
	borrowed_from?: string;
	borrowed_date?: string;
	expected_return_date?: string;
	notes?: string;
}

export interface BorrowStatistics {
	total: number;
	active: number;
	returned: number;
	overdue: number;
}
