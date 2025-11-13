// app/scan/manual.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookForm } from "@/components/scan/BookForm";
import { BookCreate, SuggestedBook } from "@/types/scanTypes";
import { bookService } from "@/services/bookService";
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ManualBookAddPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Protection centralisée
  // Données vides pour le formulaire d'ajout manuel
  const emptyBookData: SuggestedBook = {
    title: '',
    isbn: '',
    published_date: '',
    page_count: undefined,
    barcode: '',
    cover_url: '',
    authors: [], // Array vide pour les auteurs
    publisher: undefined, // Pas d'éditeur par défaut
    genres: [], // Array vide pour les genres
  };

  const handleSubmit = async (values: BookCreate) => {
    setIsSubmitting(true);
    try {
      console.log('📝 Ajout manuel - données:', values);
      // Validation côté client
      const validation = bookService.validateBookData(values);
      if (!validation.isValid) {
        console.error('❌ Validation échouée:', validation.errors);
        Alert.alert(
          'Erreur de validation',
          validation.errors.join('\n'),
          [{ text: 'OK' }]
        );
        return;
      }

      // Créer le livre via l'API
      const createdBook = await bookService.createBook(values);
      console.log('✅ Livre créé manuellement:', createdBook);
      // Message de succès avec navigation intelligente
      if (Platform.OS === 'web') {
        const goToBooks = confirm('✅ Livre ajouté avec succès !\n\nAller à la liste des livres ?');
        if (goToBooks) {
          router.push('/books');
        }
        // Sinon on reste sur la page pour ajouter un autre livre
      } else {
        Alert.alert(
          'Livre ajouté !',
          'Le livre a été ajouté à votre bibliothèque.',
          [
            {
              text: 'Liste des livres',
              onPress: () => router.push('/books')
            },
            {
              text: 'Voir le livre',
              onPress: () => router.push(`/books/${createdBook.id}`)
            },
            {
              text: 'Ajouter un autre',
              onPress: () => {
                // Rester sur la page pour ajouter un autre livre
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout manuel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      if (Platform.OS === 'web') {
        alert(`❌ Erreur: ${errorMessage}`);
      } else {
        Alert.alert(
          'Erreur',
          `Impossible d'ajouter le livre: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <View style={[styles.container, { paddingTop: insets.top }]}> 
        {/* En-tête personnalisé */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="menu-book" size={24} color="#3498db" />
            <Text style={styles.headerTitle}>Ajouter un livre manuellement</Text>
          </View>
          {/* Bouton retour vers la liste des livres */}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/books')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="list" size={20} color="#3498db" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions pour l'utilisateur */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>
              📝 Saisie manuelle
            </Text>
            <Text style={styles.instructionsText}>
              Remplissez les informations du livre. Seul le titre est obligatoire. 
              Les auteurs, éditeurs et genres seront créés automatiquement s'ils n'existent pas.
            </Text>
          </View>

          {/* Formulaire d'ajout manuel */}
          <BookForm
            initialData={emptyBookData}
            onSubmit={handleSubmit}
            submitButtonText={isSubmitting ? "Ajout en cours..." : "Ajouter le livre"}
            submitButtonLoadingText="Ajout en cours..."
            disableInternalScroll={true}
          />
        </ScrollView>
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Espace pour le clavier
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 20,
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