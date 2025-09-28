import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet} from "react-native";

interface BookCoverProps {
	url?: string;
}

const BookCover = ({ url }: BookCoverProps) => {
	const [loading, setLoading] = useState(true);

	return (
		<View style={styles.coverContainer}>
			{loading && <ActivityIndicator  style={styles.imageLoader} />}
			<Image
				source={
					url ? {uri: url} : require('../assets/images/default-book-cover.jpg')
				}
				style={styles.coverImage}
				onLoadStart={() => setLoading(true)}
				onLoadEnd={() => setLoading(false)}
				onError={() => setLoading(false)}
			/>
		</View>
	)
};

const styles = StyleSheet.create({
	coverContainer: { width: 70, height: 100, position: "relative" },
	coverImage: { width: "100%", height: "100%", borderRadius: 4 },
	imageLoader: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: "center",
		alignItems: "center",
	},
});

export default BookCover;