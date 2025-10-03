import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

type ClickableTagProps = {
	type: "author" | "genre" | "publisher";
	label: string;
	id: number;
	onPress: (type: "author" | "genre" | "publisher", id: number) => void | undefined;
};

export function ClickableTag(props: ClickableTagProps) {
	return (
		<TouchableOpacity style={styles.tag} onPress={() => props.onPress(props.type, props.id)}>
			<Text style={styles.text}>{props.label}</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	tag: {
		backgroundColor: "#eef", // petit fond bleu clair
		paddingHorizontal: 8,
		// paddingVertical: 4,
		borderRadius: 12,
	},
	text: {
		color: "#0066cc",
		fontSize: 14,
	},
});