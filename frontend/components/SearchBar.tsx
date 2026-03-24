import React from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SortMenu } from "@/components/SortMenu";
import { useTheme } from "@/contexts/ThemeContext";

interface SearchBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	handleSearch: () => void;
	isGridView: boolean;
	toggleView: () => void;
	sortBy: string;
	order: 'asc' | 'desc';
	onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
	onAdvancedPress?: () => void;
	isAdvancedMode?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
	searchQuery,
	setSearchQuery,
	handleSearch,
	isGridView,
	toggleView,
	sortBy,
	order,
	onSortChange,
	onAdvancedPress,
	isAdvancedMode,
}) => {
	const theme = useTheme();
	return (
		<View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
			<View style={styles.searchContainer}>
				<TextInput
					style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderLight, color: theme.textPrimary, borderRadius: theme.radiusInput }]}
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Rechercher (titre, auteur, notes…)"
					placeholderTextColor={theme.textMuted}
					onSubmitEditing={handleSearch}
					returnKeyType="search"
				/>
				{onAdvancedPress && (
					<Pressable
						style={[styles.searchButton, { backgroundColor: isAdvancedMode ? theme.accent : theme.bgMuted, borderRadius: theme.radiusInput }]}
						onPress={onAdvancedPress}
					>
						<MaterialIcons
							name="tune"
							size={22}
							color={isAdvancedMode ? theme.textInverse : theme.textSecondary}
						/>
					</Pressable>
				)}
				<Pressable style={[styles.searchButton, { backgroundColor: theme.bgMuted, borderRadius: theme.radiusInput }]} onPress={handleSearch}>
					<MaterialIcons name="search" size={22} color={theme.textSecondary} />
				</Pressable>
			</View>

			<View style={styles.actions}>
				<SortMenu
					currentSort={sortBy}
					currentOrder={order}
					onSortChange={onSortChange}
				/>
				<Pressable style={[styles.viewButton, { backgroundColor: theme.bgMuted, borderRadius: theme.radiusInput }]} onPress={toggleView}>
					<MaterialIcons
						name={isGridView ? "view-list" : "grid-view"}
						size={22}
						color={theme.textSecondary}
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
		height: 42,
		borderWidth: 1,
		paddingHorizontal: 12,
	},
	searchButton: {
		width: 42,
		height: 42,
		justifyContent: 'center',
		alignItems: 'center',
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	viewButton: {
		width: 42,
		height: 42,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
