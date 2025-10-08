// app/(tabs)/books/_layout.tsx
import { Stack } from "expo-router";

export default function BooksLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Livres",
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{
          headerShown: true,
          presentation: 'card'
        }}
      />
    </Stack>
  );
}
