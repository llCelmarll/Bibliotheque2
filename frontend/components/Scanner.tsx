import React, { useState, useEffect } from "react";
import { Platform, View, Text, Button, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

interface ScannerProps {
  onScanned: (isbn: string) => void;
  torchEnabled?: boolean;
  onModeChange?: (isManual: boolean) => void;
  onManualAdd?: () => void;
}

export default function Scanner({ onScanned, torchEnabled, onModeChange, onManualAdd }: ScannerProps) {
  const [hasCamera, setHasCamera] = useState(false);
  const [isMobileWeb, setIsMobileWeb] = useState(false);
  const isMobile = Platform.OS !== "web";
  const theme = useTheme();

  // Sur web, vérifier si c'est un navigateur mobile ET si une caméra est disponible
  useEffect(() => {
    if (Platform.OS === "web") {
      // Détection mobile web (smartphone/tablette)
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileWeb(isMobileDevice);

      if (isMobileDevice) {
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
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isMobile ? 'black' : theme.bgPrimary }]}>
      {isMobile ? (
        <MobileScanner
          onScanned={onScanned}
          torchEnabled={torchEnabled}
          onModeChange={onModeChange}
          onManualAdd={onManualAdd}
        />
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
	const theme = useTheme();

	React.useEffect(() => {
		if (Platform.OS === 'web' && inputRef.current) {
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
		if (Platform.OS === 'web' && event.nativeEvent?.key === 'Enter') {
			event.preventDefault();
			handleSubmit();
		}
	};

	return (
		<View style={[styles.inputContainer, { backgroundColor: theme.bgPrimary }]}>
			<MaterialCommunityIcons name="barcode-scan" size={48} color={theme.accent} style={{ marginBottom: 8 }} />
			<Text style={[styles.text, { color: theme.textPrimary }]}>Entrez un ISBN manuellement</Text>
			<Text style={[styles.subText, { color: theme.textMuted }]}>Appuyez sur Entrée pour lancer le scan</Text>
			<TextInput
				ref={inputRef}
				style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary, borderRadius: theme.radiusInput }]}
				value={isbn}
				onChangeText={setIsbn}
				placeholder="ISBN (ex: 9782253257332)"
				placeholderTextColor={theme.textMuted}
				keyboardType="numeric"
				onKeyPress={handleKeyPress}
				autoFocus={Platform.OS === 'web'}
				returnKeyType="search"
				onSubmitEditing={handleSubmit}
			/>
			<TouchableOpacity
				style={[styles.submitButton, { backgroundColor: theme.accent }]}
				onPress={handleSubmit}
			>
				<Text style={[styles.submitButtonText, { color: theme.textInverse }]}>Valider</Text>
			</TouchableOpacity>
		</View>
	);
}

/* ---------------------- MOBILE SCANNER (Expo Camera) ---------------------- */
function MobileScanner({ onScanned, torchEnabled, onModeChange, onManualAdd }: ScannerProps) {
	const [permission, requestPermission] = useCameraPermissions();
	const [scanned, setScanned] = useState(false);
	const [showManualInput, setShowManualInput] = useState(false);
	const [torch, setTorch] = useState(false);

	// Réinitialiser l'état du scanner quand on revient sur l'écran
	useFocusEffect(
		React.useCallback(() => {
			setScanned(false);
		}, [])
	);

	if (!permission) {
		return <View />;
	}

	const theme = useTheme();

	if (!permission.granted) {
		return (
			<View style={[styles.permissionContainer, { backgroundColor: theme.bgCard }]}>
				<MaterialCommunityIcons name="camera-off" size={64} color={theme.textSecondary} />
				<Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>Accès à la caméra requis</Text>
				<Text style={[styles.permissionText, { color: theme.textSecondary }]}>
					Pour scanner les codes-barres des livres, l'application a besoin d'accéder à votre caméra.
				</Text>
				<TouchableOpacity style={[styles.permissionButton, { backgroundColor: theme.accent }]} onPress={requestPermission}>
					<MaterialCommunityIcons name="camera" size={20} color={theme.textInverse} />
					<Text style={[styles.permissionButtonText, { color: theme.textInverse }]}>Autoriser l'accès</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.manualButton, { backgroundColor: theme.textSecondary }]}
					onPress={() => {
						setShowManualInput(true);
						onModeChange?.(true);
					}}
				>
					<MaterialCommunityIcons name="keyboard" size={20} color={theme.textInverse} />
					<Text style={[styles.manualButtonText, { color: theme.textInverse }]}>Saisir l'ISBN manuellement</Text>
				</TouchableOpacity>
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
          >
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
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <Text style={styles.instruction}>
                Placez le code-barre dans le cadre
              </Text>
              <TouchableOpacity
                style={[styles.manualInputButton, { backgroundColor: theme.textSecondary }]}
                onPress={() => {
                  setShowManualInput(true);
                  onModeChange?.(true);
                }}
              >
                <MaterialCommunityIcons name="keyboard" size={20} color={theme.textInverse} />
                <Text style={[styles.manualInputButtonText, { color: theme.textInverse }]}>Saisir l'ISBN manuellement</Text>
              </TouchableOpacity>
              {onManualAdd && (
                <TouchableOpacity
                  style={[styles.manualAddButton, { backgroundColor: theme.accent }]}
                  onPress={onManualAdd}
                >
                  <MaterialCommunityIcons name="book-plus" size={20} color={theme.textInverse} />
                  <Text style={[styles.manualAddButtonText, { color: theme.textInverse }]}>Ajout manuel</Text>
                </TouchableOpacity>
              )}
            </View>
          </CameraView>
        </>
      ) : (
        <View style={styles.manualInputWrapper}>
          <ManualInput onScanned={onScanned} />
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.accent }]}
            onPress={() => {
              setShowManualInput(false);
              setScanned(false);
              onModeChange?.(false);
            }}
          >
            <MaterialCommunityIcons name="camera" size={20} color={theme.textInverse} />
            <Text style={[styles.backButtonText, { color: theme.textInverse }]}>Retour au scan</Text>
          </TouchableOpacity>
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
	},
	text: {
		fontSize: 16,
		textAlign: "center",
		margin: 10,
	},
	subText: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: 10,
		fontStyle: 'italic'
	},
	camera: { 
		flex: 1, 
		width: "100%" 
	},
	inputContainer: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		padding: 40,
		gap: 15,
	},
	manualInputWrapper: {
		flex: 1,
		justifyContent: "center",
	},
	input: {
		width: "100%",
		maxWidth: 320,
		height: 48,
		borderWidth: 1,
		paddingHorizontal: 14,
		fontSize: 16,
	},
	submitButton: {
		width: "100%",
		maxWidth: 320,
		height: 48,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	submitButtonText: {
		fontSize: 16,
		fontWeight: "600",
	},
  // ... styles existants ...
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 15,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    marginBottom: 20,
  },
  instruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
    width: '80%',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    gap: 8,
    width: '80%',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manualInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    gap: 8,
    width: '80%',
    alignSelf: 'center',
  },
  manualInputButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manualAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    gap: 8,
    width: '80%',
    alignSelf: 'center',
  },
  manualAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});