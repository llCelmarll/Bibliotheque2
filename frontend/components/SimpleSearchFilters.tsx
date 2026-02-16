import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StarRating } from "@/components/StarRating";

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
	return (
		<View style={styles.container}>
			<View style={styles.section}>
				<Text style={styles.label}>Statut</Text>
				<View style={styles.chipRow}>
					{([null, true, false] as const).map((val) => (
						<TouchableOpacity
							key={val === null ? "tous" : val ? "lu" : "nonlu"}
							style={[styles.chip, isRead === val && styles.chipActive]}
							onPress={() => setIsRead(val)}
						>
							<Text
								style={[
									styles.chipText,
									isRead === val && styles.chipTextActive,
								]}
							>
								{val === null ? "Tous" : val ? "Lu" : "Non lu"}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
			<View style={styles.section}>
				<Text style={styles.label}>Note min.</Text>
				<View style={styles.starRow}>
					<TouchableOpacity
						style={[styles.chip, ratingMin === null && styles.chipActive]}
						onPress={() => setRatingMin(null)}
					>
						<Text
							style={[
								styles.chipText,
								ratingMin === null && styles.chipTextActive,
							]}
						>
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
		backgroundColor: "#f9f9f9",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	section: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	label: {
		fontSize: 13,
		color: "#666",
		minWidth: 56,
	},
	chipRow: {
		flexDirection: "row",
		gap: 6,
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: "#eee",
	},
	chipActive: {
		backgroundColor: "#3498db",
	},
	chipText: {
		fontSize: 13,
		color: "#333",
	},
	chipTextActive: {
		color: "#fff",
	},
	starRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
});
