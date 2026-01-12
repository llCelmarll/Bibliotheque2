// app/(tabs)/books/_layout.tsx
import { Stack } from "expo-router";

export default function BooksLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
    </Stack>
  );
}
