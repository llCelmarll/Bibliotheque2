import React, { useState,useEffect } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform} from "react-native";
import { CameraType, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Scanner from "@/components/Scanner";

export default function ScannerScreen() {
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isManualInput, setIsManualInput] = useState(Platform.OS === 'web');
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  const handleBarCodeScanned = (isbn: string) => {
    console.log("Scanned: ", isbn);
    if (scanned) return;

    setScanned(true);

    if (/^(?:\d{10}|\d{13})$/.test(isbn)) {
      console.log(isbn);
      // Ici, vous pouvez ajouter la logique pour naviguer vers la page de détails du livre
      // router.push(`/book/${isbn}`);
    } else {
      console.log("Invalid ISBN");
      setScanned(false);
    }
  };

  const toggleTorch = () => {
    setTorch(!torch);
  };

  // Ajouter un handler pour le changement de mode
  const handleModeChange = (isManual: boolean) => {
    setIsManualInput(isManual);
    if (isManual) {
      setTorch(false); // Éteindre la torche en mode manuel
    }
  };

  // Gérer les états de permission de la caméra
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff"/>
        <Text style={styles.text}>Demande d'accès à la caméra...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Scanner 
        onScanned={handleBarCodeScanned}
        torchEnabled={torch}
        onModeChange={handleModeChange}
      />
    </View>
  );
}

// Simplifier les styles en gardant uniquement ceux nécessaires
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#fff' : 'black',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
    color: Platform.OS === 'web' ? '#333' : '#fff',
  },
});