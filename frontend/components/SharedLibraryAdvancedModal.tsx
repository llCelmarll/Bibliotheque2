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
import { useTheme } from '@/contexts/ThemeContext';

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
    const theme = useTheme();
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
                style={[styles.overlay, { backgroundColor: `${theme.textPrimary}80` }]}
                behavior={undefined}
            >
                <View style={[styles.modal, { backgroundColor: theme.bgCard }]}>
                    <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>Recherche avancée</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Titre</Text>
                        <TextInput
                            style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Rechercher dans le titre"
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                        />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Auteur</Text>
                        <TextInput
                            style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                            value={author}
                            onChangeText={setAuthor}
                            placeholder="Nom de l'auteur"
                            placeholderTextColor={theme.textMuted}
                        />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Éditeur</Text>
                        <TextInput
                            style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                            value={publisher}
                            onChangeText={setPublisher}
                            placeholder="Nom de l'éditeur"
                            placeholderTextColor={theme.textMuted}
                        />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Genre</Text>
                        <TextInput
                            style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                            value={genre}
                            onChangeText={setGenre}
                            placeholder="Nom du genre"
                            placeholderTextColor={theme.textMuted}
                        />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>ISBN</Text>
                        <TextInput
                            style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                            value={isbn}
                            onChangeText={setIsbn}
                            placeholder="ISBN"
                            placeholderTextColor={theme.textMuted}
                        />
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>Année min</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                                    value={yearMin}
                                    onChangeText={setYearMin}
                                    placeholder="ex. 1990"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.half}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>Année max</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                                    value={yearMax}
                                    onChangeText={setYearMax}
                                    placeholder="ex. 2024"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>Pages min</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                                    value={pageMin}
                                    onChangeText={setPageMin}
                                    placeholder="ex. 100"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.half}>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>Pages max</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }]}
                                    value={pageMax}
                                    onChangeText={setPageMax}
                                    placeholder="ex. 500"
                                    placeholderTextColor={theme.textMuted}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>
                    </ScrollView>
                    <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
                        <TouchableOpacity style={[styles.resetButton, { backgroundColor: theme.bgSecondary }]} onPress={handleReset}>
                            <Text style={[styles.resetButtonText, { color: theme.textPrimary }]}>Réinitialiser</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.searchButton, { backgroundColor: theme.accent }]} onPress={handleSearch}>
                            <MaterialIcons name="search" size={20} color={theme.textInverse} />
                            <Text style={[styles.searchButtonText, { color: theme.textInverse }]}>Rechercher</Text>
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
        justifyContent: 'flex-end',
    },
    modal: {
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
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
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
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
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
    },
    resetButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    resetButtonText: {
        fontSize: 16,
    },
    searchButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
    },
    searchButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
