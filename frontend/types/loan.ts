import { Book } from './book';
import { Borrower } from './borrower';

/**
 * Types pour la gestion des prêts de livres
 */

/**
 * Énumération des statuts possibles d'un prêt
 * @enum {string}
 */
export enum LoanStatus {
    ACTIVE = 'active',
    RETURNED = 'returned',
    OVERDUE = 'overdue'
}

/**
 * Représente un prêt complet avec toutes ses propriétés et relations
 * @interface Loan
 * @property {number} id - Identifiant unique du prêt
 * @property {number} book_id - ID du livre prêté
 * @property {Book} book - Données complètes du livre prêté
 * @property {number} borrower_id - ID de l'emprunteur
 * @property {Borrower} borrower - Données complètes de l'emprunteur
 * @property {string} loan_date - Date de début du prêt (ISO 8601)
 * @property {string} [due_date] - Date d'échéance du prêt (ISO 8601, optionnel)
 * @property {string} [return_date] - Date de retour effective (ISO 8601, optionnel)
 * @property {LoanStatus} status - Statut actuel du prêt
 * @property {string} [notes] - Notes libres sur le prêt (optionnel)
 */
export interface Loan {
    id: number;
    book_id: number;
    book: Book;
    borrower_id: number;
    borrower: Borrower;
    loan_date: string;
    due_date?: string;
    return_date?: string;
    status: LoanStatus;
    notes?: string;
    calendar_event_id?: string;
}

/**
 * Interface pour créer un nouveau prêt
 * Le champ borrower accepte 3 formats différents :
 * - number : ID d'un emprunteur existant
 * - string : Nom d'un emprunteur (sera créé automatiquement s'il n'existe pas)
 * - object : Données complètes pour créer un nouvel emprunteur
 *
 * @interface LoanCreate
 * @property {number} book_id - ID du livre à prêter (requis)
 * @property {number | string | BorrowerCreate} borrower - Emprunteur (3 formats possibles)
 * @property {string} [loan_date] - Date de début du prêt (optionnel, défaut: maintenant)
 * @property {string} [due_date] - Date d'échéance du prêt (optionnel)
 * @property {string} [notes] - Notes libres sur le prêt (optionnel)
 */
export interface LoanCreate {
    book_id: number;
    borrower: number | string | {
        name: string;
        email?: string;
        phone?: string;
        notes?: string;
    };
    loan_date?: string;
    due_date?: string;
    notes?: string;
    calendar_event_id?: string;
}

/**
 * Interface pour mettre à jour un prêt existant
 * Tous les champs sont optionnels pour permettre des mises à jour partielles
 * @interface LoanUpdate
 * @property {string} [due_date] - Nouvelle date d'échéance (optionnel)
 * @property {string} [notes] - Nouvelles notes (optionnel)
 */
export interface LoanUpdate {
    due_date?: string;
    notes?: string;
    calendar_event_id?: string;
}

/**
 * Interface pour enregistrer le retour d'un livre
 * @interface LoanReturn
 * @property {string} [return_date] - Date de retour (optionnel, défaut: maintenant)
 */
export interface LoanReturn {
    return_date?: string;
}

/**
 * Interface pour les statistiques de prêts
 * @interface LoanStatistics
 * @property {number} total_loans - Nombre total de prêts
 * @property {number} active_loans - Nombre de prêts actifs
 * @property {number} returned_loans - Nombre de prêts retournés
 * @property {number} overdue_loans - Nombre de prêts en retard
 */
export interface LoanStatistics {
    total_loans: number;
    active_loans: number;
    returned_loans: number;
    overdue_loans: number;
}
