// components/scan/BookForm.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { SuggestedBook, BookCreate } from "@/types/scanTypes";
import { AuthorSelector, PublisherSelector, GenreSelector, SeriesSelector } from '@/components/forms';
import { Author, Publisher, Genre, Series, Entity, PublisherMetadata, GenreMetadata, SeriesMetadata } from '@/types/entityTypes';
import { CoverPicker } from './CoverPicker';
import { Contact } from '@/types/contact';
import { ContactSelector } from '@/components/forms/ContactSelector';
import { StarRating } from '@/components/StarRating';

// Feature flag pour activer les nouveaux sélecteurs d'entités
const USE_ENTITY_SELECTORS = true;

// Fonction utilitaire pour convertir DD/MM/YYYY -> YYYY-MM-DD
const convertDateToISO = (dateStr: string): string | undefined => {
	if (!dateStr || dateStr.trim() === '') return undefined;
	const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return undefined;
	const [, day, month, year] = match;
	return `${year}-${month}-${day}`;
};

// Interface pour le formulaire - utilise la structure BookCreate pour la création
interface BookFormData extends Omit<BookCreate, 'authors' | 'publisher' | 'genres' | 'series'> {
	authors: Author[] | string;
	publisher: Entity<PublisherMetadata>[] | string;
	genres: Entity<GenreMetadata>[] | string;
	series: Entity<SeriesMetadata>[] | string;
}

// Schéma de validation
const validationSchema = Yup.object().shape({
	title: Yup.string()
		.required('Le titre est requis')
		.min(2, 'Le titre doit contenir au moins 2 caractères'),
	isbn: Yup.string()
		.matches(/^(?:\d{10}|\d{13})$/, 'ISBN doit contenir 10 ou 13 chiffres'),
	publishedDate: Yup.string()
		.matches(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'Format: YYYY ou YYYY-MM ou YYYY-MM-DD'),
	pageCount: Yup.number()
		.positive('Le nombre de pages doit être positif')
		.integer('Le nombre de pages doit être un entier'),
	coverUrl: Yup.string().test('is-url-or-local', 'URL invalide', (value) => {
		if (!value) return true;
		if (value.startsWith('/covers/')) return true;
		try { new URL(value); return true; } catch { return false; }
	}),
	// Validation emprunt - le contact est géré par ContactSelector
	borrowed_date: Yup.string()
		.matches(/^\d{2}\/\d{2}\/\d{4}$/, 'Format: JJ/MM/AAAA'),
	expected_return_date: Yup.string()
		.matches(/^\d{2}\/\d{2}\/\d{4}$/, 'Format: JJ/MM/AAAA'),
});

interface BookFormProps {
	initialData: SuggestedBook;
	onSubmit: (values: BookCreate, localImageUri?: string | null) => Promise<void>;
	submitButtonText?: string;
	submitButtonLoadingText?: string;
	disableInternalScroll?: boolean;
	forceOwnership?: boolean;  // Forcer is_borrowed=false (pour livres retournés)
	isEditMode?: boolean;      // Masquer la section emprunt en mode modification
}

// Fonction pour convertir SuggestedBook vers BookFormData (maintenant synchrone car enrichie par le backend)
const suggestedBookToFormData = (suggested: SuggestedBook): BookFormData => ({
	title: suggested.title || '',
	isbn: suggested.isbn || '',
	published_date: suggested.published_date || '',
	page_count: suggested.page_count || undefined,
	barcode: suggested.barcode || '',
	cover_url: suggested.cover_url || '',
	authors: USE_ENTITY_SELECTORS
		? (suggested.authors?.map(suggestedAuthor => ({
				id: suggestedAuthor.id || undefined,
				name: suggestedAuthor.name,
				exists: suggestedAuthor.exists
			} as Author)) || [])
		: (suggested.authors?.map(a => a.name).join(', ') || ''),
	publisher: USE_ENTITY_SELECTORS
		? (suggested.publisher ? [{
				id: suggested.publisher.id || undefined,
				name: suggested.publisher.name,
				exists: suggested.publisher.exists
			} as Entity<PublisherMetadata>] : [])
		: (suggested.publisher?.name || ''),
	genres: USE_ENTITY_SELECTORS
		? (suggested.genres?.map(suggestedGenre => ({
				id: suggestedGenre.id || undefined,
				name: suggestedGenre.name,
				exists: suggestedGenre.exists
			} as Entity<GenreMetadata>)) || [])
		: (suggested.genres?.map(g => g.name).join(', ') || ''),
	series: suggested.series?.map(s => ({
			id: s.id || undefined,
			name: s.name,
			exists: s.exists,
			metadata: { volume_number: s.volume_number }
		} as Entity<SeriesMetadata>)) || [],
	// Initialiser champs de lecture (défaut: Non lu pour les nouveaux livres)
	is_read: suggested.is_read ?? false,
	read_date: suggested.read_date || '',
	rating: suggested.rating ?? null,
	notes: suggested.notes ?? '',
	// Initialiser champs d'emprunt vides
	is_borrowed: false,
	borrowed_from: '',
	borrowed_date: new Date().toLocaleDateString('fr-FR'), // Date d'aujourd'hui par défaut (DD/MM/YYYY)
	expected_return_date: '',
	borrow_notes: '',
	contact: undefined,
});

