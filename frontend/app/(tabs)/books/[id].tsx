import { useLocalSearchParams, Stack} from "expo-router";
import {View, ScrollView, ActivityIndicator, StyleSheet, Text} from "react-native";
import {useBookDetail} from "@/hooks/useBookDetail";
import {BookHeader} from "@/components/BookDetail/BookHeader";
import { ErrorMessage } from "@/components/ErrorMessage";
import {BookDetailTabs} from "@/components/BookDetail/BookDetailTabs";

export  default function BookDetailScreen() {
	const {id} = useLocalSearchParams(); // récupération de l'id d'un livre depuis l'URL
	const { book, loading, error, refetch } = useBookDetail(id as string)

	return (
		<>
			<Stack.Screen
				options={{
					title: "Details du livre",
					headerShown: true,
				}}
			/>

			<View style={styles.container}>
				{loading ? (
					<ActivityIndicator size="large" style={styles.loader} />
				) : error ? (
					<ErrorMessage message={error} onRetry={refetch}/>
				) : book ? (
					<View style={styles.content}>
						<BookHeader 
							book={book} 
							onBookDeleted={() => {
								// Optionnel: rafraîchir les données ou naviguer
								refetch();
							}}
						/>
						<BookDetailTabs book={book}/>
					</View>
				) : null}
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	loader: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		flex: 1,
	},
});
