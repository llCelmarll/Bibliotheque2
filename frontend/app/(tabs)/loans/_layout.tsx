// app/(tabs)/loans/_layout.tsx
import { Stack } from "expo-router";

export default function LoansLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="(subtabs)"
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
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="contacts"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="user-loan-request"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="library/[userId]/index"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
      <Stack.Screen
        name="library/[userId]/book/[bookId]"
        options={{
          headerShown: false,
          presentation: 'card'
        }}
      />
    </Stack>
  );
}
