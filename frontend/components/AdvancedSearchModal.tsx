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
				style={styles.overlay}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={styles.modal}>
					<View style={styles.header}>
						<Text style={styles.title}>Recherche avancée</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<MaterialIcons name="close" size={24} color="#333" />
						</TouchableOpacity>
					</View>
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						keyboardShouldPersistTaps="handled"
					>
						<Text style={styles.label}>Titre</Text>
						<TextInput
							style={styles.input}
							value={title}
							onChangeText={setTitle}
							placeholder="Rechercher dans le titre"
							autoCapitalize="none"
						/>
						<Text style={styles.label}>Auteur</Text>
						<TextInput
							style={styles.input}
							value={author}
							onChangeText={setAuthor}
							placeholder="Nom de l'auteur"
						/>
						<Text style={styles.label}>Éditeur</Text>
						<TextInput
							style={styles.input}
							value={publisher}
							onChangeText={setPublisher}
							placeholder="Nom de l'éditeur"
						/>
						<Text style={styles.label}>Genre</Text>
						<TextInput
							style={styles.input}
							value={genre}
							onChangeText={setGenre}
							placeholder="Nom du genre"
						/>
						<Text style={styles.label}>ISBN</Text>
						<TextInput
							style={styles.input}
							value={isbn}
							onChangeText={setIsbn}
							placeholder="ISBN"
							keyboardType="default"
						/>
						<View style={styles.row}>
							<View style={styles.half}>
								<Text style={styles.label}>Année min</Text>
								<TextInput
									style={styles.input}
									value={yearMin}
									onChangeText={setYearMin}
									placeholder="ex. 1990"
									keyboardType="number-pad"
								/>
							</View>
							<View style={styles.half}>
								<Text style={styles.label}>Année max</Text>
								<TextInput
									style={styles.input}
									value={yearMax}
									onChangeText={setYearMax}
									placeholder="ex. 2024"
									keyboardType="number-pad"
								/>
							</View>
						</View>
						<View style={styles.row}>
							<View style={styles.half}>
								<Text style={styles.label}>Pages min</Text>
								<TextInput
									style={styles.input}
									value={pageMin}
									onChangeText={setPageMin}
									placeholder="ex. 100"
									keyboardType="number-pad"
								/>
							</View>
							<View style={styles.half}>
								<Text style={styles.label}>Pages max</Text>
								<TextInput
									style={styles.input}
									value={pageMax}
									onChangeText={setPageMax}
									placeholder="ex. 500"
									keyboardType="number-pad"
								/>
							</View>
						</View>
						<Text style={styles.label}>Statut de lecture</Text>
						<View style={styles.chipRow}>
							{([null, true, false] as const).map((val) => (
								<TouchableOpacity
									key={val === null ? "tous" : val ? "lu" : "nonlu"}
									style={[
										styles.chip,
										isRead === val && styles.chipActive,
									]}
									onPress={() => setIsRead(val)}
								>
									<Text
										style={[
											styles.chipText,
											isRead === val && styles.chipTextActive,
										]}
									>
										{val === null ? "Tous" : val ? "Lu" : "Non lu"}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						<Text style={styles.label}>Note minimale</Text>
						<View style={styles.starRow}>
							<TouchableOpacity
								style={[styles.chip, ratingMin === null && styles.chipActive]}
								onPress={() => setRatingMin(null)}
							>
								<Text
									style={[
										styles.chipText,
										ratingMin === null && styles.chipTextActive,
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
						<Text style={styles.label}>Recherche dans les notes</Text>
						<TextInput
							style={[styles.input, styles.notesInput]}
							value={notes}
							onChangeText={setNotes}
							placeholder="Texte présent dans les notes"
							multiline
							numberOfLines={2}
						/>
					</ScrollView>
					<View style={styles.footer}>
						<TouchableOpacity
							style={styles.resetButton}
							onPress={handleReset}
						>
							<Text style={styles.resetButtonText}>Réinitialiser</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.searchButton}
							onPress={handleSearch}
						>
							<MaterialIcons name="search" size={20} color="#fff" />
							<Text style={styles.searchButtonText}>Rechercher</Text>
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
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	modal: {
		backgroundColor: "#fff",
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
		borderBottomColor: "#eee",
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
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
		color: "#555",
		marginBottom: 6,
		marginTop: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		backgroundColor: "#fff",
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
		backgroundColor: "#f0f0f0",
	},
	chipActive: {
		backgroundColor: "#3498db",
	},
	chipText: {
		fontSize: 14,
		color: "#333",
	},
	chipTextActive: {
		color: "#fff",
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
		borderTopColor: "#eee",
	},
	resetButton: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		backgroundColor: "#f0f0f0",
	},
	resetButtonText: {
		fontSize: 16,
		color: "#333",
	},
	searchButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 12,
		borderRadius: 8,
		backgroundColor: "#3498db",
	},
	searchButtonText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#fff",
	},
});
