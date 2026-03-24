import React, { useState, useCallback } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Modal,
	ScrollView,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { FetchBooksAdvancedParams } from "@/services/booksService";
import { StarRating } from "@/components/StarRating";
import { useTheme } from "@/contexts/ThemeContext";

interface AdvancedSearchModalProps {
	visible: boolean;
	onClose: () => void;
	onSearch: (params: FetchBooksAdvancedParams) => void;
	sortBy: string;
	order: "asc" | "desc";
}

const emptyParams: FetchBooksAdvancedParams = {};

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
	visible,
	onClose,
	onSearch,
	sortBy,
	order,
}) => {
	const theme = useTheme();
	const [title, setTitle] = useState("");
	const [author, setAuthor] = useState("");
	const [publisher, setPublisher] = useState("");
	const [genre, setGenre] = useState("");
	const [isbn, setIsbn] = useState("");
	const [yearMin, setYearMin] = useState("");
	const [yearMax, setYearMax] = useState("");
	const [pageMin, setPageMin] = useState("");
	const [pageMax, setPageMax] = useState("");
	const [isRead, setIsRead] = useState<boolean | null>(null);
	const [ratingMin, setRatingMin] = useState<number | null>(null);
	const [notes, setNotes] = useState("");

	const handleSearch = useCallback(() => {
		const params: FetchBooksAdvancedParams = {
			sortBy,
			order,
		};
		if (title.trim()) params.title = title.trim();
		if (author.trim()) params.author = author.trim();
		if (publisher.trim()) params.publisher = publisher.trim();
		if (genre.trim()) params.genre = genre.trim();
		if (isbn.trim()) params.isbn = isbn.trim();
		const yMin = parseInt(yearMin, 10);
		if (!isNaN(yMin)) params.yearMin = yMin;
		const yMax = parseInt(yearMax, 10);
		if (!isNaN(yMax)) params.yearMax = yMax;
		const pMin = parseInt(pageMin, 10);
		if (!isNaN(pMin) && pMin >= 1) params.pageMin = pMin;
		const pMax = parseInt(pageMax, 10);
		if (!isNaN(pMax) && pMax >= 1) params.pageMax = pMax;
		if (isRead !== null) params.isRead = isRead;
		if (ratingMin !== null && ratingMin >= 0) params.ratingMin = ratingMin;
		if (notes.trim()) params.notes = notes.trim();
		onSearch(params);
		onClose();
	}, [
		title,
		author,
		publisher,
		genre,
		isbn,
		yearMin,
		yearMax,
		pageMin,
		pageMax,
		isRead,
		ratingMin,
		notes,
		sortBy,
		order,
		onSearch,
		onClose,
	]);

	const handleReset = useCallback(() => {
		setTitle("");
		setAuthor("");
		setPublisher("");
		setGenre("");
		setIsbn("");
		setYearMin("");
		setYearMax("");
		setPageMin("");
		setPageMax("");
		setIsRead(null);
		setRatingMin(null);
		setNotes("");
	}, []);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			onRequestClose={onClose}
			transparent
		>
			<KeyboardAvoidingView
				style={[styles.overlay, { backgroundColor: `${theme.textPrimary}80` }]}
				behavior={undefined}
			>
				<View style={[styles.modal, { backgroundColor: theme.bgCard }]}>
					<View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
						<Text style={[styles.title, { color: theme.textPrimary }]}>Recherche avancée</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<MaterialIcons name="close" size={24} color={theme.textPrimary} />
						</TouchableOpacity>
					</View>
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Titre</Text>
						<TextInput
							style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
							value={title}
							onChangeText={setTitle}
							placeholder="Rechercher dans le titre"
							placeholderTextColor={theme.textMuted}
							autoCapitalize="none"
						/>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Auteur</Text>
						<TextInput
							style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
							value={author}
							onChangeText={setAuthor}
							placeholder="Nom de l'auteur"
							placeholderTextColor={theme.textMuted}
						/>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Éditeur</Text>
						<TextInput
							style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
							value={publisher}
							onChangeText={setPublisher}
							placeholder="Nom de l'éditeur"
							placeholderTextColor={theme.textMuted}
						/>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Genre</Text>
						<TextInput
							style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
							value={genre}
							onChangeText={setGenre}
							placeholder="Nom du genre"
							placeholderTextColor={theme.textMuted}
						/>
						<Text style={[styles.label, { color: theme.textSecondary }]}>ISBN</Text>
						<TextInput
							style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
							value={isbn}
							onChangeText={setIsbn}
							placeholder="ISBN"
							placeholderTextColor={theme.textMuted}
							keyboardType="default"
						/>
						<View style={styles.row}>
							<View style={styles.half}>
								<Text style={[styles.label, { color: theme.textSecondary }]}>Année min</Text>
								<TextInput
									style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
									value={yearMin}
									onChangeText={setYearMin}
									placeholder="ex. 1990"
									placeholderTextColor={theme.textMuted}
									keyboardType="number-pad"
								/>
							</View>
							<View style={styles.half}>
								<Text style={[styles.label, { color: theme.textSecondary }]}>Année max</Text>
								<TextInput
									style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
									value={yearMax}
									onChangeText={setYearMax}
									placeholder="ex. 2024"
									placeholderTextColor={theme.textMuted}
									keyboardType="number-pad"
								/>
							</View>
						</View>
						<View style={styles.row}>
							<View style={styles.half}>
								<Text style={[styles.label, { color: theme.textSecondary }]}>Pages min</Text>
								<TextInput
									style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
									value={pageMin}
									onChangeText={setPageMin}
									placeholder="ex. 100"
									placeholderTextColor={theme.textMuted}
									keyboardType="number-pad"
								/>
							</View>
							<View style={styles.half}>
								<Text style={[styles.label, { color: theme.textSecondary }]}>Pages max</Text>
								<TextInput
									style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
									value={pageMax}
									onChangeText={setPageMax}
									placeholder="ex. 500"
									placeholderTextColor={theme.textMuted}
									keyboardType="number-pad"
								/>
							</View>
						</View>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Statut de lecture</Text>
						<View style={styles.chipRow}>
							{([null, true, false] as const).map((val) => (
								<TouchableOpacity
									key={val === null ? "tous" : val ? "lu" : "nonlu"}
									style={[
										styles.chip,
										{ backgroundColor: theme.bgMuted },
										isRead === val && { backgroundColor: theme.accent },
									]}
									onPress={() => setIsRead(val)}
								>
									<Text
										style={[
											styles.chipText,
											{ color: theme.textPrimary },
											isRead === val && { color: theme.textInverse },
										]}
									>
										{val === null ? "Tous" : val ? "Lu" : "Non lu"}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Note minimale</Text>
						<View style={styles.starRow}>
							<TouchableOpacity
								style={[
									styles.chip,
									{ backgroundColor: theme.bgMuted },
									ratingMin === null && { backgroundColor: theme.accent },
								]}
								onPress={() => setRatingMin(null)}
							>
								<Text
									style={[
										styles.chipText,
										{ color: theme.textPrimary },
										ratingMin === null && { color: theme.textInverse },
									]}
								>
									Toutes
								</Text>
							</TouchableOpacity>
							<StarRating
								value={ratingMin}
								editable
								onChange={(v) => setRatingMin(v)}
								size={28}
							/>
						</View>
						<Text style={[styles.label, { color: theme.textSecondary }]}>Recherche dans les notes</Text>
						<TextInput
							style={[styles.input, styles.notesInput, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
							value={notes}
							onChangeText={setNotes}
							placeholder="Texte présent dans les notes"
							placeholderTextColor={theme.textMuted}
							multiline
							numberOfLines={2}
						/>
					</ScrollView>
					<View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
						<TouchableOpacity
							style={[styles.resetButton, { backgroundColor: theme.bgMuted }]}
							onPress={handleReset}
						>
							<Text style={[styles.resetButtonText, { color: theme.textPrimary }]}>Réinitialiser</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.searchButton, { backgroundColor: theme.accent }]}
							onPress={handleSearch}
						>
							<MaterialIcons name="search" size={20} color={theme.textInverse} />
							<Text style={[styles.searchButtonText, { color: theme.textInverse }]}>Rechercher</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
	},
	modal: {
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		maxHeight: "90%",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 16,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
	},
	closeButton: {
		padding: 4,
	},
	scroll: {
		maxHeight: 400,
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		marginBottom: 6,
		marginTop: 12,
	},
	input: {
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	notesInput: {
		minHeight: 60,
		textAlignVertical: "top",
	},
	row: {
		flexDirection: "row",
		gap: 12,
	},
	half: {
		flex: 1,
	},
	chipRow: {
		flexDirection: "row",
		gap: 8,
		flexWrap: "wrap",
	},
	chip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
	},
	chipText: {
		fontSize: 14,
	},
	starRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: 12,
		padding: 16,
		borderTopWidth: 1,
	},
	resetButton: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	resetButtonText: {
		fontSize: 16,
	},
	searchButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 12,
		borderRadius: 8,
	},
	searchButtonText: {
		fontSize: 16,
		fontWeight: "600",
	},
});
