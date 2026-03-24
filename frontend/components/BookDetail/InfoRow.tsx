import React from 'react';
import {View, Text, StyleSheet} from "react-native";
import { useTheme } from '@/contexts/ThemeContext';

interface InfoRowProps {
	label: string;
	value: string;
}

export function InfoRow({label, value}: InfoRowProps) {
	const theme = useTheme();
	return (
		<View style={[styles.container, { borderBottomColor: theme.borderLight }]}>
			<Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
			<Text style={[styles.value, { color: theme.textPrimary }]}>{value}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		paddingVertical: 8,
		borderBottomWidth: 1,
	},
	label: {
		flex: 1,
		fontSize: 14,
	},
	value: {
		flex: 2,
		fontSize: 14,
	},
})
