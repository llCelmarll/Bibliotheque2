/**
 * Types pour la gestion des contacts (prêts et emprunts)
 */

/**
 * Représente un contact complet avec toutes ses propriétés
 */
export interface Contact {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    created_at: string;
    active_loans_count?: number;
    active_borrows_count?: number;
    linked_user_id?: number;
    linked_user_username?: string;
    library_shared: boolean;
}

/**
 * Interface pour créer un nouveau contact
 */
export interface ContactCreate {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
}

/**
 * Interface pour mettre à jour un contact existant
 * Tous les champs sont optionnels pour permettre des mises à jour partielles
 */
export interface ContactUpdate {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    linked_user_id?: number | null;
    library_shared?: boolean;
}
