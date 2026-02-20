import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Alert, TextInput, Switch } from "react-native";
import { BookDetail } from "@/types/book";
import { InfoRow } from "@/components/BookDetail/InfoRow";
import { useRoute } from "@react-navigation/native";
import { formatDate, formatDateOnly } from "@/utils/dateFormatter";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ClickableTag } from "@/components/ClickableTag";
import { StarRating } from "@/components/StarRating";
import { createFilter } from "@/services/filtersService";
import { BookFilter } from "@/types/filter";
import { bookService } from "@/services/bookService";

type ReadStatus = 'unset' | 'read' | 'unread';

function getReadStatus(isRead: boolean | null | undefined): ReadStatus {
  if (isRead === true) return 'read';
  if (isRead === false) return 'unread';
  return 'unset';
}

function readStatusToIsRead(status: ReadStatus): boolean | null {
  if (status === 'read') return true;
  if (status === 'unread') return false;
  return null;
}

// Dans BaseInfoTab.tsx
export function BaseInfoTab() {
  const route = useRoute();
  const { book, onBookUpdated, readOnly } = route.params as { book: BookDetail; onBookUpdated?: () => void; readOnly?: boolean };

  const [readStatus, setReadStatus] = useState<ReadStatus>(getReadStatus(book.base.is_read));
  const [readDate, setReadDate] = useState<string | null>(book.base.read_date || null);
  const [rating, setRating] = useState<number | null>(book.base.rating ?? null);
  const [notes, setNotes] = useState<string>(book.base.notes ?? '');
  const [notesSaving, setNotesSaving] = useState(false);
  const [isLendable, setIsLendable] = useState<boolean>(book.base.is_lendable !== false);

  const handleFilterSelect = (filter: BookFilter) => {
    console.log('Filter selected:', filter);
  };

  const handleReadStatusChange = async (newStatus: ReadStatus) => {
    const previousStatus = readStatus;
    const previousDate = readDate;

    setReadStatus(newStatus);
    const newDate = newStatus === 'read' ? (readDate || new Date().toISOString()) : null;
    setReadDate(newDate);

    try {
      await bookService.toggleReadStatus(
        book.base.id.toString(),
        readStatusToIsRead(newStatus),
        newDate
      );
    } catch (error) {
      setReadStatus(previousStatus);
      setReadDate(previousDate);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut de lecture.');
    }
  };

  const handleRatingChange = async (newRating: number) => {
    const previousRating = rating;
    setRating(newRating);
    try {
      await bookService.updateBook(book.base.id.toString(), { rating: newRating });
      onBookUpdated?.();
    } catch {
      setRating(previousRating);
      Alert.alert('Erreur', 'Impossible de mettre à jour la notation.');
    }
  };

  const handleIsLendableChange = async (value: boolean) => {
    const previous = isLendable;
    setIsLendable(value);
    try {
      await bookService.updateBook(book.base.id.toString(), { is_lendable: value });
      onBookUpdated?.();
    } catch {
      setIsLendable(previous);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut de prêt.');
    }
  };

  const handleNotesBlur = useCallback(async () => {
    const currentNotes = notes.trim();
    const savedNotes = (book.base.notes ?? '').trim();
    if (currentNotes === savedNotes || notesSaving) return;

    setNotesSaving(true);
    try {
      await bookService.updateBook(book.base.id.toString(), { notes: currentNotes || null });
      onBookUpdated?.();
    } catch {
      setNotes(book.base.notes ?? '');
      Alert.alert('Erreur', 'Impossible de sauvegarder les notes.');
    } finally {
      setNotesSaving(false);
    }
  }, [notes, book.base.notes, book.base.id, onBookUpdated, notesSaving]);

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

  const getSeriesLabel = (count: number | undefined) => {
    if (count === undefined) return "Série";
    return count > 1 ? "Séries" : "Série";
  };

  const renderSeries = () => {
    if (!book.base.series || book.base.series.length === 0) {
      return null;
    }
    return book.base.series.map(s => (
      <ClickableTag
        key={s.id}
        filter={createFilter("series", {
          ...s,
          name: s.volume_number ? `${s.name} — T.${s.volume_number}` : s.name
        })}
        onPress={handleFilterSelect}
      />
    ));
  };

  const clickableStatusOptions: { key: ReadStatus; label: string }[] = [
    { key: 'read', label: 'Lu' },
    { key: 'unread', label: 'Non lu' },
  ];

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
          value={book.base.published_date || "Non renseigné"}
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

        {book.base.series && book.base.series.length > 0 && (
          <View style={styles.infoRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>
                {getSeriesLabel(book.base.series?.length)}
              </Text>
            </View>
            <View style={styles.valueContainer}>
              {renderSeries()}
            </View>
          </View>
        )}

        <InfoRow
          label="Nombre de pages"
          value={book.base.page_count?.toString() || "Non renseigné"}
        />
      </CollapsibleSection>

      {!readOnly && (
        <CollapsibleSection title="Lecture">
          <View style={styles.infoRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Statut</Text>
            </View>
            <View style={styles.segmentedContainer}>
              {readStatus === 'unset' && (
                <View style={[styles.segmentedButton, styles.segmentedButtonActive]}>
                  <Text style={[styles.segmentedButtonText, styles.segmentedButtonTextActive]}>
                    Non renseigné
                  </Text>
                </View>
              )}
              {clickableStatusOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.segmentedButton,
                    readStatus === option.key && styles.segmentedButtonActive,
                    readStatus === option.key && option.key === 'read' && styles.segmentedButtonRead,
                    readStatus === option.key && option.key === 'unread' && styles.segmentedButtonUnread,
                  ]}
                  onPress={() => handleReadStatusChange(option.key)}
                >
                  <Text style={[
                    styles.segmentedButtonText,
                    readStatus === option.key && styles.segmentedButtonTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {readStatus === 'read' && readDate && (
            <InfoRow label="Date de lecture" value={formatDateOnly(readDate)} />
          )}
        </CollapsibleSection>
      )}

      {!readOnly && (
        <CollapsibleSection title="Notation">
          <View style={styles.infoRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Note</Text>
            </View>
            <View style={styles.valueContainer}>
              <StarRating
                value={rating}
                editable={true}
                onChange={handleRatingChange}
              />
            </View>
          </View>
        </CollapsibleSection>
      )}

      {!readOnly && (
        <CollapsibleSection title="Prêt">
          <View style={styles.infoRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Visible dans{'\n'}la bibliothèque partagée</Text>
            </View>
            <View style={[styles.valueContainer, { alignItems: 'center' }]}>
              <Switch
                value={isLendable}
                onValueChange={handleIsLendableChange}
                trackColor={{ false: '#E0E0E0', true: '#90CAF9' }}
                thumbColor={isLendable ? '#2196F3' : '#9E9E9E'}
              />
            </View>
          </View>
        </CollapsibleSection>
      )}

      {!readOnly && (
        <CollapsibleSection title="Notes personnelles">
          <View style={styles.notesRow}>
            <TextInput
              style={styles.notesInput}
              placeholder="Ajoutez vos notes personnelles..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              onBlur={handleNotesBlur}
              editable={!notesSaving}
            />
          </View>
        </CollapsibleSection>
      )}

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
  segmentedContainer: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  segmentedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  segmentedButtonActive: {
    backgroundColor: '#e9ecef',
    borderColor: '#6c757d',
  },
  segmentedButtonRead: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  segmentedButtonUnread: {
    backgroundColor: '#e9ecef',
    borderColor: '#6c757d',
  },
  segmentedButtonText: {
    fontSize: 13,
    color: '#666',
  },
  segmentedButtonTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  notesRow: {
    paddingVertical: 8,
    width: '100%',
  },
  notesInput: {
    fontSize: 14,
    color: '#000',
    minHeight: 80,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlignVertical: 'top',
    width: '100%',
    alignSelf: 'stretch',
  },
});
