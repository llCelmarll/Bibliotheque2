import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Animated, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { useTheme } from '@/contexts/ThemeContext';
import { parseCSVRow } from '@/utils/csvParser';
import { importJobService, ImportJobEvent, ImportJobResult, ConflictEntry, ConflictResolutionItem } from '@/services/importJobService';
import { ConflictResolverModal } from '@/components/ConflictResolverModal';

const ACTIVE_JOB_KEY = 'import_active_job_id';
const PENDING_CONFLICTS_KEY = 'import_pending_conflicts';

interface ParsedBook {
  title: string;
  subtitle?: string;
  isbn?: string;
  authors?: string;
  publisher?: string;
  genres?: string;
  published_date?: string;
  page_count?: string;
  series?: string;
  volume?: string;
  is_read?: string;
  rating?: string;
  notes?: string;
  cover_url?: string;
}

type ImportResult = ImportJobResult;

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
  const [detectedColumns, setDetectedColumns] = useState<{ key: string; label: string; detected: boolean }[]>([]);
  const [populateCovers, setPopulateCovers] = useState<boolean>(false);
  const [encoding, setEncoding] = useState<'auto' | 'utf-8' | 'windows-1252' | 'iso-8859-1' | 'utf-16le' | 'utf-16be'>('auto');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'running' | 'paused' | 'cancelled' | 'done' | 'error'>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflictSelections, setConflictSelections] = useState<Record<number, Record<string, boolean>>>({});
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);
  const [conflictResult, setConflictResult] = useState<{ applied: number; skipped: number } | null>(null);



  const columnMapping: Record<string, string[]> = {
    title: ['titre', 'title', 'Titre', 'Title', 'nom', 'Nom'],
    subtitle: ['subtitle', 'sous_titre', 'sous-titre', 'Subtitle', 'Sous-titre', 'Sous_titre'],
    isbn: ['isbn', 'ISBN', 'isbn13', 'ISBN13', 'code'],
    authors: ['auteur', 'auteurs', 'author', 'authors', 'Auteur', 'Auteurs'],
    publisher: ['editeur', 'éditeur', 'publisher', 'Editeur', 'Éditeur'],
    genres: ['genre', 'genres', 'Genre', 'Genres', 'categorie', 'catégorie', 'categories', 'catégories'],
    published_date: ['date_publication', 'published_date', 'annee', 'année', 'year', 'Date de publication', 'Année'],
    page_count: ['pages', 'page_count', 'nb_pages', 'nombre_pages', 'Pages', 'Nombre de pages'],
    series: ['serie', 'série', 'series', 'Series', 'Série', 'collection', 'Collection'],
    volume: ['tome', 'volume', 'Tome', 'Volume', 'numero', 'numéro', 'vol'],
    is_read: ['lu', 'is_read', 'Lu', 'Is_Read', 'read', 'Read'],
    rating: ['note', 'rating', 'Note', 'Rating', 'notation', 'Notation'],
    notes: ['notes', 'Notes', 'commentaire', 'Commentaire', 'commentaires', 'description'],
    cover_url: ['cover_url', 'couverture', 'image', 'cover', 'Cover', 'Couverture', 'image_url', 'photo'],
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

          // Calculer quelles colonnes ont été détectées
          const csvHeaders = results.data.length > 0 ? Object.keys(results.data[0] as any) : [];
          const detectedKeys = new Set(csvHeaders.map(h => detectColumnName(h)).filter(Boolean));
          const columnLabels: Record<string, string> = {
            title: 'titre *', subtitle: 'sous-titre', isbn: 'isbn', authors: 'auteurs',
            publisher: 'éditeur', genres: 'genres', published_date: 'date', page_count: 'pages',
            series: 'série', volume: 'tome', is_read: 'lu', rating: 'note', notes: 'notes', cover_url: 'couverture',
          };
          setDetectedColumns(
            Object.keys(columnLabels).map(key => ({
              key,
              label: columnLabels[key],
              detected: detectedKeys.has(key),
            }))
          );

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

  const updateProgress = (event: ImportJobEvent) => {
    const pct = Math.round(((event.current ?? 0) / (event.total ?? 1)) * 100);
    setJobStatus((event.status as any) ?? 'running');
    setImportProgress({
      current: event.current ?? 0,
      total: event.total ?? csvData.length,
      percentage: pct,
      currentBook: event.current_book ?? '',
    });
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const _handleJobFinished = (
    result: ImportJobResult,
    conflictList?: ConflictEntry[],
  ) => {
    setImportProgress(prev => prev ? { ...prev, percentage: 100, currentBook: result.cancelled ? 'Annulé' : 'Terminé' } : null);
    Animated.timing(progressAnim, { toValue: 100, duration: 300, useNativeDriver: false }).start();
    setImportResult(result);
    setJobStatus(result.cancelled ? 'cancelled' : 'done');
    setStatusMessage(
      result.cancelled
        ? `Import annulé — ${result.success} importé(s), ${result.failed} échec(s)`
        : `Import terminé — ${result.success} importé(s), ${result.failed} échec(s)`
    );
    if (conflictList && conflictList.length > 0) {
      setConflicts(conflictList);
      const defaultSel: Record<number, Record<string, boolean>> = {};
      for (const c of conflictList) {
        defaultSel[c.existing_book_id] = {
          ...Object.fromEntries(Object.keys(c.missing_fields).map(f => [f, true])),
          ...Object.fromEntries(Object.keys(c.divergent_fields ?? {}).map(f => [f, false])),
        };
      }
      setConflictSelections(defaultSel);
      setShowConflicts(true);
      // Persister pour survie à la navigation
      AsyncStorage.setItem(PENDING_CONFLICTS_KEY, JSON.stringify({ jobId: jobIdRef.current, conflicts: conflictList })).catch(() => {});
    }
    setIsProcessing(false);
  };

  const startStream = async (id: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let lastConflicts: ConflictEntry[] = [];
    try {
      const result = await importJobService.streamJob(id, (event) => {
        if (!event.heartbeat) {
          updateProgress(event);
          if (event.conflicts) lastConflicts = event.conflicts;
        }
      }, controller.signal);
      _handleJobFinished(result, lastConflicts);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      // Déconnexion réseau — le job continue côté serveur
      setStatusMessage('Connexion perdue. Reconnexion dans 3s...');
      setTimeout(async () => {
        try {
          const status = await importJobService.getStatus(id);
          if (status.done) {
            _handleJobFinished(
              {
                success: status.success ?? 0,
                failed: status.failed ?? 0,
                total: status.total ?? 0,
                skipped: status.skipped ?? 0,
                auto_completed: status.auto_completed ?? 0,
                errors: status.errors ?? [],
                cancelled: status.status === 'cancelled',
              },
              status.conflicts,
            );
            setJobStatus((status.status as any) ?? 'done');
          } else {
            setStatusMessage('Reconnexion au job...');
            await startStream(id);
          }
        } catch {
          setStatusMessage('Impossible de se reconnecter. Vérifiez votre connexion.');
          setJobStatus('error');
          setIsProcessing(false);
        }
      }, 3000);
    }
  };

  const importBooks = async () => {
    if (csvData.length === 0) {
      Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un fichier CSV');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);
    setConflictResult(null);
    setConflicts([]);
    setShowConflicts(false);
    setConflictSelections({});
    setJobStatus('running');
    setImportProgress({ current: 0, total: csvData.length, percentage: 0, currentBook: '' });
    const estimatedSeconds = populateCovers ? Math.round(csvData.length * 0.5) : null;
    setStatusMessage(
      populateCovers
        ? `Import de ${csvData.length} livre(s) avec couvertures (~${estimatedSeconds}s)...`
        : `Import de ${csvData.length} livre(s) en cours...`
    );
    progressAnim.setValue(0);

    try {
      const booksToImport = csvData.map((row: any) => {
        const mappedRow: Record<string, string> = {};
        Object.keys(row).forEach((header) => {
          const standardName = detectColumnName(header);
          if (standardName && row[header]) {
            mappedRow[standardName] = row[header].trim();
          }
        });
        return parseCSVRow(mappedRow);
      });

      const { job_id } = await importJobService.startImport(booksToImport, true, populateCovers);
      setJobId(job_id);
      jobIdRef.current = job_id;
      await startStream(job_id);
    } catch (error: any) {
      console.error('Erreur import:', error);
      const msg = error?.message || 'Échec de l\'import. Vérifiez votre connexion.';
      Alert.alert('Erreur', msg);
      setStatusMessage('Erreur lors de l\'import. Réessayez ou vérifiez le fichier.');
      setImportProgress(null);
      setJobStatus('error');
      setIsProcessing(false);
    }
  };

  // Au montage : vérifier si un job actif existe côté serveur et reprendre le stream
  // ou restaurer des conflits en attente de résolution
  useEffect(() => {
    let cancelled = false;
    const checkActive = async () => {
      try {
        const active = await importJobService.getActiveJob();
        if (cancelled || !active || !active.job_id) {
          // Pas de job actif — vérifier conflits persistés
          const raw = await AsyncStorage.getItem(PENDING_CONFLICTS_KEY);
          if (raw && !cancelled) {
            const { jobId: savedJobId, conflicts: savedConflicts } = JSON.parse(raw);
            // Vérifier que le job existe encore sur le serveur
            try {
              await importJobService.getStatus(savedJobId);
              setJobId(savedJobId);
              jobIdRef.current = savedJobId;
              setConflicts(savedConflicts);
              const defaultSel: Record<number, Record<string, boolean>> = {};
              for (const c of savedConflicts) {
                defaultSel[c.existing_book_id] = {
                  ...Object.fromEntries(Object.keys(c.missing_fields).map((f: string) => [f, true])),
                  ...Object.fromEntries(Object.keys(c.divergent_fields ?? {}).map((f: string) => [f, false])),
                };
              }
              setConflictSelections(defaultSel);
              setShowConflicts(true);
              setJobStatus('done');
            } catch {
              // Job expiré — on efface
              AsyncStorage.removeItem(PENDING_CONFLICTS_KEY).catch(() => {});
            }
          }
          return;
        }
        const id = active.job_id;
        setJobId(id);
        jobIdRef.current = id;
        setJobStatus((active.status as any) ?? 'running');
        setIsProcessing(true);
        setImportProgress({
          current: active.current ?? 0,
          total: active.total ?? 0,
          percentage: active.total ? Math.round(((active.current ?? 0) / active.total) * 100) : 0,
          currentBook: active.current_book ?? '',
        });
        setStatusMessage('Import en cours — reconnexion...');
        if (!active.done) {
          await startStream(id);
        } else {
          setIsProcessing(false);
        }
      } catch {
        // Aucun job actif ou erreur réseau — on ignore
      }
    };
    checkActive();
    return () => { cancelled = true; };
  }, []);

  const handlePause = async () => {
    if (!jobId) return;
    try {
      await importJobService.pause(jobId);
      setJobStatus('paused');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre en pause');
    }
  };

  const handleResume = async () => {
    if (!jobId) return;
    try {
      await importJobService.resume(jobId);
      setJobStatus('running');
      // Si le stream s'est coupé entre temps, on se reconnecte
      if (abortControllerRef.current?.signal.aborted) {
        await startStream(jobId);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de reprendre');
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    Alert.alert(
      'Annuler l\'import',
      'Les livres déjà importés resteront dans votre bibliothèque. Continuer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await importJobService.cancel(jobId);
              abortControllerRef.current?.abort();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible d\'annuler');
            }
          },
        },
      ]
    );
  };

  const reset = () => {
    abortControllerRef.current?.abort();
    AsyncStorage.removeItem(PENDING_CONFLICTS_KEY).catch(() => {});
    setSelectedFile(null);
    setCsvData([]);
    setPreviewData([]);
    setDetectedColumns([]);
    setImportResult(null);
    setImportProgress(null);
    setStatusMessage('');
    setJobId(null);
    setJobStatus('idle');
    setConflicts([]);
    setShowConflicts(false);
    setConflictSelections({});
    setConflictResult(null);
    progressAnim.setValue(0);
  };

  const toggleConflictField = (bookId: number, field: string) => {
    setConflictSelections(prev => ({
      ...prev,
      [bookId]: { ...prev[bookId], [field]: !prev[bookId]?.[field] },
    }));
  };

  const selectAllConflicts = () => {
    const all: Record<number, Record<string, boolean>> = {};
    for (const c of conflicts) {
      all[c.existing_book_id] = {
        ...Object.fromEntries(Object.keys(c.missing_fields).map(f => [f, true])),
        ...Object.fromEntries(Object.keys(c.divergent_fields ?? {}).map(f => [f, true])),
      };
    }
    setConflictSelections(all);
  };

  const deselectAllConflicts = () => {
    const none: Record<number, Record<string, boolean>> = {};
    for (const c of conflicts) {
      none[c.existing_book_id] = {
        ...Object.fromEntries(Object.keys(c.missing_fields).map(f => [f, false])),
        ...Object.fromEntries(Object.keys(c.divergent_fields ?? {}).map(f => [f, false])),
      };
    }
    setConflictSelections(none);
  };

  const handleApplyConflicts = async () => {
    if (!jobId) return;
    setIsResolvingConflicts(true);
    try {
      const resolutions: ConflictResolutionItem[] = conflicts.map(c => {
        const sel = conflictSelections[c.existing_book_id] ?? {};
        const selectedFields: Record<string, any> = {};
        for (const [field, checked] of Object.entries(sel)) {
          if (!checked) continue;
          if (field in c.missing_fields) {
            selectedFields[field] = c.missing_fields[field];
          } else if (c.divergent_fields?.[field]) {
            selectedFields[field] = c.divergent_fields[field].csv;
          }
        }
        return {
          existing_book_id: c.existing_book_id,
          fields: Object.keys(selectedFields).length > 0 ? selectedFields : null,
        };
      });
      const result = await importJobService.resolveConflicts(jobId, resolutions);
      setConflictResult(result);
      setShowConflicts(false);
      AsyncStorage.removeItem(PENDING_CONFLICTS_KEY).catch(() => {});
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d\'appliquer les modifications');
    } finally {
      setIsResolvingConflicts(false);
    }
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
          Toutes les colonnes sont optionnelles sauf le titre. L'ordre n'a pas d'importance.
        </Text>
        {[
          { label: 'titre *', values: 'titre, title, nom', note: '(obligatoire)' },
          { label: 'sous-titre', values: 'subtitle, sous_titre, sous-titre' },
          { label: 'isbn', values: 'isbn, ISBN, isbn13, code' },
          { label: 'auteurs', values: 'auteur, auteurs, author, authors', note: '(séparés par virgules)' },
          { label: 'éditeur', values: 'editeur, éditeur, publisher' },
          { label: 'genres', values: 'genre, genres, categorie, catégorie', note: '(séparés par virgules)' },
          { label: 'date', values: 'date_publication, annee, année, year' },
          { label: 'pages', values: 'pages, page_count, nombre_pages' },
          { label: 'série', values: 'serie, série, collection', note: '("Dune:1" ou "Dune:1 ; Fondation:3" pour plusieurs)' },
          { label: 'tome', values: 'tome, volume, numéro, vol', note: '(alternatif si série sans ":")' },
          { label: 'lu', values: 'lu, is_read, read', note: '(oui/non ou true/false)' },
          { label: 'note', values: 'note, rating, notation', note: '(0 à 5)' },
          { label: 'notes', values: 'notes, commentaire, description', note: '(texte libre)' },
          { label: 'couverture', values: 'couverture, cover_url, image, cover', note: '(URL)' },
        ].map(({ label, values, note }) => (
          <View key={label} style={styles.instructionRow}>
            <Text style={[styles.instructionLabel, { color: theme.textPrimary }]}>{label}</Text>
            <Text style={[styles.instructionValues, { color: theme.textSecondary }]}>
              {values}{note ? <Text style={[styles.instructionNote, { color: theme.textMuted }]}> {note}</Text> : null}
            </Text>
          </View>
        ))}
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
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>Peupler les couvertures (Google/OpenLibrary)</Text>
            {populateCovers && (
              <Text style={[styles.instructionNote, { color: theme.textMuted, marginTop: 2 }]}>
                ⚠️ Ralentit l'import (~0,5s par livre avec ISBN)
              </Text>
            )}
          </View>
          <ThemedSwitch
            value={populateCovers}
            onValueChange={setPopulateCovers}
            disabled={isProcessing}
          />
        </View>

        {previewData.length > 0 && (
          <>
            <View style={styles.preview}>
              {/* Résumé des colonnes détectées */}
              <Text style={[styles.previewTitle, { color: theme.textPrimary }]}>Colonnes détectées</Text>
              <View style={styles.columnBadges}>
                {detectedColumns.map(({ key, label, detected }) => (
                  <View
                    key={key}
                    style={[
                      styles.columnBadge,
                      { backgroundColor: detected ? theme.successBg : theme.bgMuted, borderColor: detected ? theme.success : theme.borderLight },
                    ]}
                  >
                    <Text style={[styles.columnBadgeText, { color: detected ? theme.success : theme.textMuted }]}>
                      {detected ? '✓' : '–'} {label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Aperçu des lignes */}
              <Text style={[styles.previewTitle, { color: theme.textPrimary, marginTop: 12 }]}>Aperçu (5 premières lignes)</Text>
              <ScrollView horizontal style={styles.previewScroll}>
                {previewData.map((book, idx) => (
                  <View key={idx} style={[styles.previewCard, { backgroundColor: theme.bgMuted }]}>
                    <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                      <Text style={[styles.bold, { color: theme.textPrimary }]}>Titre:</Text> {book.title}
                    </Text>
                    {book.subtitle && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Sous-titre:</Text> {book.subtitle}
                      </Text>
                    )}
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
                    {book.publisher && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Éditeur:</Text> {book.publisher}
                      </Text>
                    )}
                    {book.genres && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Genre(s):</Text> {book.genres}
                      </Text>
                    )}
                    {book.series && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Série:</Text> {book.series}{book.volume ? ` (t. ${book.volume})` : ''}
                      </Text>
                    )}
                    {book.is_read !== undefined && book.is_read !== '' && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Lu:</Text> {book.is_read}
                      </Text>
                    )}
                    {book.rating && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Note:</Text> {book.rating}/5
                      </Text>
                    )}
                    {book.notes && (
                      <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={2}>
                        <Text style={[styles.bold, { color: theme.textPrimary }]}>Notes:</Text> {book.notes}
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
            <Text style={[styles.progressTitle, { color: theme.textPrimary }]}>
              {jobStatus === 'paused' ? 'Import en pause' : jobStatus === 'cancelled' ? 'Import annulé' : 'Import en cours...'}
            </Text>
            <Text style={[styles.progressPercentage, { color: theme.accent }]}>{Math.round(importProgress.percentage)}%</Text>
          </View>

          <View style={[styles.progressBarBackground, { backgroundColor: theme.borderLight }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { backgroundColor: jobStatus === 'paused' ? theme.textMuted : jobStatus === 'cancelled' ? theme.danger : theme.success },
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
                {jobStatus === 'paused' ? '⏸' : '📖'} {importProgress.currentBook}
              </Text>
            )}
          </View>

          {/* Boutons de contrôle */}
          {(jobStatus === 'running' || jobStatus === 'paused') && (
            <View style={styles.controlButtons}>
              {jobStatus === 'running' ? (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}
                  onPress={handlePause}
                >
                  <MaterialIcons name="pause" size={18} color={theme.textPrimary} />
                  <Text style={[styles.controlButtonText, { color: theme.textPrimary }]}>Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: theme.successBg, borderColor: theme.success }]}
                  onPress={handleResume}
                >
                  <MaterialIcons name="play-arrow" size={18} color={theme.success} />
                  <Text style={[styles.controlButtonText, { color: theme.success }]}>Reprendre</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: theme.bgCard, borderColor: theme.danger }]}
                onPress={handleCancel}
              >
                <MaterialIcons name="close" size={18} color={theme.danger} />
                <Text style={[styles.controlButtonText, { color: theme.danger }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <ConflictResolverModal
        visible={showConflicts && conflicts.length > 0}
        conflicts={conflicts}
        selections={conflictSelections}
        isResolving={isResolvingConflicts}
        onToggleField={toggleConflictField}
        onSelectAll={selectAllConflicts}
        onDeselectAll={deselectAllConflicts}
        onApply={handleApplyConflicts}
        onClose={() => setShowConflicts(false)}
      />

      {conflictResult && (
        <View style={[styles.conflictResultBox, { backgroundColor: theme.successBg, borderColor: theme.success }]}>
          <Text style={[styles.conflictResultText, { color: theme.success }]}>
            ✓ {conflictResult.applied} livre(s) complété(s)
            {conflictResult.skipped > 0 ? `, ${conflictResult.skipped} ignoré(s)` : ''}
          </Text>
        </View>
      )}

      {!showConflicts && conflicts.length > 0 && !conflictResult && (
        <TouchableOpacity
          style={[styles.conflictReopenButton, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}
          onPress={() => setShowConflicts(true)}
        >
          <MaterialIcons name="warning" size={18} color={theme.warning} />
          <Text style={[styles.conflictReopenText, { color: theme.warning }]}>
            {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} en attente — Gérer
          </Text>
          <MaterialIcons name="chevron-right" size={18} color={theme.warning} />
        </TouchableOpacity>
      )}

      {importResult && (
        <View style={[styles.result, { backgroundColor: theme.bgMuted }]}>
          <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
            {importResult.cancelled
              ? '🛑 Import annulé'
              : importResult.failed === 0
                ? '✅ Import réussi'
                : '⚠️ Import partiel'}
          </Text>
          <Text style={[styles.resultText, { color: theme.success }]}>
            ✓ {importResult.success} livre(s) importé(s)
          </Text>
          {importResult.auto_completed > 0 && (
            <Text style={[styles.resultText, { color: theme.accent }]}>
              🖼 {importResult.auto_completed} couverture(s) ajoutée(s) automatiquement
            </Text>
          )}
          {importResult.skipped > 0 && (
            <Text style={[styles.resultText, { color: theme.textSecondary }]}>
              ↩ {importResult.skipped} déjà dans la bibliothèque (ignoré(s))
            </Text>
          )}
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
    maxHeight: 320,
  },
  previewCard: {
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 240,
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
  controlButtons: {
    flexDirection: 'row',
    gap: 10 as any,
    marginTop: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 6 as any,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  instructionRow: {
    flexDirection: 'row',
    marginBottom: 4,
    marginLeft: 8,
  },
  instructionLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  instructionValues: {
    fontSize: 13,
    flex: 1,
  },
  instructionNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  columnBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 as any,
    marginTop: 8,
  },
  columnBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  columnBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  conflictReopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as any,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
  },
  conflictReopenText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  conflictResultBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  conflictResultText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
