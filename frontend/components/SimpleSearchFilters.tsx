import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StarRating } from "@/components/StarRating";
import { useTheme } from "@/contexts/ThemeContext";
import { ReadingStatus } from "@/types/book";

const STATUS_OPTIONS: { key: ReadingStatus | null; label: string }[] = [
	{ key: null, label: "Tous" },
	{ key: "read", label: "Lu" },
	{ key: "in_progress", label: "En cours" },
	{ key: "unread", label: "Non lu" },
];

interface SimpleSearchFiltersProps {
	readingStatus: ReadingStatus | null;
	setReadingStatus: (v: ReadingStatus | null) => void;
	ratingMin: number | null;
	setRatingMin: (v: number | null) => void;
	onApply?: () => void;
}

export const SimpleSearchFilters: React.FC<SimpleSearchFiltersProps> = ({
	readingStatus,
	setReadingStatus,
	ratingMin,
	setRatingMin,
}) => {
	const theme = useTheme();
	return (
		<View style={[styles.container, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
			<View style={styles.section}>
				<Text style={[styles.label, { color: theme.textMuted }]}>Statut</Text>
				<View style={styles.chipRow}>
					{STATUS_OPTIONS.map(({ key, label }) => (
						<TouchableOpacity
							key={key ?? "tous"}
							style={[styles.chip, { backgroundColor: readingStatus === key ? theme.accent : theme.bgMuted }]}
							onPress={() => setReadingStatus(key)}
						>
							<Text style={[styles.chipText, { color: readingStatus === key ? theme.textInverse : theme.textSecondary }]}>
								{label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
			<View style={styles.section}>
				<Text style={[styles.label, { color: theme.textMuted }]}>Note min.</Text>
				<View style={styles.starRow}>
					<TouchableOpacity
						style={[styles.chip, { backgroundColor: ratingMin === null ? theme.accent : theme.bgMuted }]}
						onPress={() => setRatingMin(null)}
					>
						<Text style={[styles.chipText, { color: ratingMin === null ? theme.textInverse : theme.textSecondary }]}>
							Toutes
						</Text>
					</TouchableOpacity>
					<StarRating
						value={ratingMin}
						editable
						onChange={(v) => setRatingMin(v)}
						size={22}
					/>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "flex-start",
		gap: 16,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
	},
	section: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	label: {
		fontSize: 13,
		minWidth: 56,
	},
	chipRow: {
		flexDirection: "row",
		gap: 6,
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	chipText: {
		fontSize: 13,
		fontWeight: '500',
	},
	starRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
});
