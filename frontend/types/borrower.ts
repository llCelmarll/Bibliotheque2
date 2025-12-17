/**
 * Types pour la gestion des emprunteurs
 */

/**
 * Représente un emprunteur complet avec toutes ses propriétés
 * @interface Borrower
 * @property {number} id - Identifiant unique de l'emprunteur
 * @property {string} name - Nom complet de l'emprunteur
 * @property {string} [email] - Adresse email (optionnel)
 * @property {string} [phone] - Numéro de téléphone (optionnel)
 * @property {string} [notes] - Notes libres sur l'emprunteur (optionnel)
 * @property {string} created_at - Date de création de l'emprunteur
 * @property {number} [active_loans_count] - Nombre de prêts actifs (optionnel, fourni par le backend)
 */
export interface Borrower {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    created_at: string;
    active_loans_count?: number;
}

/**
 * Interface pour créer un nouvel emprunteur
 * @interface BorrowerCreate
 * @property {string} name - Nom complet de l'emprunteur (requis)
 * @property {string} [email] - Adresse email (optionnel)
 * @property {string} [phone] - Numéro de téléphone (optionnel)
 * @property {string} [notes] - Notes libres sur l'emprunteur (optionnel)
 */
export interface BorrowerCreate {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
}

/**
 * Interface pour mettre à jour un emprunteur existant
 * Tous les champs sont optionnels pour permettre des mises à jour partielles
 * @interface BorrowerUpdate
 * @property {string} [name] - Nouveau nom (optionnel)
 * @property {string} [email] - Nouvelle adresse email (optionnel)
 * @property {string} [phone] - Nouveau numéro de téléphone (optionnel)
 * @property {string} [notes] - Nouvelles notes (optionnel)
 */
export interface BorrowerUpdate {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
}
