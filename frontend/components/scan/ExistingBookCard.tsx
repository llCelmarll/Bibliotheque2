// components/scan/ExistingBookCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { BookRead } from "@/types/scanTypes";

interface ExistingBookCardProps {
	book: BookRead;
	onPress: () => void;
}

export const ExistingBookCard: React.FC<ExistingBookCardProps> = ({ book, onPress }) => {
	const formatDate = (dateString?: string) => {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	};

	return (
		<TouchableOpacity style={styles.card} onPress={onPress}>
			<View style={styles.coverContainer}>
				{book.cover_url ? (
					<Image
						source={{ uri: book.cover_url }}
						style={styles.cover}
						resizeMode="cover"
					/>
				) : (
					<View style={[styles.cover, styles.noCover]}>
						<Text style={styles.noCoverText}>Pas de{'\n'}couverture</Text>
					</View>
				)}
			</View>
			<View style={styles.info}>
				<Text style={styles.title} numberOfLines={2}>{book.title}</Text>
				{book.authors && book.authors.length > 0 && (
					<Text style={styles.author} numberOfLines={1}>
						{book.authors.map((author) => author.name).join(', ')}
					</Text>
				)}
				{book.publisher && (
					<Text style={styles.publisher} numberOfLines={1}>{book.publisher.name}</Text>
				)}
				{book.published_date && (
					<Text style={styles.publishedDate}>{book.published_date}</Text>
				)}
				{book.isbn && (
					<Text style={styles.isbn}>ISBN: {book.isbn}</Text>
				)}

				{/* Affichage du statut de prêt */}
				{book.current_loan && (
					<View style={styles.loanBadge}>
						<Text style={styles.loanBadgeText}>
							📖 Prêté à {book.current_loan.borrower?.name || 'Emprunteur inconnu'}
						</Text>
						{book.current_loan.due_date && (
							<Text style={[
								styles.loanDateText,
								new Date(book.current_loan.due_date) < new Date() && styles.loanOverdue
							]}>
								Retour prévu : {formatDate(book.current_loan.due_date)}
							</Text>
						)}
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 12,
		padding: 12,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		borderWidth: 1,
		borderColor: '#e1e8ed',
	},
	coverContainer: {
		marginRight: 12,
	},
	cover: {
		width: 80,
		height: 120,
		borderRadius: 8,
		backgroundColor: '#f8f9fa',
	},
	noCover: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#ecf0f1',
		borderWidth: 1,
		borderColor: '#bdc3c7',
		borderStyle: 'dashed',
	},
	noCoverText: {
		fontSize: 10,
		color: '#95a5a6',
		textAlign: 'center',
		fontStyle: 'italic',
	},
	info: {
		flex: 1,
		justifyContent: 'flex-start',
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: '#2c3e50',
		marginBottom: 6,
		lineHeight: 20,
	},
	author: {
		fontSize: 14,
		color: '#34495e',
		marginBottom: 4,
		fontStyle: 'italic',
	},
	publisher: {
		fontSize: 13,
		color: '#7f8c8d',
		marginBottom: 4,
	},
	publishedDate: {
		fontSize: 12,
		color: '#95a5a6',
		marginBottom: 4,
	},
	isbn: {
		fontSize: 11,
		color: '#95a5a6',
		fontFamily: 'monospace',
		marginBottom: 8,
	},
	loanBadge: {
		marginTop: 8,
		padding: 8,
		backgroundColor: '#fff3cd',
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#ffc107',
	},
	loanBadgeText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#856404',
		marginBottom: 4,
	},
	loanDateText: {
		fontSize: 11,
		color: '#856404',
	},
	loanOverdue: {
		color: '#dc3545',
		fontWeight: '600',
	},
});