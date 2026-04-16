// components/scan/ExistingBookCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { BookRead } from "@/types/scanTypes";
import { resolveCoverUrl } from '@/utils/coverUrl';
import { useTheme } from '@/contexts/ThemeContext';

interface ExistingBookCardProps {
	book: BookRead;
	onPress: () => void;
}

export const ExistingBookCard: React.FC<ExistingBookCardProps> = ({ book, onPress }) => {
	const theme = useTheme();
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
		<TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderLight, shadowColor: theme.textPrimary }]} onPress={onPress}>
			<View style={styles.coverContainer}>
				{book.cover_url ? (
					<Image
						source={{ uri: resolveCoverUrl(book.cover_url) }}
						style={[styles.cover, { backgroundColor: theme.bgSecondary }]}
						resizeMode="cover"
					/>
				) : (
					<View style={[styles.cover, styles.noCover, { backgroundColor: theme.bgSecondary, borderColor: theme.borderLight }]}>
						<Text style={[styles.noCoverText, { color: theme.textMuted }]}>Pas de{'\n'}couverture</Text>
					</View>
				)}
			</View>
			<View style={styles.info}>
				<Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={2}>{book.title}</Text>
				{book.subtitle && (
					<Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>{book.subtitle}</Text>
				)}
				{book.authors && book.authors.length > 0 && (
					<Text style={[styles.author, { color: theme.textSecondary }]} numberOfLines={1}>
						{book.authors.map((author) => author.name).join(', ')}
					</Text>
				)}
				{book.publisher && (
					<Text style={[styles.publisher, { color: theme.textMuted }]} numberOfLines={1}>{book.publisher.name}</Text>
				)}
				{book.published_date && (
					<Text style={[styles.publishedDate, { color: theme.textMuted }]}>{book.published_date}</Text>
				)}
				{book.isbn && (
					<Text style={[styles.isbn, { color: theme.textMuted }]}>ISBN: {book.isbn}</Text>
				)}

				{/* Affichage du statut de prêt */}
				{book.current_loan && (
					<View style={[styles.loanBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
						<Text style={[styles.loanBadgeText, { color: theme.warning }]}>
							📖 Prêté à {book.current_loan.contact?.name || 'Contact inconnu'}
						</Text>
						{book.current_loan.due_date && (
							<Text style={[
								styles.loanDateText,
								{ color: theme.warning },
								new Date(book.current_loan.due_date) < new Date() && { color: theme.danger, fontWeight: '600' as const }
							]}>
								Retour prévu : {formatDate(book.current_loan.due_date)}
							</Text>
						)}
					</View>
				)}

				{/* Affichage du statut de lecture */}
				{book.is_read === true && (
					<View style={[styles.readBadge, { backgroundColor: theme.successBg, borderColor: theme.success }]}>
						<Text style={[styles.readBadgeText, { color: theme.success }]}>
							✓ Lu {book.read_date ? `le ${formatDate(book.read_date)}` : ''}
						</Text>
					</View>
				)}
				{book.is_read === false && (
					<View style={[styles.unreadBadge, { backgroundColor: theme.bgMuted, borderColor: theme.borderMedium }]}>
						<Text style={[styles.unreadBadgeText, { color: theme.textSecondary }]}>Non lu</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 12,
		padding: 12,
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		borderWidth: 1,
	},
	coverContainer: {
		marginRight: 12,
	},
	cover: {
		width: 80,
		height: 120,
		borderRadius: 8,
	},
	noCover: {
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderStyle: 'dashed',
	},
	noCoverText: {
		fontSize: 10,
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
		marginBottom: 2,
		lineHeight: 20,
	},
	subtitle: {
		fontSize: 13,
		fontStyle: 'italic',
		marginBottom: 4,
	},
	author: {
		fontSize: 14,
		marginBottom: 4,
		fontStyle: 'italic',
	},
	publisher: {
		fontSize: 13,
		marginBottom: 4,
	},
	publishedDate: {
		fontSize: 12,
		marginBottom: 4,
	},
	isbn: {
		fontSize: 11,
		fontFamily: 'monospace',
		marginBottom: 8,
	},
	loanBadge: {
		marginTop: 8,
		padding: 8,
		borderRadius: 6,
		borderWidth: 1,
	},
	loanBadgeText: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
	},
	loanDateText: {
		fontSize: 11,
	},
	readBadge: {
		marginTop: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
	},
	readBadgeText: {
		fontSize: 12,
		fontWeight: '600',
	},
	unreadBadge: {
		marginTop: 8,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
	},
	unreadBadgeText: {
		fontSize: 12,
		fontWeight: '600',
	},
});