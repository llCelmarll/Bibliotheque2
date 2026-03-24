import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Animated, Platform, Share } from 'react-native';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { bookService } from '@/services/bookService';
import { useTheme } from '@/contexts/ThemeContext';

interface ParsedBook {
  title: string;
  isbn?: string;
  authors?: string;
  publisher?: string;
  genres?: string;
  published_date?: string;
  page_count?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  total: number;
  errors: Array<{
    line: number;
    title: string;
    isbn: string;
    error: string;
  }>;
}

interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  currentBook: string;
}

export default function ImportCSV() {
  const theme = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<ParsedBook[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [populateCovers, setPopulateCovers] = useState<boolean>(false);
  const [encoding, setEncoding] = useState<'auto' | 'utf-8' | 'windows-1252' | 'iso-8859-1' | 'utf-16le' | 'utf-16be'>('auto');
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  const columnMapping: Record<string, string[]> = {
    title: ['titre', 'title', 'Titre', 'Title', 'nom', 'Nom'],
    isbn: ['isbn', 'ISBN', 'isbn13', 'ISBN13', 'code'],
    authors: ['auteur', 'auteurs', 'author', 'authors', 'Auteur', 'Auteurs'],
    publisher: ['editeur', 'éditeur', 'publisher', 'Editeur', 'Éditeur'],
    genres: ['genre', 'genres', 'Genre', 'Genres', 'categorie', 'catégorie', 'categories', 'catégories'],
    published_date: ['date_publication', 'published_date', 'annee', 'année', 'year', 'Date de publication', 'Année'],
    page_count: ['pages', 'page_count', 'nombre_pages', 'Pages', 'Nombre de pages']
  };

  const detectColumnName = (header: string): string | null => {
    const normalizedHeader = header.trim();
    for (const [standardName, variations] of Object.entries(columnMapping)) {
      if (variations.some(v => normalizedHeader.toLowerCase() === v.toLowerCase())) {
        return standardName;
      }
    }
    return null;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile(file.name);
      
      // Lire le fichier CSV (blob) puis décoder en UTF-8 avec fallback Windows-1252/Latin-1 si mojibake détecté
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const looksLikeMojibake = (text: string): boolean => {
        // Motifs courants quand un fichier Latin-1 est lu en UTF-8
        // ex: é -> Ã©, è -> Ã¨, ê -> Ãª, à -> Ã , ç -> Ã§, œ -> Å“
        return /(Ã.|Å“|Å’|â€™|â€¦|Â)/.test(text);
      };

      const safeDecode = (buf: ArrayBuffer, enc: string): string => {
        try {
          // @ts-ignore - TextDecoder disponible sur web
          const decoder = new TextDecoder(enc as any, { fatal: false });
          return decoder.decode(buf);
        } catch {
          return '';
        }
      };

      const scoreText = (text: string): number => {
        // Score bas = meilleur. Compte le U+FFFD, motifs mojibake et caractères de contrôle suspects
        const replacement = (text.match(/\uFFFD/g) || []).length;
        const mojibake = (text.match(/(Ã.|Å“|Å’|â€™|â€¦|Â)/g) || []).length;
        const control = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
        return replacement * 5 + mojibake * 3 + control;
      };

      const autoDetect = (buf: ArrayBuffer, preferEncodings: string[]): { text: string; encoding: string } => {
        const candidates = Array.from(new Set(preferEncodings));
        let best = { text: '', encoding: '', score: Number.POSITIVE_INFINITY };
        for (const enc of candidates) {
          const decoded = safeDecode(buf, enc);
          if (!decoded) continue;
          const s = scoreText(decoded);
          if (s < best.score) {
            best = { text: decoded, encoding: enc, score: s };
          }
        }
        if (!best.encoding) {
          // fallback strict
          return { text: safeDecode(buf, 'utf-8'), encoding: 'utf-8' };
        }
        return { text: best.text, encoding: best.encoding };
      };

      // Détection BOM
      const hasUTF8BOM = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      const hasUTF16LEBOM = bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE;
      const hasUTF16BEBOM = bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF;

      // 1) Choisir par BOM si présent, sinon tenter UTF-8 (ou forcer l'encodage choisi par l'utilisateur)
      let csvText = '';
      let usedEncoding = 'utf-8';

      // Forçage manuel de l'encodage si sélectionné
      if (encoding !== 'auto') {
        csvText = safeDecode(arrayBuffer, encoding);
        usedEncoding = encoding;
      } else if (hasUTF16LEBOM) {
        csvText = safeDecode(arrayBuffer.slice(2), 'utf-16le');
        usedEncoding = 'utf-16le';
      } else if (hasUTF16BEBOM) {
        csvText = safeDecode(arrayBuffer.slice(2), 'utf-16be');
        usedEncoding = 'utf-16be';
      } else {
        // Essai auto-détection basée sur score (ordre de préférence courant: utf-8, windows-1252, iso-8859-1, utf-16le)
        const preferred = ['utf-8', 'windows-1252', 'iso-8859-1', 'utf-16le'];
        const detected = autoDetect(arrayBuffer, preferred);
        csvText = detected.text;
        usedEncoding = hasUTF8BOM ? 'utf-8-bom' : detected.encoding;
      }

      // 2) Si mojibake détecté, tester Windows-1252 puis ISO-8859-1
      if (encoding === 'auto' && looksLikeMojibake(csvText)) {
        const detected = autoDetect(arrayBuffer, ['windows-1252', 'iso-8859-1', 'utf-16le', 'utf-8']);
        csvText = detected.text;
        usedEncoding = detected.encoding;
      }

      setStatusMessage(prev => (prev ? `${prev} | encodage: ${usedEncoding}` : `encodage: ${usedEncoding}`));
      
      // Parser le CSV
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            Alert.alert('Erreur', 'Le fichier CSV est vide');
            return;
          }

          // Stocker les données complètes
          setCsvData(results.data);
          setStatusMessage(`${results.data.length} ligne(s) chargée(s) depuis ${file.name}`);

          // Mapper les colonnes automatiquement
          const mappedData = results.data.map((row: any) => {
            const mappedRow: any = {};
            
            Object.keys(row).forEach((header) => {
              const standardName = detectColumnName(header);
              if (standardName && row[header]) {
                mappedRow[standardName] = row[header].trim();
              }
            });
            
            return mappedRow;
          });

          // Afficher preview (5 premières lignes)
          setPreviewData(mappedData.slice(0, 5) as ParsedBook[]);
          Alert.alert(
            'Fichier chargé',
            `${results.data.length} livre(s) détecté(s). Vérifiez l'aperçu avant d'importer.`
          );
        },
        error: (error: any) => {
          console.error('Erreur parsing CSV:', error);
          Alert.alert('Erreur', 'Impossible de lire le fichier CSV');
        }
      });
    } catch (error) {
      console.error('Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const importBooks = async () => {
    if (csvData.length === 0) {
      Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un fichier CSV');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: csvData.length, percentage: 0, currentBook: '' });
    setStatusMessage(`Import de ${csvData.length} livre(s) en cours...`);
    progressAnim.setValue(0);

    try {
      // Mapper et transformer les données stockées
      const booksToImport = csvData.map((row: any) => {
        const mappedRow: any = {};
        
        Object.keys(row).forEach((header) => {
          const standardName = detectColumnName(header);
          if (standardName && row[header]) {
            mappedRow[standardName] = row[header].trim();
          }
        });
        
        // Transformer en format BookCreate
        const book: any = {
          title: mappedRow.title || 'Sans titre',
          isbn: mappedRow.isbn || undefined,
          published_date: mappedRow.published_date || undefined,
          page_count: mappedRow.page_count ? parseInt(mappedRow.page_count) : undefined
        };

        // Gérer les auteurs (séparés par virgule)
        if (mappedRow.authors) {
          book.authors = mappedRow.authors
            .split(/[,;]/)
            .map((a: string) => a.trim())
            .filter((a: string) => a.length > 0);
        }

        // Gérer l'éditeur
        if (mappedRow.publisher) {
          book.publisher = mappedRow.publisher;
        }

        // Gérer les genres (séparés par virgule)
        if (mappedRow.genres) {
          book.genres = mappedRow.genres
            .split(/[,;]/)
            .map((g: string) => g.trim())
            .filter((g: string) => g.length > 0);
        }

        return book;
      });

      // Simuler la progression pendant l'import
      const simulateProgress = () => {
        const interval = setInterval(() => {
          setImportProgress(prev => {
            if (!prev || prev.percentage >= 90) {
              clearInterval(interval);
              return prev;
            }
            const newPercentage = Math.min(prev.percentage + Math.random() * 15, 90);
            const newCurrent = Math.floor((newPercentage / 100) * prev.total);
            const randomBook = booksToImport[Math.floor(Math.random() * booksToImport.length)];
            
            Animated.timing(progressAnim, {
              toValue: newPercentage,
              duration: 300,
              useNativeDriver: false,
            }).start();
            
            return {
              ...prev,
              current: newCurrent,
              percentage: newPercentage,
              currentBook: randomBook?.title || '',
            };
          });
        }, 500);
        
        return interval;
      };

      const progressInterval = simulateProgress();

      // Appel API avec skip_errors=true
      console.log('🚀 Déclenchement import CSV', {
        total: booksToImport.length,
        populateCovers,
        sample: booksToImport[0]
      });
      const result = await bookService.bulkCreateBooks(booksToImport, true, populateCovers);
      
      clearInterval(progressInterval);
      
      // Finaliser la progression à 100%
      setImportProgress({
        current: result.total,
        total: result.total,
        percentage: 100,
        currentBook: 'Terminé!',
      });
      
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      setImportResult(result);
      setStatusMessage(`Import terminé: ${result.success} succès, ${result.failed} échec(s)`);
      
      if (result.failed === 0) {
        Alert.alert(
          '✅ Import réussi',
          `${result.success} livre(s) importé(s) avec succès !`
        );
      } else {
        Alert.alert(
          '⚠️ Import partiel',
          `${result.success} livre(s) importé(s)\n${result.failed} échec(s)\n\nConsultez le rapport pour plus de détails.`
        );
      }
    } catch (error) {
      console.error('Erreur import:', error);
      Alert.alert('Erreur', 'Échec de l\'import. Vérifiez votre connexion.');
      setStatusMessage('Erreur lors de l\'import. Réessayez ou vérifiez le fichier.');
      setImportProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setCsvData([]);
    setPreviewData([]);
    setImportResult(null);
    setImportProgress(null);
    setStatusMessage('');
    progressAnim.setValue(0);
  };

  const exportErrorsAsCSV = async () => {
    if (!importResult || importResult.errors.length === 0) {
      Alert.alert('Info', 'Aucune erreur à exporter');
      return;
    }

    try {
      // Créer le contenu CSV avec séparateur point-virgule (comme le fichier d'import)
      const csvHeaders = 'Ligne;Titre;ISBN;Erreur\n';
      const csvRows = importResult.errors.map(error => {
        // Échapper les guillemets et entourer les champs de guillemets
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        return `${error.line};${escapeCsv(error.title)};${escapeCsv(error.isbn || 'N/A')};${escapeCsv(error.error)}`;
      }).join('\n');
      
      // Ajouter le BOM UTF-8 pour Excel
      const BOM = '\uFEFF';
      const csvContent = BOM + csvHeaders + csvRows;
      
      // Créer un nom de fichier avec la date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `erreurs_import_${date}.csv`;

      if (Platform.OS === 'web') {
        // Pour le web, télécharger directement
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        Alert.alert('✅ Export réussi', `Le fichier ${fileName} a été téléchargé`);
      } else {
        // Pour mobile, utiliser Share pour partager le contenu
        const message = `Rapport d'erreurs d'import (${importResult.errors.length} erreur(s))\n\n${csvContent}`;
        await Share.share({
          message: message,
          title: 'Erreurs d\'import CSV',
        });
      }
    } catch (error) {
      console.error('Erreur export CSV:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les erreurs');
    }
  };

  const exportErrorsAsJSON = async () => {
    if (!importResult || importResult.errors.length === 0) {
      Alert.alert('Info', 'Aucune erreur à exporter');
      return;
    }

    try {
      const reportData = {
        date: new Date().toISOString(),
        total_errors: importResult.failed,
        total_success: importResult.success,
        total_books: importResult.total,
        errors: importResult.errors
      };
      
      const jsonContent = JSON.stringify(reportData, null, 2);
      const date = new Date().toISOString().split('T')[0];
      const fileName = `erreurs_import_${date}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        Alert.alert('✅ Export réussi', `Le fichier ${fileName} a été téléchargé`);
      } else {
        // Pour mobile, utiliser Share pour partager le contenu
        await Share.share({
          message: jsonContent,
          title: 'Rapport d\'erreurs d\'import (JSON)',
        });
      }
    } catch (error) {
      console.error('Erreur export JSON:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les erreurs');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bgCard, shadowColor: theme.textPrimary }]}>
      <View style={styles.header}>
        <MaterialIcons name="upload-file" size={32} color={theme.accent} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>Import CSV</Text>
      </View>

      <View style={[styles.instructions, { backgroundColor: theme.bgMuted }]}>
        <Text style={[styles.instructionTitle, { color: theme.textPrimary }]}>Format du fichier CSV</Text>
        <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
          Le fichier doit contenir des colonnes avec ces noms (pas d'ordre spécifique) :
        </Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>titre</Text> ou <Text style={[styles.bold, { color: theme.textPrimary }]}>title</Text> (obligatoire)</Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>isbn</Text> ou <Text style={[styles.bold, { color: theme.textPrimary }]}>ISBN</Text></Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>auteur(s)</Text> ou <Text style={[styles.bold, { color: theme.textPrimary }]}>authors</Text> (séparés par virgules)</Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>editeur</Text> ou <Text style={[styles.bold, { color: theme.textPrimary }]}>publisher</Text></Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>genre(s)</Text> (séparés par virgules)</Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>date_publication</Text> ou <Text style={[styles.bold, { color: theme.textPrimary }]}>année</Text></Text>
        <Text style={[styles.instructionItem, { color: theme.textSecondary }]}>• <Text style={[styles.bold, { color: theme.textPrimary }]}>pages</Text> ou <Text style={[styles.bold, { color: theme.textPrimary }]}>page_count</Text></Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={pickDocument}
          disabled={isProcessing}
        >
          <MaterialIcons name="folder-open" size={20} color={theme.textInverse} />
          <Text style={[styles.buttonText, styles.buttonTextWithIcon, { color: theme.textInverse }]}>Sélectionner un fichier</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={[styles.fileInfo, { backgroundColor: theme.successBg }]}>
            <MaterialIcons name="description" size={20} color={theme.success} />
            <Text style={[styles.fileName, { color: theme.success }]}>{selectedFile}</Text>
          </View>
        )}

        {!!statusMessage && (
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>{statusMessage}</Text>
        )}

        <View style={styles.encodingRow}>
          <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>Encodage</Text>
          <View style={styles.encodingButtons}>
            {(['auto','utf-8','windows-1252','iso-8859-1','utf-16le'] as const).map((enc) => (
              <TouchableOpacity
                key={enc}
                onPress={() => setEncoding(enc)}
                disabled={isProcessing}
                style={[styles.encButton, { backgroundColor: encoding === enc ? theme.accent : theme.bgMuted }]}
              >
                <Text style={[styles.encButtonText, { color: encoding === enc ? theme.textInverse : theme.textSecondary }]}>
                  {enc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.switchRow, { backgroundColor: theme.bgMuted }]}>
          <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>Peupler les couvertures (Google/OpenLibrary)</Text>
          <ThemedSwitch
            value={populateCovers}
            onValueChange={setPopulateCovers}
            disabled={isProcessing}
          />
        </View>

        {previewData.length > 0 && (
          <>
            <View style={styles.preview}>
              <Text style={[styles.previewTitle, { color: theme.textPrimary }]}>Aperçu (5 premières lignes)</Text>
              <ScrollView horizontal style={styles.previewScroll}>
                {previewData.map((book, idx) => (
                  <View key={idx} style={[styles.previewCard, { backgroundColor: theme.bgMuted }]}>
                    <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                      <Text style={[styles.bold, { color: theme.textPrimary }]}>Titre:</Text> {book.title}
                    </Text>
                    {book.isbn && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>ISBN:</Text> {book.isbn}
                      </Text>
                    )}
                    {book.authors && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Auteur(s):</Text> {book.authors}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.success }]}
              onPress={importBooks}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color={theme.textInverse} />
                  <Text style={[styles.buttonText, styles.buttonTextWithIcon, { color: theme.textInverse }]}>Import en cours...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="cloud-upload" size={20} color={theme.textInverse} />
                  <Text style={[styles.buttonText, styles.buttonTextWithIcon, { color: theme.textInverse }]}>Lancer l'import</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.bgMuted }]}
              onPress={reset}
              disabled={isProcessing}
            >
              <MaterialIcons name="refresh" size={20} color={theme.textSecondary} />
              <Text style={[styles.buttonText, styles.buttonTextWithIcon, { color: theme.textSecondary }]}>Recommencer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Barre de progression */}
      {importProgress && (
        <View style={[styles.progressContainer, { backgroundColor: theme.bgMuted }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: theme.textPrimary }]}>Import en cours...</Text>
            <Text style={[styles.progressPercentage, { color: theme.accent }]}>{Math.round(importProgress.percentage)}%</Text>
          </View>

          <View style={[styles.progressBarBackground, { backgroundColor: theme.borderLight }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { backgroundColor: theme.success },
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {importProgress.current} / {importProgress.total} livre(s)
            </Text>
            {importProgress.currentBook && (
              <Text style={[styles.progressCurrentBook, { color: theme.accent }]} numberOfLines={1}>
                📖 {importProgress.currentBook}
              </Text>
            )}
          </View>
        </View>
      )}

      {importResult && (
        <View style={[styles.result, { backgroundColor: theme.bgMuted }]}>
          <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
            {importResult.failed === 0 ? '✅ Import réussi' : '⚠️ Import partiel'}
          </Text>
          <Text style={[styles.resultText, { color: theme.success }]}>
            ✓ {importResult.success} livre(s) importé(s)
          </Text>
          {importResult.failed > 0 && (
            <>
              <Text style={[styles.resultText, { color: theme.danger }]}>
                ✗ {importResult.failed} échec(s)
              </Text>

              <View style={[styles.errorHelp, { backgroundColor: theme.accentLight, borderLeftColor: theme.accent }]}>
                <Text style={[styles.errorHelpTitle, { color: theme.accent }]}>💡 Types d'erreurs fréquentes :</Text>
                <Text style={[styles.errorHelpText, { color: theme.textSecondary }]}>
                  • <Text style={[styles.bold, { color: theme.textPrimary }]}>Conflit de doublon</Text> : Un auteur/éditeur existe déjà mais avec une orthographe légèrement différente (majuscules, accents, espaces)
                </Text>
                <Text style={[styles.errorHelpText, { color: theme.textSecondary }]}>
                  • <Text style={[styles.bold, { color: theme.textPrimary }]}>ISBN invalide</Text> : L'ISBN doit contenir exactement 10 ou 13 chiffres (sans tirets)
                </Text>
                <Text style={[styles.errorHelpText, { color: theme.textSecondary }]}>
                  • <Text style={[styles.bold, { color: theme.textPrimary }]}>Livre existant</Text> : Un livre avec le même titre et ISBN est déjà dans votre bibliothèque
                </Text>
              </View>

              <View style={styles.exportButtons}>
                <TouchableOpacity style={[styles.exportButton, { backgroundColor: theme.success }]} onPress={exportErrorsAsCSV}>
                  <MaterialIcons name="download" size={18} color={theme.textInverse} />
                  <Text style={[styles.exportButtonText, { color: theme.textInverse }]}>Exporter en CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.exportButton, { backgroundColor: theme.accent }]} onPress={exportErrorsAsJSON}>
                  <MaterialIcons name="code" size={18} color={theme.textInverse} />
                  <Text style={[styles.exportButtonText, { color: theme.textInverse }]}>Exporter en JSON</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.errorList}>
                {importResult.errors.map((error, idx) => (
                  <View key={idx} style={[styles.errorItem, { backgroundColor: theme.bgCard, borderLeftColor: theme.danger }]}>
                    <Text style={[styles.errorLine, { color: theme.danger }]}>Ligne {error.line}</Text>
                    <Text style={[styles.errorTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {error.title} {error.isbn && `(${error.isbn})`}
                    </Text>
                    <Text style={[styles.errorMessage, { color: theme.textMuted }]}>{error.error}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  instructions: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  actions: {
  },
  button: {
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButton: {
  },
  resetButton: {
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  preview: {
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewScroll: {
    maxHeight: 150,
  },
  previewCard: {
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 200,
  },
  previewText: {
    fontSize: 13,
    marginBottom: 4,
  },
  result: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
  },
  buttonTextWithIcon: {
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
    flex: 1,
  },
  encodingRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  encodingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 as any,
  },
  encButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 6,
    marginTop: 6,
  },
  encButtonActive: {
  },
  encButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  encButtonTextActive: {
  },
  errorList: {
    marginTop: 12,
    maxHeight: 200,
  },
  errorItem: {
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  errorLine: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 13,
    marginTop: 4,
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressInfo: {
    marginTop: 12,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 4,
  },
  progressCurrentBook: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  errorHelp: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  errorHelpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorHelpText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  exportButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportButtonJSON: {
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
