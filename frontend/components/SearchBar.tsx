import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface SearchBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	handleSearch: () => void;
	handleSort: () => void;
	isGridView: boolean;
	toggleView: () => void;
	sortBy: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
														searchQuery,
														setSearchQuery,
														handleSearch,
														handleSort,
														isGridView,
														toggleView,
														sortBy,
													}) => {
	return (
		<View style={styles.header}>
			{/* Barre de recherche */}
			<TextInput
				style={styles.searchInput}
				placeholder="Rechercher un livre..."
				value={searchQuery}
				onChangeText={setSearchQuery}
				onSubmitEditing={handleSearch}
			/>

			{/* Bouton de tri */}
			<Pressable style={styles.sortButton} onPress={handleSort}>
				<Text style={styles.sortButtonText}>{`Trier: ${
					sortBy === "title" ? "Date" : "Titre"
				}`}</Text>
				<MaterialIcons name="sort" size={20} color="#333" />
			</Pressable>

			{/* Bouton d'affichage (liste ou grille) */}
			<Pressable onPress={toggleView} style={styles.viewToggle}>
				<MaterialIcons
					name={isGridView ? "view-list" : "grid-view"}
					size={24}
					color="#333"
				/>
			</Pressable>
		</View>
	);
};

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		padding: 16,
		justifyContent: "space-between",
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	searchInput: {
		flex: 1,
		marginRight: 10,
		height: 40,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		paddingHorizontal: 10,
	},
	sortButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: "#eaeaea",
		marginRight: 10,
	},
	sortButtonText: {
		fontSize: 14,
		color: "#333",
		marginRight: 5,
	},
	viewToggle: {
		padding: 8,
	},
});