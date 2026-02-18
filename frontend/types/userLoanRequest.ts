import { Book } from './book';

export enum UserLoanRequestStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    CANCELLED = 'cancelled',
    RETURNED = 'returned',
}

export interface UserLoanRequest {
    id: number;
    requester_id: number;
    requester_username: string;
    lender_id: number;
    lender_username: string;
    book: Book;
    status: UserLoanRequestStatus;
    message?: string;
    response_message?: string;
    request_date: string;
    response_date?: string;
    due_date?: string;
    return_date?: string;
    created_at: string;
    updated_at?: string;
}

export interface UserLoanRequestCreate {
    book_id: number;
    lender_id: number;
    message?: string;
    due_date?: string;
}

export interface UserLoanRequestAccept {
    response_message?: string;
    due_date?: string;
}

export interface UserLoanRequestDecline {
    response_message?: string;
}

export interface LibraryPage {
    total: number;
    items: Book[];
}
