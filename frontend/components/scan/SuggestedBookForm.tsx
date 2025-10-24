// components/scan/SuggestedBookForm.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import { SuggestedBook, BookCreate } from "@/types/scanTypes";

// Interface pour le formulaire - utilise la structure BookCreate pour la création
interface BookFormData extends Omit<BookCreate, 'authors' | 'publisher' | 'genres'> {
	authors: string;      // String pour saisie (noms séparés par des virgules)
	publisher: string;    // String pour saisie
	genres: string;       // String pour saisie (noms séparés par des virgules)
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

interface SuggestedBookFormProps {
	initialData: SuggestedBook;
	onSubmit: (values: BookCreate) => Promise<void>;
}

// Fonction pour convertir SuggestedBook vers BookFormData
const suggestedBookToFormData = (suggested: SuggestedBook): BookFormData => ({
	title: suggested.title || '',
	isbn: suggested.isbn || '',
	publishedDate: suggested.published_date || '',
	pageCount: suggested.page_count || undefined,
	barcode: suggested.barcode || '',
	coverUrl: suggested.cover_url || '',
	authors: suggested.authors?.join(', ') || '',
	publisher: suggested.publisher || '',
	genres: suggested.genres?.join(', ') || '',
});

// Fonction pour convertir BookFormData vers BookCreate
const formDataToBookCreate = (formData: BookFormData): BookCreate => ({
	title: formData.title,
	isbn: formData.isbn || undefined,
	publishedDate: formData.publishedDate || undefined,
	pageCount: formData.pageCount,
	barcode: formData.barcode || undefined,
	coverUrl: formData.coverUrl || undefined,
	authors: formData.authors ? formData.authors.split(',').map(author => ({ name: author.trim() })) : [],
	publisher: formData.publisher ? { name: formData.publisher } : undefined,
	genres: formData.genres ? formData.genres.split(',').map(genre => ({ name: genre.trim() })) : [],
});

export const SuggestedBookForm: React.FC<SuggestedBookFormProps> = ({
																		initialData,
																		onSubmit
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
					style={[styles.input, hasError && styles.inputError]}
					value={formik.values[fieldName]?.toString() || ''}
					onChangeText={formik.handleChange(fieldName)}
					onBlur={formik.handleBlur(fieldName)}
					placeholder={placeholder}
					multiline={multiline}
					keyboardType={keyboardType}
				/>
				{hasError && (
					<Text style={styles.errorText}>
						{formik.errors[fieldName] as string}
					</Text>
				)}
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
				{(formik) => (
					<ScrollView style={styles.form}>
						{renderFormField('Titre *', 'title', formik, 'Titre du livre')}
						
						{renderFormField('ISBN', 'isbn', formik, '978XXXXXXXXX')}
						
						{renderFormField('Date de publication', 'publishedDate', formik, 'YYYY-MM-DD')}
						
						{renderFormField('Nombre de pages', 'pageCount', formik, '0', false, 'numeric')}
						
						{renderFormField('Code-barres', 'barcode', formik, 'Code-barres')}
						
						{renderFormField('URL de couverture', 'coverUrl', formik, 'https://...', false, 'url')}

						{renderFormField('Auteurs', 'authors', formik, 'Nom1, Nom2, Nom3', true)}
						
						{renderFormField('Éditeur', 'publisher', formik, 'Nom de l\'éditeur')}
						
						{renderFormField('Genres', 'genres', formik, 'Genre1, Genre2, Genre3', true)}

						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={[styles.button, styles.resetButton]}
								onPress={() => formik.resetForm()}
							>
								<Text style={styles.resetButtonText}>Réinitialiser</Text>
							</TouchableOpacity>
							
							<TouchableOpacity
								style={[styles.button, styles.submitButton]}
								onPress={() => formik.handleSubmit()}
								disabled={formik.isSubmitting || !formik.isValid}
							>
								<Text style={styles.submitButtonText}>
									{formik.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
								</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				)}
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
	buttonContainer: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 24,
		marginBottom: 16,
	},
	button: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	resetButton: {
		backgroundColor: '#95a5a6',
		borderWidth: 1,
		borderColor: '#7f8c8d',
	},
	submitButton: {
		backgroundColor: '#3498db',
		borderWidth: 1,
		borderColor: '#2980b9',
	},
	resetButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '500',
	},
	submitButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
});