import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Platform, Alert, Modal, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImagePreview } from './ImagePreview';
import { resolveCoverUrl } from '@/utils/coverUrl';

const ASPECT_W = 2;
const ASPECT_H = 3;

interface CoverPickerProps {
    coverUrl: string;
    localImageUri: string | null;
    onCoverUrlChange: (url: string) => void;
    onLocalImagePicked: (uri: string) => void;
    onClearCover: () => void;
    error?: string;
}

export const CoverPicker: React.FC<CoverPickerProps> = ({
    coverUrl,
    localImageUri,
    onCoverUrlChange,
    onLocalImagePicked,
    onClearCover,
    error,
}) => {
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const [, requestPermission] = useCameraPermissions();

    // Sur web, utiliser un input HTML natif avec accept="image/*"
    // pour eviter le crash d'expo-image-picker sur les fichiers non-image
    const pickFromGalleryWeb = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const file = input.files?.[0];
            if (file) {
                const uri = URL.createObjectURL(file);
                setImageLoadError(false);
                onLocalImagePicked(uri);
                setShowUrlInput(false);
            }
        };
        input.click();
    };

    const pickFromGalleryNative = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission requise', "Autorisez l'acces a la galerie pour choisir une image.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [ASPECT_W, ASPECT_H],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setImageLoadError(false);
            onLocalImagePicked(result.assets[0].uri);
            setShowUrlInput(false);
        }
    };

    const pickFromGallery = Platform.OS === 'web' ? pickFromGalleryWeb : pickFromGalleryNative;

    const openCamera = async () => {
        // Workaround expo#39480: getCameraPermissionsAsync ne hang pas
        let { granted } = await ImagePicker.getCameraPermissionsAsync();
        if (!granted) {
            const req = await requestPermission();
            granted = req?.granted ?? false;
        }
        if (!granted) {
            Alert.alert('Permission requise', "Autorisez l'acces a la camera pour prendre une photo.");
            return;
        }
        setShowCamera(true);
    };

    const takePicture = async () => {
        try {
            const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
            if (!photo?.uri) return;

            // DEBUG temporaire
            Alert.alert('DEBUG photo', `uri=${photo.uri.substring(0, 50)}... w=${photo.width} h=${photo.height}`);

            const pw = photo.width;
            const ph = photo.height;

            // Si dimensions disponibles, crop 2:3 centre
            if (pw && ph) {
                const targetRatio = ASPECT_W / ASPECT_H;
                const photoRatio = pw / ph;

                let cropW: number, cropH: number;
                if (photoRatio > targetRatio) {
                    cropH = ph;
                    cropW = Math.round(ph * targetRatio);
                } else {
                    cropW = pw;
                    cropH = Math.round(pw / targetRatio);
                }
                const originX = Math.round((pw - cropW) / 2);
                const originY = Math.round((ph - cropH) / 2);

                const imageRef = await ImageManipulator
                    .manipulate(photo.uri)
                    .crop({ originX, originY, width: cropW, height: cropH })
                    .renderAsync();
                const cropped = await imageRef.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

                setImageLoadError(false);
                onLocalImagePicked(cropped.uri);
            } else {
                // Pas de dimensions → utiliser la photo brute
                setImageLoadError(false);
                onLocalImagePicked(photo.uri);
            }

            setShowUrlInput(false);
            setShowCamera(false);
        } catch (err: any) {
            console.warn('Erreur capture photo:', err);
            Alert.alert('DEBUG ERROR crop', `${err?.name}: ${err?.message}`);
        }
    };

    const hasImage = localImageUri || (coverUrl && coverUrl.length > 0 && !imageLoadError);

    const resolvedCoverUrl = coverUrl ? resolveCoverUrl(coverUrl) : undefined;

    // Dimensions du cadre de visee 2:3
    const screenW = Dimensions.get('window').width;
    const frameW = screenW * 0.7;
    const frameH = frameW * (ASPECT_H / ASPECT_W);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Couverture</Text>

            {/* Apercu de l'image locale */}
            {localImageUri ? (
                <View style={styles.previewContainer}>
                    <Image
                        source={{ uri: localImageUri }}
                        style={styles.preview}
                        resizeMode="contain"
                    />
                    <TouchableOpacity style={styles.removeBtn} onPress={onClearCover}>
                        <Text style={styles.removeBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                </View>
            ) : coverUrl && !imageLoadError ? (
                <View style={styles.previewContainer}>
                    {coverUrl.startsWith('http') || coverUrl.startsWith('/covers/') ? (
                        <Image
                            source={{ uri: resolvedCoverUrl }}
                            style={styles.preview}
                            resizeMode="contain"
                            onError={() => setImageLoadError(true)}
                        />
                    ) : (
                        <ImagePreview url={coverUrl} debounceMs={1500} />
                    )}
                    <TouchableOpacity style={styles.removeBtn} onPress={onClearCover}>
                        <Text style={styles.removeBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Boutons d'action quand pas d'image */}
            {!hasImage && (
                <View style={styles.buttonsContainer}>
                    {Platform.OS !== 'web' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={openCamera}>
                            <Text style={styles.actionBtnText}>Prendre une photo</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionBtn} onPress={pickFromGallery}>
                        <Text style={styles.actionBtnText}>
                            {Platform.OS === 'web' ? 'Choisir un fichier' : 'Galerie'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.urlBtn]}
                        onPress={() => setShowUrlInput(true)}
                    >
                        <Text style={styles.actionBtnText}>Coller une URL</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Champ URL (masque par defaut) */}
            {showUrlInput && !localImageUri && (
                <TextInput
                    style={styles.urlInput}
                    value={coverUrl}
                    onChangeText={onCoverUrlChange}
                    placeholder="https://example.com/couverture.jpg"
                    placeholderTextColor="#aaa"
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Modal camera plein ecran */}
            {Platform.OS !== 'web' && (
                <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
                    <SafeAreaView style={styles.cameraModal}>
                        <View style={{ flex: 1 }}>
                            <CameraView
                                ref={cameraRef}
                                style={StyleSheet.absoluteFill}
                                facing="back"
                            />
                            {/* Overlay avec cadre de visee 2:3 */}
                            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                <View style={styles.overlayTop} />
                                <View style={styles.overlayMiddle}>
                                    <View style={styles.overlaySide} />
                                    <View style={[styles.cameraFrame, { width: frameW, height: frameH }]} />
                                    <View style={styles.overlaySide} />
                                </View>
                                <View style={styles.overlayBottom} />
                            </View>
                        </View>
                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => setShowCamera(false)}>
                                <Text style={styles.cameraCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                                <View style={styles.captureBtnInner} />
                            </TouchableOpacity>
                            <View style={{ width: 70 }} />
                        </View>
                    </SafeAreaView>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    preview: {
        width: 120,
        height: 180,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6',
        backgroundColor: '#f8f9fa',
    },
    removeBtn: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#e74c3c',
        borderRadius: 6,
    },
    removeBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    buttonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        minWidth: 100,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#3498db',
        borderRadius: 8,
        alignItems: 'center',
    },
    urlBtn: {
        backgroundColor: '#95a5a6',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    urlInput: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
    },
    // Camera modal styles
    cameraModal: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    overlayMiddle: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cameraFrame: {
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 4,
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#000',
    },
    cameraCancelBtn: {
        width: 70,
    },
    cameraCancelText: {
        color: '#fff',
        fontSize: 16,
    },
    captureBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureBtnInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
    },
});
