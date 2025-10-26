import { Stack } from 'expo-router';

export default function ScanLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false // Désactive le header pour tous les écrans de scan
    }}>
      <Stack.Screen 
        name="[isbn]" 
        options={{
          headerShown: false,
          gestureEnabled: false, // Désactive le geste de retour sur iOS
        }} 
      />
    </Stack>
  );
}