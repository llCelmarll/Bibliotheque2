// components/scan/BookForm.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { SuggestedBook, BookCreate } from "@/types/scanTypes";
import { AuthorSelector, PublisherSelector, GenreSelector } from '@/components/forms';
import { Author, Publisher, Genre, Entity, PublisherMetadata, GenreMetadata } from '@/types/entityTypes';
import { ImagePreview } from './ImagePreview';

// Feature flag pour activer les nouveaux sélecteurs d'entités
const USE_ENTITY_SELECTORS = true;

// Interface pour le formulaire - utilise la structure BookCreate pour la création
interface BookFormData extends Omit<BookCreate, 'authors' | 'publisher' | 'genres'> {
	authors: Author[] | string;                                    // Array d'entités ou string (selon le flag)
	publisher: Entity<PublisherMetadata>[] | string;              // Array d'entités ou string (selon le flag)
	genres: Entity<GenreMetadata>[] | string;                     // Array d'entités ou string (selon le flag)
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
	coverUrl: Yup.string().url('URL invalide'),
});

interface BookFormProps {
	initialData: SuggestedBook;
	onSubmit: (values: BookCreate) => Promise<void>;
	submitButtonText?: string;
	submitButtonLoadingText?: string;
	disableInternalScroll?: boolean;
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
});

// Fonction pour convertir BookFormData vers BookCreate
const formDataToBookCreate = (formData: BookFormData): BookCreate => ({
	title: formData.title,
	isbn: formData.isbn || undefined,
	published_date: formData.published_date || undefined,  // Aligné avec le backend
	page_count: formData.page_count,                       // Aligné avec le backend
	barcode: formData.barcode || undefined,
	cover_url: formData.cover_url || undefined,            // Aligné avec le backend
	authors: USE_ENTITY_SELECTORS && Array.isArray(formData.authors)
		? formData.authors.map(author => 
			author.exists ? { name: author.name, id: author.id ?? undefined, exists: true } : author.name
		)
		: typeof formData.authors === 'string' && formData.authors
		? formData.authors.split(',').map(author => author.trim())
		: [],
	publisher: USE_ENTITY_SELECTORS && Array.isArray(formData.publisher)
		? (formData.publisher.length > 0 ? 
			formData.publisher[0].exists 
				? { name: formData.publisher[0].name, id: formData.publisher[0].id ?? undefined, exists: true }
				: formData.publisher[0].name
			: undefined)
		: typeof formData.publisher === 'string' && formData.publisher
		? formData.publisher
		: undefined,
	genres: USE_ENTITY_SELECTORS && Array.isArray(formData.genres)
		? formData.genres.map(genre => 
			genre.exists ? { name: genre.name, id: genre.id ?? undefined, exists: true } : genre.name
		)
		: typeof formData.genres === 'string' && formData.genres
		? formData.genres.split(',').map((genre: string) => genre.trim())
		: [],
});

export const BookForm: React.FC<BookFormProps> = ({
																		initialData,
																		onSubmit,
																		submitButtonText = 'Enregistrer le livre',
																		submitButtonLoadingText = 'Enregistrement...',
																		disableInternalScroll = false
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

	const handleSubmit = async (values: BookFormData) => {
		const bookCreate = formDataToBookCreate(values);
		await onSubmit(bookCreate);
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

	const renderCoverUrlField = (formik: FormikProps<BookFormData>) => {
		const hasError = formik.touched.cover_url && formik.errors.cover_url;
		const coverUrl = formik.values.cover_url || '';

		return (
			<View style={styles.fieldContainer}>
				<Text style={styles.label}>📖 URL de couverture</Text>
				<TextInput
					style={[styles.input, hasError ? styles.inputError : null]}
					value={coverUrl}
					onChangeText={formik.handleChange('cover_url')}
					onBlur={formik.handleBlur('cover_url')}
					placeholder="https://example.com/couverture.jpg"
					keyboardType="url"
					autoCapitalize="none"
					autoCorrect={false}
				/>
				
				{/* Aperçu de l'image avec composant séparé */}
				{coverUrl ? (
					<ImagePreview url={coverUrl} debounceMs={1500} />
				) : null}
				
				{hasError ? (
					<Text style={styles.errorText}>
						{formik.errors.cover_url as string}
					</Text>
				) : null}
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
						
						{renderFormField('Date de publication', 'published_date', formik, 'YYYY-MM-DD')}
						
						{renderFormField('Nombre de pages', 'page_count', formik, '0', false, 'numeric')}
						
						{renderFormField('Code-barres', 'barcode', formik, 'Code-barres')}
						
						{/* Champ URL de couverture avec aperçu */}
						{renderCoverUrlField(formik)}

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
});