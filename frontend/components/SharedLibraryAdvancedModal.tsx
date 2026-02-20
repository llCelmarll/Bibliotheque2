import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface SharedLibraryAdvancedParams {
    title?: string;
    author?: string;
    publisher?: string;
    genre?: string;
    isbn?: string;
    year_min?: number;
    year_max?: number;
    page_min?: number;
    page_max?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

interface SharedLibraryAdvancedModalProps {
    visible: boolean;
    onClose: () => void;
    onSearch: (params: SharedLibraryAdvancedParams) => void;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export const SharedLibraryAdvancedModal: React.FC<SharedLibraryAdvancedModalProps> = ({
    visible,
    onClose,
    onSearch,
    sortBy,
    sortOrder,
}) => {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [publisher, setPublisher] = useState('');
    const [genre, setGenre] = useState('');
    const [isbn, setIsbn] = useState('');
    const [yearMin, setYearMin] = useState('');
    const [yearMax, setYearMax] = useState('');
    const [pageMin, setPageMin] = useState('');
    const [pageMax, setPageMax] = useState('');

    const handleSearch = useCallback(() => {
        const params: SharedLibraryAdvancedParams = {
            sort_by: sortBy,
            sort_order: sortOrder,
        };
        if (title.trim()) params.title = title.trim();
        if (author.trim()) params.author = author.trim();
        if (publisher.trim()) params.publisher = publisher.trim();
        if (genre.trim()) params.genre = genre.trim();
        if (isbn.trim()) params.isbn = isbn.trim();
        const yMin = parseInt(yearMin, 10);
        if (!isNaN(yMin)) params.year_min = yMin;
        const yMax = parseInt(yearMax, 10);
        if (!isNaN(yMax)) params.year_max = yMax;
        const pMin = parseInt(pageMin, 10);
        if (!isNaN(pMin) && pMin >= 1) params.page_min = pMin;
        const pMax = parseInt(pageMax, 10);
        if (!isNaN(pMax) && pMax >= 1) params.page_max = pMax;
        onSearch(params);
        onClose();
    }, [title, author, publisher, genre, isbn, yearMin, yearMax, pageMin, pageMax, sortBy, sortOrder, onSearch, onClose]);

    const handleReset = useCallback(() => {
        setTitle('');
        setAuthor('');
        setPublisher('');
        setGenre('');
        setIsbn('');
        setYearMin('');
        setYearMax('');
        setPageMin('');
        setPageMax('');
    }, []);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            transparent
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Recherche avancée</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.label}>Titre</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Rechercher dans le titre"
                            autoCapitalize="none"
                        />
                        <Text style={styles.label}>Auteur</Text>
                        <TextInput
                            style={styles.input}
                            value={author}
                            onChangeText={setAuthor}
                            placeholder="Nom de l'auteur"
                        />
                        <Text style={styles.label}>Éditeur</Text>
                        <TextInput
                            style={styles.input}
                            value={publisher}
                            onChangeText={setPublisher}
                            placeholder="Nom de l'éditeur"
                        />
                        <Text style={styles.label}>Genre</Text>
                        <TextInput
                            style={styles.input}
                            value={genre}
                            onChangeText={setGenre}
                            placeholder="Nom du genre"
                        />
                        <Text style={styles.label}>ISBN</Text>
                        <TextInput
                            style={styles.input}
                            value={isbn}
                            onChangeText={setIsbn}
                            placeholder="ISBN"
                        />
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Text style={styles.label}>Année min</Text>
                                <TextInput
                                    style={styles.input}
                                    value={yearMin}
                                    onChangeText={setYearMin}
                                    placeholder="ex. 1990"
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.half}>
                                <Text style={styles.label}>Année max</Text>
                                <TextInput
                                    style={styles.input}
                                    value={yearMax}
                                    onChangeText={setYearMax}
                                    placeholder="ex. 2024"
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Text style={styles.label}>Pages min</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pageMin}
                                    onChangeText={setPageMin}
                                    placeholder="ex. 100"
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.half}>
                                <Text style={styles.label}>Pages max</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pageMax}
                                    onChangeText={setPageMax}
                                    placeholder="ex. 500"
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                            <Text style={styles.resetButtonText}>Réinitialiser</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                            <MaterialIcons name="search" size={20} color="#fff" />
                            <Text style={styles.searchButtonText}>Rechercher</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    scroll: {
        maxHeight: 400,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    half: {
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    resetButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    resetButtonText: {
        fontSize: 16,
        color: '#333',
    },
    searchButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#3498db',
    },
    searchButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
