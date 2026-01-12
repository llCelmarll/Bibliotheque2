// app/(tabs)/borrowed/_layout.tsx
import { Stack } from 'expo-router';

export default function BorrowedLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="index" />
		</Stack>
	);
}
