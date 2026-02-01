// components/BorrowedBookListItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { returnBorrowedBook } from '@/services/borrowedBookService';

interface Props {
	borrowedBook: BorrowedBook;
}

export const BorrowedBookListItem: React.FC<Props> = ({ borrowedBook }) => {
	const router = useRouter();

	// Fonction pour formater les dates YYYY-MM-DD en DD/MM/YYYY
	const formatDate = (dateStr: string): string => {
		const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (match) {
			const [, year, month, day] = match;
			return `${day}/${month}/${year}`;
		}
		return dateStr;
	};

	const handleReturn = async () => {
		Alert.alert(
			'Retourner le livre',
			`Confirmer le retour de "${borrowedBook.book?.title}"?`,
			[
				{ text: 'Annuler', style: 'cancel' },
				{
					text: 'Retourner',
					onPress: async () => {
						try {
							await returnBorrowedBook(borrowedBook.id);
							Alert.alert('Succès', 'Livre retourné avec succès');
							// Rafraîchir la liste (via navigation)
							router.replace('/(tabs)/loans');
						} catch (error) {
							Alert.alert('Erreur', 'Impossible de retourner le livre');
						}
					}
				}
			]
		);
	};

	const isOverdue = borrowedBook.status === BorrowStatus.OVERDUE;

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={() => router.push(`/(tabs)/borrows/${borrowedBook.id}`)}
		>
			<View style={styles.info}>
				<Text style={styles.title}>{borrowedBook.book?.title || 'Sans titre'}</Text>
				<Text style={styles.borrowedFrom}>
					📚 Emprunté à {borrowedBook.borrowed_from}
				</Text>

				{borrowedBook.expected_return_date && (
					<Text style={[styles.dueDate, isOverdue && styles.overdue]}>
						{isOverdue ? '⚠️' : '📅'} Retour prévu: {formatDate(borrowedBook.expected_return_date)}
					</Text>
				)}
			</View>

			<TouchableOpacity
				style={styles.returnButton}
				onPress={(e) => {
					e.stopPropagation();
					handleReturn();
				}}
			>
				<Text style={styles.returnButtonText}>Retourner</Text>
			</TouchableOpacity>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		padding: 12,
		backgroundColor: '#f9f9f9',
		borderRadius: 8,
		marginBottom: 8,
		alignItems: 'center',
	},
	info: { flex: 1 },
	title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
	borrowedFrom: { fontSize: 14, color: '#666', marginBottom: 2 },
	dueDate: { fontSize: 12, color: '#999' },
	overdue: { color: '#e74c3c', fontWeight: '600' },
	returnButton: {
		backgroundColor: '#3498db',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	returnButtonText: { color: '#fff', fontWeight: '600' },
});
