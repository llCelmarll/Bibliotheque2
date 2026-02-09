import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePreview } from './ImagePreview';
import { resolveCoverUrl } from '@/utils/coverUrl';

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

    const pickFromGallery = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission requise', "Autorisez l'acces a la galerie pour choisir une image.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [2, 3],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            onLocalImagePicked(result.assets[0].uri);
            setShowUrlInput(false);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission requise', "Autorisez l'acces a la camera pour prendre une photo.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [2, 3],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            onLocalImagePicked(result.assets[0].uri);
            setShowUrlInput(false);
        }
    };

    const hasImage = localImageUri || (coverUrl && coverUrl.length > 0);

    // Determiner l'URL a afficher pour les couvertures existantes (locales ou externes)
    const resolvedCoverUrl = coverUrl ? resolveCoverUrl(coverUrl) : undefined;
    
    // Debug: afficher les URLs pour diagnostiquer
    if (coverUrl && !localImageUri) {
        console.log('📸 CoverPicker - coverUrl:', coverUrl);
        console.log('📸 CoverPicker - resolvedCoverUrl:', resolvedCoverUrl);
    }

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
            ) : coverUrl ? (
                <View style={styles.previewContainer}>
                    {coverUrl.startsWith('http') || coverUrl.startsWith('/covers/') ? (
                        <Image
                            source={{ uri: resolvedCoverUrl }}
                            style={styles.preview}
                            resizeMode="contain"
                            onError={(e) => {
                                console.error('❌ Erreur chargement couverture:', resolvedCoverUrl, e.nativeEvent.error);
                            }}
                            onLoad={() => {
                                console.log('✅ Couverture chargée:', resolvedCoverUrl);
                            }}
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
                        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
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
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}
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
});
