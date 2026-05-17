import React from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ConflictEntry } from '@/services/importJobService';

interface ConflictResolverModalProps {
  visible: boolean;
  conflicts: ConflictEntry[];
  selections: Record<number, Record<string, boolean>>;
  isResolving: boolean;
  onToggleField: (bookId: number, field: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApply: () => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  cover_url: 'Couverture',
  rating: 'Note',
  notes: 'Notes personnelles',
  subtitle: 'Sous-titre',
  published_date: 'Date de publication',
  page_count: 'Nombre de pages',
  publisher: 'Éditeur',
  genres: 'Genres',
  authors: 'Auteurs',
  series: 'Séries',
};

function formatFieldValue(field: string, value: any): string {
  if (field === 'rating') return `${value}/5`;
  if (field === 'cover_url') return 'URL';
  if (field === 'published_date') {
    const year = String(value).slice(0, 4);
    return year;
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  visible, conflicts, selections, isResolving,
  onToggleField, onSelectAll, onDeselectAll, onApply, onClose,
}) => {
  const theme = useTheme();

  const totalFields = conflicts.reduce((acc, c) =>
    acc + Object.keys(c.missing_fields).length + Object.keys(c.divergent_fields ?? {}).length, 0);
  const selectedFields = conflicts.reduce((acc, c) => {
    const sel = selections[c.existing_book_id] ?? {};
    return acc + Object.values(sel).filter(Boolean).length;
  }, 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bgMuted }]}>

        {/* En-tête fixe */}
        <View style={[styles.header, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="warning" size={20} color={theme.warning} />
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {conflicts.length} livre{conflicts.length > 1 ? 's' : ''} en conflit
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.subHeader, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderLight }]}>
          <View style={styles.bulkButtons}>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: theme.successBg, borderColor: theme.success }]}
              onPress={onSelectAll}
            >
              <MaterialIcons name="check-box" size={14} color={theme.success} />
              <Text style={[styles.bulkButtonText, { color: theme.success }]}>Tout accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: theme.bgMuted, borderColor: theme.borderLight }]}
              onPress={onDeselectAll}
            >
              <MaterialIcons name="check-box-outline-blank" size={14} color={theme.textMuted} />
              <Text style={[styles.bulkButtonText, { color: theme.textMuted }]}>Tout ignorer</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subHeaderText, { color: theme.textMuted }]}>
            {selectedFields} / {totalFields} champ{totalFields > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Liste scrollable */}
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {conflicts.map((c) => {
            const hasMissing = Object.keys(c.missing_fields).length > 0;
            const hasDivergent = Object.keys(c.divergent_fields ?? {}).length > 0;
            return (
              <View key={c.existing_book_id} style={[styles.bookCard, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
                <View style={styles.bookCardHeader}>
                  <MaterialIcons name="menu-book" size={18} color={theme.textMuted} />
                  <Text style={[styles.bookTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text style={[styles.bookLine, { color: theme.textMuted }]}>ligne {c.line}</Text>
                </View>

                {/* Champs manquants */}
                {hasMissing && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: theme.success }]} />
                      <Text style={[styles.sectionLabel, { color: theme.success }]}>Champs manquants</Text>
                    </View>
                    {Object.entries(c.missing_fields).map(([field, value]) => {
                      const checked = selections[c.existing_book_id]?.[field] ?? true;
                      return (
                        <TouchableOpacity
                          key={`m-${field}`}
                          style={[styles.fieldRow, {
                            backgroundColor: checked ? theme.successBg : theme.bgMuted,
                            borderColor: checked ? theme.success : theme.borderLight,
                          }]}
                          onPress={() => onToggleField(c.existing_book_id, field)}
                        >
                          <MaterialIcons
                            name={checked ? 'check-box' : 'check-box-outline-blank'}
                            size={20}
                            color={checked ? theme.success : theme.textMuted}
                          />
                          <View style={styles.fieldContent}>
                            <Text style={[styles.fieldLabel, { color: checked ? theme.success : theme.textMuted }]}>
                              {FIELD_LABELS[field] ?? field}
                            </Text>
                            <View style={styles.valueRow}>
                              <Text style={[styles.valueTag, { backgroundColor: theme.successBg, color: theme.success }]}>
                                import
                              </Text>
                              <Text style={[styles.valueText, { color: theme.textPrimary }]}>
                                {formatFieldValue(field, value)}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Champs divergents */}
                {hasDivergent && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={[styles.sectionDot, { backgroundColor: theme.warning }]} />
                      <Text style={[styles.sectionLabel, { color: theme.warning }]}>Valeurs différentes</Text>
                    </View>
                    {Object.entries(c.divergent_fields ?? {}).map(([field, div]) => {
                      const checked = selections[c.existing_book_id]?.[field] ?? false;
                      return (
                        <TouchableOpacity
                          key={`d-${field}`}
                          style={[styles.fieldRow, {
                            backgroundColor: checked ? theme.warningBg : theme.bgMuted,
                            borderColor: checked ? theme.warning : theme.borderLight,
                          }]}
                          onPress={() => onToggleField(c.existing_book_id, field)}
                        >
                          <MaterialIcons
                            name={checked ? 'check-box' : 'check-box-outline-blank'}
                            size={20}
                            color={checked ? theme.warning : theme.textMuted}
                          />
                          <View style={styles.fieldContent}>
                            <Text style={[styles.fieldLabel, { color: checked ? theme.warning : theme.textMuted }]}>
                              {FIELD_LABELS[field] ?? field}
                            </Text>
                            <View style={styles.valueRow}>
                              <Text style={[styles.valueTag, { backgroundColor: theme.bgMuted, color: theme.textMuted }]}>
                                base
                              </Text>
                              <Text style={[styles.valueText, { color: theme.textMuted }]}>
                                {formatFieldValue(field, div.existing)}
                              </Text>
                            </View>
                            <View style={styles.valueRow}>
                              <Text style={[styles.valueTag, {
                                backgroundColor: checked ? theme.warning : theme.textMuted,
                                color: theme.bgCard,
                              }]}>
                                import
                              </Text>
                              <Text style={[styles.valueText, { color: checked ? theme.warning : theme.textSecondary, fontWeight: '600' }]}>
                                {formatFieldValue(field, div.csv)}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Pied de page fixe */}
        <View style={[styles.footer, { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.accent }]}
            onPress={onApply}
            disabled={isResolving}
          >
            {isResolving ? (
              <ActivityIndicator size="small" color={theme.textInverse} />
            ) : (
              <MaterialIcons name="save" size={20} color={theme.textInverse} />
            )}
            <Text style={[styles.applyButtonText, { color: theme.textInverse }]}>
              {isResolving ? 'Application...' : `Appliquer (${selectedFields} champ${selectedFields > 1 ? 's' : ''})`}
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 as any },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  closeButton: { padding: 4 },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subHeaderText: { fontSize: 13 },
  bulkButtons: { flexDirection: 'row', gap: 8 as any },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 as any,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  bulkButtonText: { fontSize: 12, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 as any },
  bookCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bookCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as any,
    padding: 14,
  },
  bookTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  bookLine: { fontSize: 12 },
  section: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 as any },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 as any, marginBottom: 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10 as any,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  fieldContent: { flex: 1, gap: 4 as any },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 as any },
  valueTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    minWidth: 44,
    textAlign: 'center',
  },
  valueText: { fontSize: 13, flex: 1 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8 as any,
    borderRadius: 10,
    padding: 16,
  },
  applyButtonText: { fontSize: 16, fontWeight: '700' },
});
