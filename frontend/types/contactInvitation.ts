export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    CANCELLED = 'cancelled',
}

export interface ContactInvitation {
    id: number;
    sender_id: number;
    sender_username: string;
    recipient_id: number;
    recipient_username: string;
    status: InvitationStatus;
    message?: string;
    created_at: string;
    responded_at?: string;
}

export interface ContactInvitationCreate {
    recipient_id: number;
    message?: string;
}
