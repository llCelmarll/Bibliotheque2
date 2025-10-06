import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FilterType, BookFilter} from "@/types/filter";
import {ClickableTag} from "@/components/ClickableTag";
import { isFilterActive} from "@/services/filtersService";

interface BookFiltersProps {
	activeFilters: BookFilter[];
	onFilterRemove: (type: FilterType, id: number) => void;
	onClearFilters: () => void;
}

export const BookFilters : React.FC<BookFiltersProps> = ({
	activeFilters,
	onFilterRemove,
	onClearFilters
}) => {
	if (activeFilters.length === 0) return null;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Filtres actifs</Text>
				<Text style={styles.clearButton} onPress={onClearFilters}>
					Effacer tous les filtres
				</Text>
			</View>
			<ScrollView horizontal style={styles.filterList}>
				{activeFilters.map((filter) => (
					<ClickableTag
						key={`${filter.type}-${filter.id}`}
						label={filter.name || ''}
						type={filter.type}
						id={filter.id}
						onPress={onFilterRemove}
						active={true}
					/>
				))}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		padding: 10,
		backgroundColor: '#f5f5f5',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	title: {
		fontWeight: '600',
		fontSize: 16,
	},
	clearButton: {
		color: '#007AFF',
		fontSize: 14,
	},
	filterList: {
		flexDirection: 'row',
	},
});
