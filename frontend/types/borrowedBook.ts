// types/borrowedBook.ts
import { BookRead } from './scanTypes';

export enum BorrowStatus {
	ACTIVE = 'ACTIVE',
	RETURNED = 'RETURNED',
	OVERDUE = 'OVERDUE'
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

export interface BorrowStatistics {
	total: number;
	active: number;
	returned: number;
	overdue: number;
}