// Fonction pour convertir BookFormData vers BookCreate
const formDataToBookCreate = (formData: BookFormData, forceOwnership: boolean = false): BookCreate => {
	const bookCreate: BookCreate = {
		title: formData.title,
		isbn: formData.isbn || undefined,
		published_date: formData.published_date || undefined,  // Aligné avec le backend
		page_count: formData.page_count,                       // Aligné avec le backend
		barcode: formData.barcode || undefined,
		cover_url: formData.cover_url || undefined,            // Aligné avec le backend
		authors: USE_ENTITY_SELECTORS && Array.isArray(formData.authors)
			? formData.authors.map(author => {
				const result = author.exists && author.id ? author.id : { name: author.name };
				console.log(`📤 Auteur envoyé: exists=${author.exists}, id=${author.id}, name="${author.name}" => ${typeof result === 'number' ? `ID=${result}` : `{name: "${result.name}"}`}`);
				return result;
			})
			: typeof formData.authors === 'string' && formData.authors
			? formData.authors.split(',').map(author => author.trim())
			: [],
		publisher: USE_ENTITY_SELECTORS && Array.isArray(formData.publisher)
			? (formData.publisher.length > 0 ? (() => {
				const pub = formData.publisher[0];
				const result = pub.exists && pub.id ? pub.id : { name: pub.name };
				console.log(`📤 Éditeur envoyé: exists=${pub.exists}, id=${pub.id}, name="${pub.name}" => ${typeof result === 'number' ? `ID=${result}` : `{name: "${result.name}"}`}`);
				return result;
			})() : undefined)
			: typeof formData.publisher === 'string' && formData.publisher
			? formData.publisher
			: undefined,
		genres: USE_ENTITY_SELECTORS && Array.isArray(formData.genres)
			? formData.genres.map(genre => {
				const result = genre.exists && genre.id ? genre.id : { name: genre.name };
				console.log(`📤 Genre envoyé: exists=${genre.exists}, id=${genre.id}, name="${genre.name}" => ${typeof result === 'number' ? `ID=${result}` : `{name: "${result.name}"}`}`);
				return result;
			})
			: typeof formData.genres === 'string' && formData.genres
			? formData.genres.split(',').map((genre: string) => genre.trim())
			: [],
	series: USE_ENTITY_SELECTORS && Array.isArray(formData.series)
			? formData.series.map(s => {
				return s.exists && s.id ? { id: s.id, volume_number: s.metadata?.volume_number } : { name: s.name, volume_number: s.metadata?.volume_number };
			})
			: [],
	// Inclure champs de lecture
	is_read: formData.is_read ?? undefined,
	read_date: formData.read_date || undefined,
	rating: formData.rating ?? undefined,
	notes: formData.notes || undefined,
	// Inclure champs d'emprunt (convertir dates DD/MM/YYYY -> YYYY-MM-DD pour le backend)
	// Forcer is_borrowed=false si forceOwnership=true
	is_borrowed: forceOwnership ? false : formData.is_borrowed,
	contact: forceOwnership ? undefined : (formData.contact || undefined),
	borrowed_from: forceOwnership ? undefined : (formData.borrowed_from || undefined),
	borrowed_date: forceOwnership ? undefined : convertDateToISO(formData.borrowed_date),
	expected_return_date: forceOwnership ? undefined : convertDateToISO(formData.expected_return_date),
	borrow_notes: forceOwnership ? undefined : (formData.borrow_notes || undefined),
	};

	console.log('📦 BookCreate final:', JSON.stringify(bookCreate, null, 2));
	return bookCreate;
};

