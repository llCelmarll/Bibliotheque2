import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useBookDetail } from '@/hooks/useBookDetail';
import { BookForm } from '@/components/scan/BookForm';
import { bookService } from '@/services/bookService';
import { BookCreate, SuggestedBook } from '@/types/scanTypes';
import { BookUpdate } from '@/types/book';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function EditBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { book, loading, error, refetch } = useBookDetail(id as string);

  // Convertir les données du livre en format SuggestedBook pour le formulaire
  const convertBookToSuggestedFormat = (): SuggestedBook | null => {
    console.log('🔄 Conversion des données livre vers SuggestedBook:', book);
    
    if (!book?.base) {
      console.log('❌ Pas de données base dans book:', book);
      return null;
    }

    const converted = {
      title: book.base.title || '',
      isbn: book.base.isbn || '',
      published_date: book.base.published_date || '',
      page_count: book.base.page_count || undefined,
      barcode: book.base.barcode || '',
      cover_url: book.base.cover_url || '',
      authors: book.base.authors?.map(author => ({
        name: author.name,
        id: author.id,
        exists: true
      })) || [],
      publisher: book.base.publisher ? {
        name: book.base.publisher.name,
        id: book.base.publisher.id,
        exists: true
      } : undefined,
      genres: book.base.genres?.map(genre => ({
        name: genre.name,
        id: genre.id,
        exists: true
      })) || []
    };
    
    console.log('✅ Données converties:', converted);
    return converted;
  };

  const handleFormSubmit = async (values: BookCreate) => {
    try {
      console.log('📝 Modification livre - données reçues:', values);
      
      // Validation côté client
      const validation = bookService.validateBookData(values);
      if (!validation.isValid) {
        console.error('❌ Validation échouée:', validation.errors);
        // TODO: Afficher les erreurs à l'utilisateur
        return;
      }

      // Maintenant le backend supporte les objets d'entités comme pour la création
      const updateData: BookUpdate = {
        title: values.title,
        isbn: values.isbn,
        published_date: values.published_date,
        page_count: values.page_count,
        barcode: values.barcode,
        cover_url: values.cover_url,
        authors: values.authors,
        publisher: values.publisher,
        genres: values.genres,
      };

      console.log('📝 Données envoyées à l\'API:', updateData);

      // Appel API pour modifier le livre
      const updatedBook = await bookService.updateBook(id as string, updateData);
      
      console.log('✅ Livre modifié avec succès!', updatedBook);
      
      // Retour à la page de détail du livre
      router.back();
      
    } catch (error) {
      console.error('❌ Erreur lors de la modification:', error);
      // TODO: Afficher un message d'erreur à l'utilisateur
    }
  };

  const suggestedData = convertBookToSuggestedFormat();

  if (!id) {
    return <ErrorMessage message="ID du livre manquant" onRetry={() => router.back()} />;
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.container}>
        {/* Header personnalisé avec bouton retour */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le livre</Text>
          <View style={styles.headerSpacer} />
        </View>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        ) : error ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ErrorMessage message={error} onRetry={refetch} />
          </ScrollView>
        ) : !suggestedData ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ErrorMessage message="Impossible de charger les données du livre" onRetry={refetch} />
          </ScrollView>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.sectionTitle}>Modifier les informations</Text>
            <BookForm
              initialData={suggestedData}
              onSubmit={handleFormSubmit}
              submitButtonText="Modifier le livre"
              submitButtonLoadingText="Modification..."
              disableInternalScroll={true}
            />
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Même largeur que le bouton retour pour centrer le titre
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32, // Extra padding en bas
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
});