// components/BorrowedBookListItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { returnBorrowedBook } from '@/services/borrowedBookService';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
	borrowedBook: BorrowedBook;
}

export const BorrowedBookListItem: React.FC<Props> = ({ borrowedBook }) => {
	const router = useRouter();
	const theme = useTheme();

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
			style={[styles.container, { backgroundColor: theme.bgCard }]}
			onPress={() => router.push(`/(tabs)/borrows/${borrowedBook.id}`)}
		>
			<View style={styles.info}>
				<Text style={[styles.title, { color: theme.textPrimary }]}>{borrowedBook.book?.title || 'Sans titre'}</Text>
				<Text style={[styles.borrowedFrom, { color: theme.textSecondary }]}>
					📚 Emprunté à {borrowedBook.contact?.name || borrowedBook.borrowed_from}
				</Text>

				{borrowedBook.expected_return_date && (
					<Text style={[styles.dueDate, { color: isOverdue ? theme.danger : theme.textMuted }, isOverdue && styles.overdue]}>
						{isOverdue ? '⚠️' : '📅'} Retour prévu: {formatDate(borrowedBook.expected_return_date)}
					</Text>
				)}
			</View>

			<TouchableOpacity
				style={[styles.returnButton, { backgroundColor: theme.accent }]}
				onPress={(e) => {
					e.stopPropagation();
					handleReturn();
				}}
			>
				<Text style={[styles.returnButtonText, { color: theme.textInverse }]}>Retourner</Text>
			</TouchableOpacity>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		alignItems: 'center',
	},
	info: { flex: 1 },
	title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
	borrowedFrom: { fontSize: 14, marginBottom: 2 },
	dueDate: { fontSize: 12 },
	overdue: { fontWeight: '600' },
	returnButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 6,
	},
	returnButtonText: { fontWeight: '600' },
});
