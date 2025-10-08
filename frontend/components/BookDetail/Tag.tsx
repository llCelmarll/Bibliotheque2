import React from 'react';
import {View, Text, StyleSheet} from "react-native";

interface TagProps {
	text: string;
}

export function Tag({text}: TagProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
		container: {
			backgroundColor: '#f0f0f0',
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 16,
			marginRight: 8,
			marginBottom: 8,
		},
		text: {
			fontSize: 12,
			color: '#666',
		},
	}
)