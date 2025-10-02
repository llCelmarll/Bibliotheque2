// components/books/SortMenu.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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

	const getCurrentSortLabel = () => {
		const option = sortOptions.find(
			opt => opt.value === currentSort && opt.order === currentOrder
		);
		return option?.label || 'Trier par';
	};

	return (
		<View>
			<Pressable
				style={styles.sortButton}
				onPress={() => setModalVisible(true)}
			>
				<Text style={styles.sortButtonText}>{getCurrentSortLabel()}</Text>
				<MaterialIcons name="sort" size={20} color="#333" />
			</Pressable>

			<Modal
				animationType="fade"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<Pressable
					style={styles.modalOverlay}
					onPress={() => setModalVisible(false)}
				>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Trier par</Text>
						{sortOptions.map((option) => (
							<Pressable
								key={`${option.value}-${option.order}`}
								style={[
									styles.optionButton,
									currentSort === option.value &&
									currentOrder === option.order &&
									styles.selectedOption,
								]}
								onPress={() => {
									onSortChange(option.value, option.order);
									setModalVisible(false);
								}}
							>
								<Text style={styles.optionText}>{option.label}</Text>
								{currentSort === option.value && currentOrder === option.order && (
									<MaterialIcons name="check" size={20} color="#007AFF" />
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
		backgroundColor: '#f0f0f0',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 8,
	},
	sortButtonText: {
		fontSize: 14,
		color: '#333',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: 'white',
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
	selectedOption: {
		backgroundColor: '#f0f0f0',
	},
	optionText: {
		fontSize: 16,
		color: '#333',
	},
});