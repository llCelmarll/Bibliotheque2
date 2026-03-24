import React from 'react';
import {View, Text, StyleSheet} from "react-native";
import { useTheme } from '@/contexts/ThemeContext';

interface TagProps {
	text: string;
}

export function Tag({text}: TagProps) {
	const theme = useTheme();
	return (
		<View style={[styles.container, { backgroundColor: theme.bgMuted }]}>
			<Text style={[styles.text, { color: theme.textSecondary }]}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
		container: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 16,
			marginRight: 8,
			marginBottom: 8,
		},
		text: {
			fontSize: 12,
		},
	}
)
