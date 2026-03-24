// components/books/SortMenu.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface SortOption {
	label: string;
	value: string;
	order: 'asc' | 'desc';
}

interface SortMenuProps {
	currentSort: string;
	currentOrder: 'asc' | 'desc';
	onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
}

const sortOptions: SortOption[] = [
	{ label: 'Titre (A-Z)', value: 'title', order: 'asc' },
	{ label: 'Titre (Z-A)', value: 'title', order: 'desc' },
	{ label: 'Auteur (A-Z)', value: 'author', order: 'asc' },
	{ label: 'Auteur (Z-A)', value: 'author', order: 'desc' },
	{ label: 'Editeur (A-Z)', value: 'publisher', order: 'asc' },
	{ label: 'Editeur (Z-A)', value: 'publisher', order: 'desc' },
	{ label: 'Genre (A-Z)', value: 'genre', order: 'asc' },
	{ label: 'Genre (Z-A)', value: 'genre', order: 'desc' },
	{ label: 'Date (récent)', value: 'published_date', order: 'asc' },
	{ label: 'Date (ancien)', value: 'published_date', order: 'desc' },
	{ label: 'Pages (croissant)', value: 'page_count', order: 'asc' },
	{ label: 'Pages (décroissant)', value: 'page_count', order: 'desc' },
];

export const SortMenu: React.FC<SortMenuProps> = ({
	currentSort,
	currentOrder,
	onSortChange,
}) => {
	const [modalVisible, setModalVisible] = useState(false);
	const theme = useTheme();

	const getCurrentSortLabel = () => {
		const option = sortOptions.find(
			opt => opt.value === currentSort && opt.order === currentOrder
		);
		return option?.label || 'Trier par';
	};

	return (
		<View>
			<Pressable
				style={[styles.sortButton, { backgroundColor: theme.bgMuted }]}
				onPress={() => setModalVisible(true)}
			>
				<Text style={[styles.sortButtonText, { color: theme.textPrimary }]}>{getCurrentSortLabel()}</Text>
				<MaterialIcons name="sort" size={20} color={theme.textPrimary} />
			</Pressable>

			<Modal
				animationType="fade"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<Pressable
					style={[styles.modalOverlay, { backgroundColor: `${theme.textPrimary}80` }]}
					onPress={() => setModalVisible(false)}
				>
					<View style={[styles.modalContent, { backgroundColor: theme.bgCard }]}>
						<Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Trier par</Text>
						{sortOptions.map((option) => (
							<Pressable
								key={`${option.value}-${option.order}`}
								style={[
									styles.optionButton,
									currentSort === option.value &&
									currentOrder === option.order &&
									{ backgroundColor: theme.bgMuted },
								]}
								onPress={() => {
									onSortChange(option.value, option.order);
									setModalVisible(false);
								}}
							>
								<Text style={[styles.optionText, { color: theme.textPrimary }]}>{option.label}</Text>
								{currentSort === option.value && currentOrder === option.order && (
									<MaterialIcons name="check" size={20} color={theme.accent} />
								)}
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	sortButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 8,
	},
	sortButtonText: {
		fontSize: 14,
	},
	modalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		borderRadius: 12,
		padding: 16,
		width: '80%',
		maxWidth: 400,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16,
		textAlign: 'center',
	},
	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	optionText: {
		fontSize: 16,
	},
});
