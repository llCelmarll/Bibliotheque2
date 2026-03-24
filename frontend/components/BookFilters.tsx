import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FilterType, BookFilter} from "@/types/filter";
import {ClickableTag} from "@/components/ClickableTag";
import { isFilterActive} from "@/services/filtersService";
import { useTheme } from "@/contexts/ThemeContext";

interface BookFiltersProps {
	activeFilters: BookFilter[];
	onFilterRemove: (filter: BookFilter) => void;
	onClearFilters: () => void;
}

export const BookFilters : React.FC<BookFiltersProps> = ({
	activeFilters,
	onFilterRemove,
	onClearFilters
}) => {
	const theme = useTheme();
	if (activeFilters.length === 0) return null;

	return (
		<View style={[styles.container, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: theme.textPrimary }]}>Filtres actifs</Text>
				<Text style={[styles.clearButton, { color: theme.accent }]} onPress={onClearFilters}>
					Effacer tous les filtres
				</Text>
			</View>
			<ScrollView horizontal style={styles.filterList}>
				{activeFilters.map((filter) => (
					<ClickableTag
						key={`${filter.type}-${filter.id}`}
						filter={filter}
						onPress={onFilterRemove}
					/>
				))}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		padding: 10,
		borderBottomWidth: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	title: {
		fontWeight: '600',
		fontSize: 15,
	},
	clearButton: {
		fontSize: 14,
		fontWeight: '500',
	},
	filterList: {
		flexDirection: 'row',
	},
});
