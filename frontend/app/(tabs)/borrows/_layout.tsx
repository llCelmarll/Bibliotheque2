// app/(tabs)/borrows/_layout.tsx
import { Stack } from "expo-router";

export default function BorrowsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
    </Stack>
  );
}
