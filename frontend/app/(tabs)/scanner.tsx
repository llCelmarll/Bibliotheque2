import React, { useState,useEffect } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform} from "react-native";
import { CameraType, useCameraPermissions } from "expo-camera";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Scanner from "@/components/Scanner";
import { useAuth } from "@/contexts/AuthContext";

export default function ScannerScreen() {
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isManualInput, setIsManualInput] = useState(Platform.OS === 'web');
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirection si non authentifié
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Réinitialiser l'état du scanner quand on revient sur l'écran
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      setTorch(false);
    }, [])
  );

  // Afficher un loader pendant la vérification d'authentification
  if (authLoading || !isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.authText}>
          {authLoading ? "Vérification de l'authentification..." : "Redirection..."}
        </Text>
      </View>
    );
  }

  const handleBarCodeScanned = (isbn: string) => {
    console.log("Scanned: ", isbn);
    if (scanned) return;

    setScanned(true);

    if (/^(?:\d{10}|\d{13})$/.test(isbn)) {
      console.log("Valid ISBN:", isbn);
      // Navigation vers la page de résultats du scan
      router.push(`/scan/${isbn}`);
    } else {
      console.log("Invalid ISBN format");
      // Réactiver le scanner après 2 secondes pour un ISBN invalide
      setTimeout(() => {
        setScanned(false);
      }, 2000);
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
      
      {/* Bouton flottant pour l'ajout manuel */}
      <TouchableOpacity 
        style={styles.manualAddButton}
        onPress={() => router.push('/scan/manual')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="edit" size={24} color="#fff" />
        <Text style={styles.manualAddText}>Ajout manuel</Text>
      </TouchableOpacity>
    </View>
  );
}

// Styles pour l'écran scanner
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
  manualAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  manualAddText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  authText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});