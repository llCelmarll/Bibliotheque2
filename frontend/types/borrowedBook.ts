// types/borrowedBook.ts
import { BookRead } from './scanTypes';
import { Contact } from './contact';

export enum BorrowStatus {
	ACTIVE = 'active',
	RETURNED = 'returned',
	OVERDUE = 'overdue'
}

export interface BorrowedBook {
	id: number;
	book_id: number;
	user_id: number;
	contact_id?: number;
	contact?: Contact;
	borrowed_from: string; // Legacy, gardé pour rétrocompatibilité
	borrowed_date: string;
	expected_return_date?: string;
	return_date?: string;
	status: BorrowStatus;
	notes?: string;
	created_at: string;
	updated_at: string;
	calendar_event_id?: string;

	// Relations
	book?: BookRead;
}

export interface BorrowedBookCreate {
	book_id: number;
	contact: number | string | {
		name: string;
		email?: string;
		phone?: string;
		notes?: string;
	};
	borrowed_date?: string;
	expected_return_date?: string;
	notes?: string;
}

export interface BorrowedBookUpdate {
	contact?: number | string | {
		name: string;
		email?: string;
		phone?: string;
		notes?: string;
	};
	borrowed_date?: string;
	expected_return_date?: string;
	notes?: string;
	calendar_event_id?: string;
}

export interface BorrowStatistics {
	total: number;
	active: number;
	returned: number;
	overdue: number;
}
