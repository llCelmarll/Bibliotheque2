import React from 'react';
import {View, Text, StyleSheet} from "react-native";

interface InfoRowProps {
	label: string;
	value: string;
}

export function InfoRow({label, value}: InfoRowProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.value}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	label: {
		flex: 1,
		fontSize: 14,
		color: '#666',
	},
	value: {
		flex: 2,
		fontSize: 14,
	},
})