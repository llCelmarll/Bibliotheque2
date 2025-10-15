import React from 'react';
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { BookDetail } from "@/types/book";
import { InfoRow } from "@/components/BookDetail/InfoRow";
import { useRoute } from "@react-navigation/native";
import { formatDate } from "@/utils/dateFormatter";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ClickableTag } from "@/components/ClickableTag";
import { createFilter } from "@/services/filtersService";
import { BookFilter } from "@/types/filter";

// Dans BaseInfoTab.tsx
export function BaseInfoTab() {
  const route = useRoute();
  const { book } = route.params as { book: BookDetail };

  const handleFilterSelect = (filter: BookFilter) => {
    console.log('Filter selected:', filter);
  };

  const getAuthorLabel = (count: number | undefined) => {
    if (count === undefined) return "Auteur";
    return count > 1 ? "Auteurs" : "Auteur";
  };

  const getGenreLabel = (count: number | undefined) => {
    if (count === undefined) return "Genre";
    return count > 1 ? "Genres" : "Genre";
  };

  const renderAuthors = () => {
    if (!book.base.authors || book.base.authors.length === 0) {
      return <Text style={styles.value}>Non renseigné</Text>;
    }
    return book.base.authors.map(author => (
      <ClickableTag
        key={author.id}
        filter={createFilter("author", author)}
        onPress={handleFilterSelect}
      />
    ));
  };

  const renderGenres = () => {
    if (!book.base.genres || book.base.genres.length === 0) {
      return <Text style={styles.value}>Non renseigné</Text>;
    }
    return book.base.genres.map(genre => (
      <ClickableTag
        key={genre.id}
        filter={createFilter("genre", genre)}
        onPress={handleFilterSelect}
      />
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <CollapsibleSection title="Informations générales">
        <View style={styles.infoRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>
              {getAuthorLabel(book.base.authors?.length)}
            </Text>
          </View>
          <View style={styles.valueContainer}>
            {renderAuthors()}
          </View>
        </View>

        <InfoRow label="ISBN" value={book.base.isbn || "Non renseigné"} />
        <InfoRow label="Code-barres" value={book.base.barcode || 'Non renseigné'} />
        
        <View style={styles.infoRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Éditeur</Text>
          </View>
          <View style={styles.valueContainer}>
            {book.base.publisher ? (
              <ClickableTag
                filter={createFilter("publisher", book.base.publisher)}
                onPress={handleFilterSelect}
              />
            ) : (
              <Text style={styles.value}>Non renseigné</Text>
            )}
          </View>
        </View>

        <InfoRow
          label="Date de publication" 
          value={formatDate(book.base.published_date)} 
        />

        <View style={styles.infoRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>
              {getGenreLabel(book.base.genres?.length)}
            </Text>
          </View>
          <View style={styles.valueContainer}>
            {renderGenres()}
          </View>
        </View>

        <InfoRow
          label="Nombre de pages" 
          value={book.base.page_count?.toString() || "Non renseigné"}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Métadonnées" defaultExpanded={false}>
        <InfoRow
          label="Créé le"
          value={formatDate(book.base.created_at)}
        />
        <InfoRow
          label="Mis à jour le"
          value={book.base.updated_at ? formatDate(book.base.updated_at) : 'Jamais'}
        />
      </CollapsibleSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  labelContainer: {
    flex: 1,
  },
  valueContainer: {
    flex: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#000',
  },
  tag: {
    marginBottom: 4,
  },
});