import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SortMenu } from "@/components/SortMenu";

interface SearchBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	handleSearch: () => void;
	isGridView: boolean;
	toggleView: () => void;
	sortBy: string;
	order: 'asc' | 'desc';
	onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
														searchQuery,
														setSearchQuery,
														handleSearch,
														isGridView,
														toggleView,
														sortBy,
														order,
														onSortChange
													}) => {
	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<TextInput
					style={styles.input}
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Rechercher..."
					onSubmitEditing={handleSearch}
					returnKeyType="search"
				/>
				<Pressable style={styles.searchButton} onPress={handleSearch}>
					<MaterialIcons name="search" size={24} color="#333" />
				</Pressable>
			</View>

			<View style={styles.actions}>
				<SortMenu
					currentSort={sortBy}
					currentOrder={order}
					onSortChange={onSortChange} // Fonction à appeler lors du changement de tri
				/>

				<Pressable style={styles.viewButton} onPress={toggleView}>
					<MaterialIcons
						name={isGridView ? "view-list" : "grid-view"}
						size={24}
						color="#333"
					/>
				</Pressable>
			</View>
		</View>

	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 12,
	},
	searchContainer: {
		flexDirection: 'row',
		gap: 8,
	},
	input: {
		flex: 1,
		height: 40,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: 12,
		backgroundColor: 'white',
	},
	searchButton: {
		width: 40,
		height: 40,
		backgroundColor: '#f0f0f0',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	viewButton: {
		width: 40,
		height: 40,
		backgroundColor: '#f0f0f0',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8,
	},
});
