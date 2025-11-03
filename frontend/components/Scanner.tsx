import React, { useState, useEffect } from "react";
import { Platform, View, Text, Button, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

interface ScannerProps {
  onScanned: (isbn: string) => void;
  torchEnabled?: boolean;
  onModeChange?: (isManual: boolean) => void;
}

export default function Scanner({ onScanned, torchEnabled, onModeChange }: ScannerProps) {
  const [hasCamera, setHasCamera] = useState(false);
  const isMobile = Platform.OS !== "web";

  // Sur web, vérifier si getUserMedia est disponible (navigateur mobile avec caméra)
  useEffect(() => {
    if (Platform.OS === "web") {
      const checkCamera = async () => {
        try {
          const devices = await navigator.mediaDevices?.enumerateDevices();
          const hasVideoInput = devices?.some(device => device.kind === 'videoinput');
          setHasCamera(!!hasVideoInput);
        } catch (error) {
          console.log('Pas de caméra disponible:', error);
          setHasCamera(false);
        }
      };
      checkCamera();
    }
  }, []);

  return (
    <View style={styles.container}>
      {isMobile ? (
        <MobileScanner 
          onScanned={onScanned} 
          torchEnabled={torchEnabled} 
          onModeChange={onModeChange}
        />
      ) : hasCamera ? (
        <WebScanner onScanned={onScanned} onModeChange={onModeChange} />
      ) : (
        <ManualInput onScanned={onScanned} />
      )}
    </View>
  );
}

/* ----------------------- WEB SCANNER (ZXing) ----------------------- */
function WebScanner({ onScanned, onModeChange }: ScannerProps) {
  const [scanned, setScanned] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  useEffect(() => {
    if (Platform.OS === "web" && !showManualInput && !scanned) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [showManualInput, scanned]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        startScanning();
      }
    } catch (err) {
      console.error('Erreur accès caméra:', err);
      setError('Impossible d\'accéder à la caméra. Autorisez l\'accès ou utilisez la saisie manuelle.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startScanning = async () => {
    if (!videoRef.current) return;

    // Utiliser ZXing pour scanner
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const codeReader = new BrowserMultiFormatReader();

    try {
      await codeReader.decodeFromVideoElement(videoRef.current, (result) => {
        if (result && !scanned) {
          setScanned(true);
          onScanned(result.getText());
          stopCamera();
        }
      });
    } catch (err) {
      console.error('Erreur scan:', err);
    }
  };

  if (showManualInput) {
    return (
      <View style={styles.manualInputWrapper}>
        <ManualInput onScanned={onScanned} />
        <Button 
          title="Retour au scan" 
          onPress={() => {
            setShowManualInput(false);
            setScanned(false);
            onModeChange?.(false);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.inputContainer}>
          <Text style={styles.text}>{error}</Text>
          <Button 
            title="Saisie manuelle" 
            onPress={() => {
              setShowManualInput(true);
              onModeChange?.(true);
            }}
          />
        </View>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
          </View>
          <View style={styles.controlsContainer}>
            <Text style={styles.instruction}>
              Placez le code-barre dans le cadre
            </Text>
            <Button 
              title="Saisie manuelle" 
              onPress={() => {
                setShowManualInput(true);
                onModeChange?.(true);
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}

/* ----------------------- MANUAL INPUT ----------------------- */
function ManualInput({ onScanned }: ScannerProps) {
	const [isbn, setIsbn] = useState("");
	const inputRef = React.useRef<TextInput>(null);

	// Focus automatique au montage du composant (uniquement sur web)
	React.useEffect(() => {
		if (Platform.OS === 'web' && inputRef.current) {
			// Petit délai pour s'assurer que le composant est complètement monté
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, []);

	const handleSubmit = () => {
		if (isbn.trim()) {
			onScanned(isbn.trim());
		}
	};

	const handleKeyPress = (event: any) => {
		// Gérer la touche Entrée sur web
		if (Platform.OS === 'web' && event.nativeEvent?.key === 'Enter') {
			event.preventDefault();
			handleSubmit();
		}
	};

	return (
		<View style={styles.inputContainer}>
			<Text style={styles.text}>Entrez un ISBN manuellement</Text>
			<Text style={styles.subText}>Appuyez sur Entrée pour lancer le scan</Text>
			<TextInput
				ref={inputRef}
				style={styles.input}
				value={isbn}
				onChangeText={setIsbn}
				placeholder="ISBN (ex: 9782253257332)"
				keyboardType="numeric"
				onKeyPress={handleKeyPress}
				autoFocus={Platform.OS === 'web'}
				returnKeyType="search"
				onSubmitEditing={handleSubmit}
			/>
			<Button title="Valider" onPress={handleSubmit} />
		</View>
	);
}

/* ---------------------- MOBILE SCANNER (Expo Camera) ---------------------- */
function MobileScanner({ onScanned, torchEnabled, onModeChange }: ScannerProps) {
	const [permission, requestPermission] = useCameraPermissions();
	const [scanned, setScanned] = useState(false);
	const [showManualInput, setShowManualInput] = useState(false);
	const [torch, setTorch] = useState(false);

	if (!permission) {
		return <View />;
	}

	if (!permission.granted) {
		return (
			<View style={styles.container}>
				<Text style={styles.text}>Autorisez l'accès à la caméra</Text>
				<Button title="Autoriser" onPress={requestPermission} />
			</View>
		);
	}

	const handleBarCodeScanned = ({ data }: { data: string }) => {
		if (!scanned) {
			setScanned(true);
			onScanned(data);
		}
	};

	const toggleTorch = () => {
		setTorch(!torch);
	}

	return (
    <View style={styles.container}>
      {!showManualInput ? (
        <>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "qr"],
            }}
			enableTorch={torch}
          />
          <Button 
            title="Saisie manuelle" 
            onPress={() => {
              setShowManualInput(true);
              onModeChange?.(true);
            }}
          />
			<View style={styles.overlay}>
				<View style={styles.scanArea}>
					<View style={styles.cornerTL} />
					<View style={styles.cornerTR} />
					<View style={styles.cornerBL} />
					<View style={styles.cornerBR} />
				</View>
			</View>

			<View style={styles.controlsContainer}>
				<TouchableOpacity style={styles.torchButton} onPress={toggleTorch}>
					<MaterialCommunityIcons
						name={torch ? "flashlight" : "flashlight-off"}
						size={24}
						color="white"
					/>
				</TouchableOpacity>
				<Text style={styles.instruction}>
					Placez le code-barre dans le cadre ou utilisez la saisie manuelle
				</Text>
			</View>
        </>
      ) : (
        <View style={styles.manualInputWrapper}>
          <ManualInput onScanned={onScanned} />
          <Button 
            title="Retour au scan" 
            onPress={() => {
              setShowManualInput(false);
              onModeChange?.(false);
            }}
          />
        </View>
      )}
    </View>
  );
}

// Ajouter les styles nécessaires
const { width } = Dimensions.get('window');
const scanAreaSize = width * 0.7;
const cornerSize = 20;

/* ----------------------- STYLES ----------------------- */
const styles = StyleSheet.create({
	container: { 
		flex: 1,
		backgroundColor: '#fff' // Changé de 'black' à '#fff'
	},
	text: { 
		fontSize: 16, 
		textAlign: "center", 
		margin: 10,
		color: '#333' // Ajouté pour la cohérence avec le reste de l'application
	},
	subText: {
		fontSize: 14,
		textAlign: "center",
		color: '#666',
		marginBottom: 10,
		fontStyle: 'italic'
	},
	camera: { 
		flex: 1, 
		width: "100%" 
	},
	inputContainer: { 
		display: "flex", 
		flexDirection: "column", 
		alignItems: "center", 
		padding: 20,
		gap: 15,
		backgroundColor: '#fff'
	},
	manualInputWrapper: {
		flex: 1,
		justifyContent: "center",
		backgroundColor: '#fff'
	},
	input: {
		width: "100%",
		maxWidth: 300,
		height: 40,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		paddingHorizontal: 10,
		backgroundColor: '#fff'
	},
  // ... styles existants ...
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  scanArea: {
    width: scanAreaSize,
    height: scanAreaSize,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#fff',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: cornerSize,
    height: cornerSize,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#fff',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#fff',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: cornerSize,
    height: cornerSize,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#fff',
  },
  torchButton: {
    padding: 15,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginBottom: 20,
  },
  instruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 5,
  },
});