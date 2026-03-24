import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StarRating } from "@/components/StarRating";
import { useTheme } from "@/contexts/ThemeContext";

interface SimpleSearchFiltersProps {
	isRead: boolean | null;
	setIsRead: (v: boolean | null) => void;
	ratingMin: number | null;
	setRatingMin: (v: number | null) => void;
	onApply?: () => void;
}

export const SimpleSearchFilters: React.FC<SimpleSearchFiltersProps> = ({
	isRead,
	setIsRead,
	ratingMin,
	setRatingMin,
}) => {
	const theme = useTheme();
	return (
		<View style={[styles.container, { backgroundColor: theme.bgPrimary, borderBottomColor: theme.borderLight }]}>
			<View style={styles.section}>
				<Text style={[styles.label, { color: theme.textMuted }]}>Statut</Text>
				<View style={styles.chipRow}>
					{([null, true, false] as const).map((val) => (
						<TouchableOpacity
							key={val === null ? "tous" : val ? "lu" : "nonlu"}
							style={[styles.chip, { backgroundColor: isRead === val ? theme.accent : theme.bgMuted }]}
							onPress={() => setIsRead(val)}
						>
							<Text style={[styles.chipText, { color: isRead === val ? theme.textInverse : theme.textSecondary }]}>
								{val === null ? "Tous" : val ? "Lu" : "Non lu"}
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