export const BookForm: React.FC<BookFormProps> = ({
																		initialData,
																		onSubmit,
																		submitButtonText = 'Enregistrer le livre',
																		submitButtonLoadingText = 'Enregistrement...',
																		disableInternalScroll = false,
																		forceOwnership = false,
																		isEditMode = false
																	}) => {
	const formInitialValues = suggestedBookToFormData(initialData);
	const formikRef = useRef<FormikProps<BookFormData> | null>(null);

	// Met à jour le formulaire quand les données initiales changent
	useEffect(() => {
		if (formikRef.current) {
			const newValues = suggestedBookToFormData(initialData);
			formikRef.current.setValues(newValues);
		}
	}, [initialData]);

	const [localImageUri, setLocalImageUri] = useState<string | null>(null);

	const handleSubmit = async (values: BookFormData) => {
		const bookCreate = formDataToBookCreate(values, forceOwnership);
		// Si une image locale est selectionnee, on ne passe pas cover_url
		// (elle sera mise a jour par l'upload cote API)
		if (localImageUri) {
			bookCreate.cover_url = undefined;
		}
		await onSubmit(bookCreate, localImageUri);
	};

	const renderFormField = (
		label: string,
		fieldName: keyof BookFormData,
		formik: FormikProps<BookFormData>,
		placeholder?: string,
		multiline?: boolean,
		keyboardType?: 'default' | 'numeric' | 'url'
	) => {
		const hasError = formik.touched[fieldName] && formik.errors[fieldName];
		
		return (
			<View style={styles.fieldContainer}>
				<Text style={styles.label}>{label}</Text>
				<TextInput
					style={[styles.input, hasError ? styles.inputError : null]}
					value={formik.values[fieldName]?.toString() || ''}
					onChangeText={formik.handleChange(fieldName)}
					onBlur={formik.handleBlur(fieldName)}
					placeholder={placeholder}
					multiline={multiline}
					keyboardType={keyboardType}
				/>
				{hasError ? (
					<Text style={styles.errorText}>
						{formik.errors[fieldName] as string}
					</Text>
				) : null}
			</View>
		);
	};

	const renderCoverPickerField = (formik: FormikProps<BookFormData>) => {
		return (
			<View style={styles.fieldContainer}>
				<CoverPicker
					coverUrl={formik.values.cover_url || ''}
					localImageUri={localImageUri}
					onCoverUrlChange={(url) => {
						formik.setFieldValue('cover_url', url);
						setLocalImageUri(null);
					}}
					onLocalImagePicked={(uri) => {
						setLocalImageUri(uri);
						formik.setFieldValue('cover_url', '');
					}}
					onClearCover={() => {
						setLocalImageUri(null);
						formik.setFieldValue('cover_url', '');
					}}
					error={formik.touched.cover_url ? formik.errors.cover_url as string : undefined}
				/>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.sectionTitle}>Informations du livre</Text>
			
			<Formik
				initialValues={formInitialValues}
				validationSchema={validationSchema}
				onSubmit={handleSubmit}
				innerRef={formikRef}
				enableReinitialize={true}
			>
				{(formik) => {
					const FormContainer = disableInternalScroll ? View : ScrollView;
					return (
					<FormContainer style={styles.form}>
						{renderFormField('Titre *', 'title', formik, 'Titre du livre')}
						
						{renderFormField('ISBN', 'isbn', formik, '978XXXXXXXXX')}
						
						{renderFormField('Date de publication', 'published_date', formik, 'Ex: 2023, Janvier 2023...')}
						
						{renderFormField('Nombre de pages', 'page_count', formik, '0', false, 'numeric')}
						
						{renderFormField('Code-barres', 'barcode', formik, 'Code-barres')}
						
						{/* Champ URL de couverture avec aperçu */}
						{renderCoverPickerField(formik)}

						{/* Champ Auteurs - Nouveau sélecteur ou champ texte selon le flag */}
						{USE_ENTITY_SELECTORS ? (
							<View style={styles.fieldContainer}>
								<AuthorSelector
									selectedEntities={Array.isArray(formik.values.authors) ? formik.values.authors : []}
									onEntitiesChange={(authors) => formik.setFieldValue('authors', authors)}
									disabled={formik.isSubmitting}
									error={formik.touched.authors && typeof formik.errors.authors === 'string' ? formik.errors.authors : undefined}
								/>
							</View>
						) : (
							renderFormField('Auteurs', 'authors', formik, 'Nom1, Nom2, Nom3', true)
						)}
						
						{/* Champ Éditeur - Nouveau sélecteur ou champ texte selon le flag */}
						{USE_ENTITY_SELECTORS ? (
							<View style={styles.fieldContainer}>
								<PublisherSelector
									selectedEntities={Array.isArray(formik.values.publisher) ? formik.values.publisher : []}
									onEntitiesChange={(publishers) => formik.setFieldValue('publisher', publishers)}
									disabled={formik.isSubmitting}
									error={formik.touched.publisher && typeof formik.errors.publisher === 'string' ? formik.errors.publisher : undefined}
								/>
							</View>
						) : (
							renderFormField('Éditeur', 'publisher', formik, 'Nom de l\'éditeur')
						)}
						
						{/* Champ Genres - Nouveau sélecteur ou champ texte selon le flag */}
						{USE_ENTITY_SELECTORS ? (
							<View style={styles.fieldContainer}>
								<GenreSelector
									selectedEntities={Array.isArray(formik.values.genres) ? formik.values.genres : []}
									onEntitiesChange={(genres) => formik.setFieldValue('genres', genres)}
									disabled={formik.isSubmitting}
									error={formik.touched.genres && typeof formik.errors.genres === 'string' ? formik.errors.genres : undefined}
								/>
							</View>
						) : (
							renderFormField('Genres', 'genres', formik, 'Genre1, Genre2, Genre3', true)
						)}

						{/* Champ Séries */}
						{USE_ENTITY_SELECTORS && (
							<SeriesSelector
								selectedEntities={Array.isArray(formik.values.series) ? formik.values.series : []}
								onEntitiesChange={(series) => formik.setFieldValue('series', series)}
								disabled={formik.isSubmitting}
								error={formik.touched.series && typeof formik.errors.series === 'string' ? formik.errors.series : undefined}
							/>
						)}

						{/* Section Lecture */}
						<View style={styles.sectionContainer}>
							<Text style={styles.sectionSubtitle}>Statut de lecture</Text>
							<View style={styles.readStatusRow}>
								{([
									{ key: true, label: 'Lu' },
									{ key: false, label: 'Non lu' },
								] as { key: boolean | undefined; label: string }[]).map((option) => (
									<TouchableOpacity
										key={String(option.key)}
										style={[
											styles.readStatusButton,
											formik.values.is_read === option.key && styles.readStatusButtonActive,
											formik.values.is_read === option.key && option.key === true && styles.readStatusButtonRead,
											formik.values.is_read === option.key && option.key === false && styles.readStatusButtonUnread,
										]}
										onPress={() => {
											formik.setFieldValue('is_read', option.key);
											if (option.key === true && !formik.values.read_date) {
												formik.setFieldValue('read_date', new Date().toISOString().split('T')[0]);
											} else if (option.key !== true) {
												formik.setFieldValue('read_date', '');
											}
										}}
									>
										<Text style={[
											styles.readStatusButtonText,
											formik.values.is_read === option.key && styles.readStatusButtonTextActive,
										]}>
											{option.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>
							{formik.values.is_read === true && (
								renderFormField('Date de lecture', 'read_date', formik, 'JJ/MM/AAAA')
							)}
						</View>

						{/* Section Notation et notes */}
						<View style={styles.sectionContainer}>
							<Text style={styles.sectionSubtitle}>Notation et notes</Text>
							<View style={styles.fieldContainer}>
								<Text style={styles.label}>Note (0-5)</Text>
								<StarRating
									value={formik.values.rating ?? null}
									editable={true}
									onChange={(value) => formik.setFieldValue('rating', value)}
								/>
							</View>
							<View style={styles.fieldContainer}>
								<Text style={styles.label}>Notes personnelles</Text>
								<TextInput
									style={[styles.input, styles.notesInput]}
									placeholder="Vos notes sur ce livre..."
									placeholderTextColor="#999"
									multiline
									numberOfLines={4}
									value={formik.values.notes || ''}
									onChangeText={(text) => formik.setFieldValue('notes', text)}
									onBlur={formik.handleBlur('notes')}
								/>
							</View>
						</View>

						{/* Section Emprunt - cachée si forceOwnership ou en mode modification */}
						{!forceOwnership && !isEditMode && (
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionSubtitle}>📚 Emprunt (optionnel)</Text>

								{/* Toggle is_borrowed */}
								<TouchableOpacity
									style={styles.toggleContainer}
									onPress={() => formik.setFieldValue('is_borrowed', !formik.values.is_borrowed)}
								>
									<Text style={styles.toggleLabel}>
										{formik.values.is_borrowed ? '☑️' : '☐'} Ce livre est emprunté
									</Text>
								</TouchableOpacity>

								{/* Champs conditionnels si is_borrowed=true */}
								{formik.values.is_borrowed && (
									<>
										<ContactSelector
											selectedContact={formik.values.contact as Contact | string | null}
											onContactChange={(contact) => {
												formik.setFieldValue('contact', contact);
												// Garder borrowed_from en sync pour legacy
												if (typeof contact === 'string') {
													formik.setFieldValue('borrowed_from', contact);
												} else if (contact && typeof contact === 'object') {
													formik.setFieldValue('borrowed_from', contact.name);
												}
											}}
											label="Emprunté à *"
											disabled={formik.isSubmitting}
										/>
										{renderFormField('Date d\'emprunt', 'borrowed_date', formik, 'JJ/MM/AAAA')}
										{renderFormField('Date de retour prévue', 'expected_return_date', formik, 'JJ/MM/AAAA')}
										{renderFormField('Notes', 'borrow_notes', formik, 'Notes sur l\'emprunt...', true)}
									</>
								)}
							</View>
						)}

						<TouchableOpacity
							style={[styles.button, styles.submitButton]}
							onPress={() => formik.handleSubmit()}
							disabled={formik.isSubmitting || !formik.isValid}
						>
							<Text style={styles.submitButtonText}>
								{formik.isSubmitting ? submitButtonLoadingText : submitButtonText}
							</Text>
						</TouchableOpacity>
					</FormContainer>
				)}}
			</Formik>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#f8f9fa',
		borderRadius: 12,
		margin: 16,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#2c3e50',
		marginBottom: 16,
		textAlign: 'center',
	},
	form: {
		flex: 1,
	},
	fieldContainer: {
		marginBottom: 16,
	},
	label: {
		fontSize: 16,
		fontWeight: '500',
		color: '#34495e',
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: '#bdc3c7',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		backgroundColor: '#ffffff',
		color: '#2c3e50',
	},
	inputError: {
		borderColor: '#e74c3c',
		backgroundColor: '#fdf2f2',
	},
	errorText: {
		color: '#e74c3c',
		fontSize: 14,
		marginTop: 4,
		fontStyle: 'italic',
	},
	button: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 24,
		marginBottom: 16,
	},
	submitButton: {
		backgroundColor: '#3498db',
		borderWidth: 1,
		borderColor: '#2980b9',
	},
	submitButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
	sectionContainer: {
		marginTop: 24,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#e0e0e0',
	},
	sectionSubtitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#2c3e50',
		marginBottom: 12,
	},
	toggleContainer: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		marginBottom: 16,
	},
	toggleLabel: {
		fontSize: 16,
		color: '#2c3e50',
		fontWeight: '500',
	},
	readStatusRow: {
		flexDirection: 'row',
		gap: 8,
		flexWrap: 'wrap',
		marginBottom: 12,
	},
	readStatusButton: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 16,
		backgroundColor: '#f0f0f0',
		borderWidth: 1,
		borderColor: '#ddd',
	},
	readStatusButtonActive: {
		backgroundColor: '#e9ecef',
		borderColor: '#6c757d',
	},
	readStatusButtonRead: {
		backgroundColor: '#d4edda',
		borderColor: '#28a745',
	},
	readStatusButtonUnread: {
		backgroundColor: '#e9ecef',
		borderColor: '#6c757d',
	},
	readStatusButtonText: {
		fontSize: 14,
		color: '#666',
	},
	readStatusButtonTextActive: {
		color: '#333',
		fontWeight: '600',
	},
	notesInput: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
});