import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface ErrorMessageProps {
	message: string;
	onRetry: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
	const theme = useTheme();

	return (
		<View style={styles.container}>
			<Ionicons
				name="alert-circle-outline"
				size={48}
				color={theme.danger}
			/>
			<Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

			{onRetry && (
				<TouchableOpacity
					style={[styles.retryButton, { backgroundColor: theme.accent }]}
					onPress={onRetry}
				>
					<Ionicons
						name="refresh-outline"
						size={20}
						color={theme.textInverse}
					/>
					<Text style={[styles.retryText, { color: theme.textInverse }]}>Réessayer</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	message: {
		marginTop: 12,
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
	},
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	retryText: {
		marginLeft: 8,
		fontSize: 16,
	},
});
