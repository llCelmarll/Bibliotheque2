import { Redirect } from "expo-router";

export default function Index() {
  // Redirige directement vers l'onglet "books"
  return <Redirect href="/(tabs)/books" />;
}
