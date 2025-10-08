import {View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons} from "@expo/vector-icons";

interface ErrorMessageProps {
	message: string;
	onRetry: () => void;
}

export function ErrorMessage({message, onRetry}: ErrorMessageProps) {
	return (
		<View style={styles.container}>
			<Ionicons
				name="alert-circle-outline"
				size={48}
				color="#dc3545"
			/>
			<Text style={styles.message}>{message}</Text>

			{onRetry && (
				<TouchableOpacity
					style={styles.retryButton}
					onPress={onRetry}
				>
					<Ionicons
						name="refresh-outline"
						size={20}
						color="#fff"
					/>
					<Text style={styles.retryText}>Réessayer</Text>
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
		color: '#666',
		textAlign: 'center',
		marginBottom: 20,
	},
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#007bff',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	retryText: {
		color: '#fff',
		marginLeft: 8,
		fontSize: 16,
	},
});
