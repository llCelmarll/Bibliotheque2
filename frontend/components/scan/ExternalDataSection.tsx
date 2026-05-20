// components/scan/ExternalDataSection.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { entityService } from '@/services/entityService';
import { Author, Publisher, Genre } from '@/types/entityTypes';
import { useTheme } from '@/contexts/ThemeContext';

interface ExternalDataSectionProps {
	googleData?: any;
	openLibraryData?: any;
	googleError?: string;
	openLibraryError?: string;
	onImportData: (source: 'google' | 'openLibrary', selectedData: any) => void;
	baseBook?: any;
}

type FieldStatus = 'new' | 'different' | 'identical';

const SORT_ORDER: Record<FieldStatus, number> = { new: 0, different: 1, identical: 2 };

export const ExternalDataSection: React.FC<ExternalDataSectionProps> = ({
	googleData,
	openLibraryData,
	googleError,
	openLibraryError,
	onImportData,
	baseBook,
}) => {
	const theme = useTheme();
	const { width } = useWindowDimensions();
	const twoColumns = width >= 600;

	const [activeTab, setActiveTab] = useState<'google' | 'openLibrary'>('google');
	const emptySelection = {
		title: false,
		subtitle: false,
		authors: false,
		publisher: false,
		publishedDate: false,
		pageCount: false,
		categories: false,
		thumbnail: false,
	};

	const [selectedData, setSelectedData] = useState<Record<'google' | 'openLibrary', Record<string, boolean>>>({
		google: { ...emptySelection },
		openLibrary: { ...emptySelection },
	});

	const [enrichedEntities, setEnrichedEntities] = useState<Record<'google' | 'openLibrary', {
		authors: Author[];
		publisher: Publisher | null;
		genres: Genre[];
	}>>({
		google: { authors: [], publisher: null, genres: [] },
		openLibrary: { authors: [], publisher: null, genres: [] },
	});
	const [isEnriching, setIsEnriching] = useState(false);

	const enrichedAuthors = enrichedEntities[activeTab].authors;
	const enrichedPublisher = enrichedEntities[activeTab].publisher;
	const enrichedGenres = enrichedEntities[activeTab].genres;

	const extractBookInfo = (data: any, source: 'google' | 'openLibrary') => {
		if (!data) return null;
		if (source === 'google') {
			return {
				exploitable: {
					title: data.title,
					subtitle: data.subtitle,
					authors: data.authors || [],
					publisher: data.publisher,
					publishedDate: data.publishedDate,
					pageCount: data.pageCount,
					isbn: data.industryIdentifiers?.find((id: any) =>
						id.type === 'ISBN_13' || id.type === 'ISBN_10'
					)?.identifier,
					thumbnail: data.imageLinks?.thumbnail,
					categories: data.categories || [],
				},
			};
		} else {
			return {
				exploitable: {
					title: data.title,
					authors: data.authors?.map((a: any) => a.name).filter(Boolean) || [],
					publisher: data.publishers?.[0],
					publishedDate: data.publish_date,
					pageCount: data.number_of_pages,
					isbn: data.isbn_13?.[0] || data.isbn_10?.[0],
					thumbnail: data.covers?.[0] ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg` : null,
					categories: data.subjects || [],
				},
			};
		}
	};

	useEffect(() => {
		const currentData = activeTab === 'google' ? googleData : openLibraryData;
		if (currentData) {
			const bookInfo = extractBookInfo(currentData, activeTab);
			if (bookInfo) enrichEntities(bookInfo.exploitable, activeTab);
		} else {
			setEnrichedEntities(prev => ({
				...prev,
				[activeTab]: { authors: [], publisher: null, genres: [] },
			}));
		}
	}, [activeTab, googleData, openLibraryData]);

	// Pas de reset au changement d'onglet — la sélection est maintenue par source

	const enrichEntities = async (bookInfo: any, source: 'google' | 'openLibrary') => {
		if (!bookInfo || isEnriching) return;
		setIsEnriching(true);
		try {
			const result: { authors: Author[]; publisher: Publisher | null; genres: Genre[] } = {
				authors: [], publisher: null, genres: [],
			};
			if (bookInfo.authors && Array.isArray(bookInfo.authors)) {
				for (const name of bookInfo.authors) {
					if (typeof name === 'string' && name.trim()) {
						const existing = await entityService.searchAuthors(name, 1);
						const match = existing.find(a => a.name.toLowerCase() === name.toLowerCase());
						result.authors.push(match ? { id: match.id, name: match.name, exists: true } : { id: null, name: name.trim(), exists: false });
					}
				}
			}
			if (bookInfo.publisher && typeof bookInfo.publisher === 'string') {
				const existing = await entityService.searchPublishers(bookInfo.publisher, 1);
				const match = existing.find(p => p.name.toLowerCase() === bookInfo.publisher.toLowerCase());
				result.publisher = match
					? { id: match.id, name: match.name, exists: true }
					: { id: null, name: bookInfo.publisher.trim(), exists: false };
			}
			if (bookInfo.categories && Array.isArray(bookInfo.categories)) {
				for (const name of bookInfo.categories.slice(0, 5)) {
					if (typeof name === 'string' && name.trim()) {
						const existing = await entityService.searchGenres(name, 1);
						const match = existing.find(g => g.name.toLowerCase() === name.toLowerCase());
						result.genres.push(match ? { id: match.id, name: match.name, exists: true } : { id: null, name: name.trim(), exists: false });
					}
				}
			}
			setEnrichedEntities(prev => ({ ...prev, [source]: result }));
		} catch (e) {
			console.error('Erreur enrichissement entités:', e);
		} finally {
			setIsEnriching(false);
		}
	};

	// ─── Comparaison base vs en ligne ──────────────────────────────────────────

	const getBaseValue = (field: string): any => {
		if (!baseBook) return undefined;
		switch (field) {
			case 'title': return baseBook.title;
			case 'subtitle': return baseBook.subtitle;
			case 'isbn': return baseBook.isbn;
			case 'pageCount': return baseBook.page_count;
			case 'publishedDate': return baseBook.published_date;
			case 'authors': return baseBook.authors?.map((a: any) => a.name) ?? [];
			case 'publisher': return baseBook.publisher?.name ?? null;
			case 'categories': return baseBook.genres?.map((g: any) => g.name) ?? [];
			case 'thumbnail': return baseBook.cover_url;
			default: return undefined;
		}
	};

	const normalizeStr = (v: any): string =>
		v == null ? '' : String(v).trim().toLowerCase();

	const MONTHS_EN: Record<string, string> = {
		january: 'janvier', february: 'février', march: 'mars', april: 'avril',
		may: 'mai', june: 'juin', july: 'juillet', august: 'août',
		september: 'septembre', october: 'octobre', november: 'novembre', december: 'décembre',
	};

	const translateDate = (v: any): string => {
		if (!v) return '';
		const s = String(v).trim();
		// ISO YYYY-MM-DD → DD/MM/YYYY
		const isoFull = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (isoFull) return `${isoFull[3]}/${isoFull[2]}/${isoFull[1]}`;
		// ISO YYYY-MM → MM/YYYY
		const isoMonth = s.match(/^(\d{4})-(\d{2})$/);
		if (isoMonth) return `${isoMonth[2]}/${isoMonth[1]}`;
		// ISO YYYY seul → laisser tel quel
		if (s.match(/^\d{4}$/)) return s;
		// Texte anglais "March 2000", "January 1, 1995" → traduire les mois
		let result = s;
		Object.entries(MONTHS_EN).forEach(([en, fr]) => {
			result = result.replace(new RegExp(en, 'i'), fr);
		});
		return result;
	};

	const extractYear = (v: any): string => {
		if (!v) return '';
		const s = String(v).trim();
		// ISO : 2013-03-20 ou 2013
		const isoMatch = s.match(/^(\d{4})/);
		if (isoMatch) return isoMatch[1];
		// DD/MM/YYYY ou DD-MM-YYYY
		const dmyMatch = s.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-](\d{4})/);
		if (dmyMatch) return dmyMatch[1];
		// "March 2000", "January 1, 1995", etc.
		const yearAnywhere = s.match(/(\d{4})/);
		if (yearAnywhere) return yearAnywhere[1];
		return '';
	};

	const getFieldStatus = (field: string, onlineVal: any): FieldStatus => {
		const baseVal = getBaseValue(field);

		// Valeur absente en base
		const isEmpty = (v: any) =>
			v == null || v === '' || (Array.isArray(v) && v.length === 0) || (field === 'pageCount' && v === 0);

		if (isEmpty(baseVal)) return 'new';

		// Comparaison spécifique par type de champ
		if (field === 'authors') {
			const onlineNames: string[] = Array.isArray(onlineVal)
				? onlineVal.map((n: any) => normalizeStr(typeof n === 'string' ? n : n?.name))
				: [];
			const baseNames: string[] = (baseVal as string[]).map(normalizeStr);
			const sortedOnline = [...onlineNames].sort().join('|');
			const sortedBase = [...baseNames].sort().join('|');
			return sortedOnline === sortedBase ? 'identical' : 'different';
		}

		if (field === 'categories') {
			const onlineNames: string[] = Array.isArray(onlineVal)
				? onlineVal.map((n: any) => normalizeStr(n))
				: [];
			const baseNames: string[] = (baseVal as string[]).map(normalizeStr);
			const sortedOnline = [...onlineNames].sort().join('|');
			const sortedBase = [...baseNames].sort().join('|');
			return sortedOnline === sortedBase ? 'identical' : 'different';
		}

		if (field === 'publishedDate') {
			const onlineYear = extractYear(onlineVal);
			const baseYear = extractYear(baseVal);
			if (!onlineYear || !baseYear) return 'different';
			return onlineYear === baseYear ? 'identical' : 'different';
		}

		if (field === 'thumbnail') {
			// Couverture : on considère toujours comme "nouveau" si en ligne il y en a une
			// car l'URL sera différente
			return baseVal ? 'different' : 'new';
		}

		return normalizeStr(onlineVal) === normalizeStr(baseVal) ? 'identical' : 'different';
	};

	// ─── Sélection ─────────────────────────────────────────────────────────────

	const currentSelection = selectedData[activeTab];
	const totalSelected = () => {
		const keys = new Set([...Object.keys(selectedData.google), ...Object.keys(selectedData.openLibrary)]);
		let count = 0;
		keys.forEach(k => { if (selectedData.google[k] || selectedData.openLibrary[k]) count++; });
		return count;
	};
	const hasSelectedData = () => totalSelected() > 0;
	const getSelectedCount = () => totalSelected();

	const toggleSelection = (key: string) => {
		setSelectedData(prev => {
			const otherTab = activeTab === 'google' ? 'openLibrary' : 'google';
			const nowSelected = !prev[activeTab][key];
			return {
				...prev,
				[activeTab]: { ...prev[activeTab], [key]: nowSelected },
				// Si on sélectionne ce champ, le désélectionner dans l'autre source
				...(nowSelected && { [otherTab]: { ...prev[otherTab], [key]: false } }),
			};
		});
	};

	const handleImport = (currentBookInfo: any, source: 'google' | 'openLibrary') => {
		const otherSource = source === 'google' ? 'openLibrary' : 'google';
		const otherBookInfo = otherSource === 'google'
			? extractBookInfo(googleData, 'google')?.exploitable
			: extractBookInfo(openLibraryData, 'openLibrary')?.exploitable;

		const selectedBookData: any = {};

		// Parcourir tous les champs des deux sources
		const allKeys = new Set([
			...Object.keys(selectedData[source]),
			...Object.keys(selectedData[otherSource]),
		]);

		allKeys.forEach(key => {
			// Déterminer depuis quelle source ce champ est sélectionné (mutex garantit au plus une)
			const fromCurrent = selectedData[source][key];
			const fromOther = selectedData[otherSource][key];
			if (!fromCurrent && !fromOther) return;

			const bookInfo = fromCurrent ? currentBookInfo : otherBookInfo;
			const srcKey = fromCurrent ? source : otherSource;
			const entities = enrichedEntities[srcKey];

			if (!bookInfo) return;

			switch (key) {
				case 'authors':
					selectedBookData[key] = entities.authors.length > 0
						? entities.authors
						: bookInfo.authors?.map((n: string) => ({ id: null, name: n, exists: false }));
					break;
				case 'publisher':
					selectedBookData[key] = entities.publisher
						?? (bookInfo.publisher ? { id: null, name: bookInfo.publisher, exists: false } : undefined);
					break;
				case 'categories':
					selectedBookData['genres'] = entities.genres.length > 0
						? entities.genres
						: bookInfo.categories?.map((n: string) => ({ id: null, name: n, exists: false }));
					break;
				default:
					if (bookInfo[key] !== undefined && bookInfo[key] !== null)
						selectedBookData[key] = bookInfo[key];
			}
		});

		onImportData(source, selectedBookData);
	};

	// ─── Rendu des entités ─────────────────────────────────────────────────────

	const renderEntityChips = (entities: Array<{ id: any; name: string; exists: boolean }>) => (
		<View style={styles.entitiesContainer}>
			{entities.map(e => (
				<View
					key={`${e.id ?? ''}-${e.name}`}
					style={[styles.entityChip, {
						backgroundColor: e.exists ? theme.successBg : theme.warningBg,
						borderColor: e.exists ? theme.success : theme.warning,
					}]}
				>
					<MaterialIcons
						name={e.exists ? 'check-circle' : 'add-circle'}
						size={12}
						color={e.exists ? theme.success : theme.warning}
					/>
					<Text style={[styles.entityChipText, { color: theme.textPrimary }]}>{e.name}</Text>
				</View>
			))}
		</View>
	);

	// ─── Formatage des valeurs pour affichage ──────────────────────────────────

	const formatBaseValue = (field: string): React.ReactNode => {
		const val = getBaseValue(field);
		if (!baseBook) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;

		if (field === 'authors') {
			const names: string[] = val ?? [];
			if (names.length === 0) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return (
				<View style={styles.entitiesContainer}>
					{names.map(n => (
						<View key={n} style={[styles.entityChip, { backgroundColor: theme.bgSecondary, borderColor: theme.borderMedium }]}>
							<Text style={[styles.entityChipText, { color: theme.textPrimary }]}>{n}</Text>
						</View>
					))}
				</View>
			);
		}
		if (field === 'categories') {
			const names: string[] = val ?? [];
			if (names.length === 0) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return (
				<View style={styles.entitiesContainer}>
					{names.map(n => (
						<View key={n} style={[styles.entityChip, { backgroundColor: theme.bgSecondary, borderColor: theme.borderMedium }]}>
							<Text style={[styles.entityChipText, { color: theme.textPrimary }]}>{n}</Text>
						</View>
					))}
				</View>
			);
		}
		if (field === 'thumbnail') {
			if (!val) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			const uri = val.startsWith('/') ? undefined : val;
			if (!uri) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>Couverture locale</Text>;
			return <Image source={{ uri }} style={styles.thumbnailInline} resizeMode="contain" />;
		}
		if (field === 'publishedDate') {
			if (!val) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return <Text style={[styles.valueText, { color: theme.textPrimary }]}>{String(val)}</Text>;
		}
		if (!val && val !== 0 || (field === 'pageCount' && val === 0)) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
		return <Text style={[styles.valueText, { color: theme.textPrimary }]}>{String(val)}</Text>;
	};

	const formatOnlineValue = (field: string, onlineVal: any, enriched?: { authors?: Author[]; publisher?: Publisher | null; genres?: Genre[] }): React.ReactNode => {
		if (field === 'authors') {
			const list = enriched?.authors ?? [];
			if (list.length === 0) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return renderEntityChips(list);
		}
		if (field === 'publisher') {
			const p = enriched?.publisher;
			if (!p) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return renderEntityChips([p]);
		}
		if (field === 'categories') {
			const list = enriched?.genres ?? [];
			if (list.length === 0) {
				if (!onlineVal || onlineVal.length === 0) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
				return (
					<View style={styles.entitiesContainer}>
						{(onlineVal as string[]).slice(0, 3).map((n: string) => (
							<View key={n} style={[styles.entityChip, { backgroundColor: theme.bgSecondary, borderColor: theme.borderMedium }]}>
								<Text style={[styles.entityChipText, { color: theme.textPrimary }]}>{n}</Text>
							</View>
						))}
					</View>
				);
			}
			return renderEntityChips(list);
		}
		if (field === 'thumbnail') {
			if (!onlineVal) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return <Image source={{ uri: onlineVal }} style={styles.thumbnailInline} resizeMode="contain" />;
		}
		if (field === 'publishedDate') {
			if (!onlineVal) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
			return <Text style={[styles.valueText, { color: theme.textPrimary }]}>{translateDate(onlineVal)}</Text>;
		}
		if (!onlineVal && onlineVal !== 0) return <Text style={[styles.valueText, { color: theme.textMuted, fontStyle: 'italic' }]}>—</Text>;
		if (Array.isArray(onlineVal)) {
			return <Text style={[styles.valueText, { color: theme.textPrimary }]}>{onlineVal.join(', ')}</Text>;
		}
		return <Text style={[styles.valueText, { color: theme.textPrimary }]}>{String(onlineVal)}</Text>;
	};

	// ─── Carte de comparaison ──────────────────────────────────────────────────

	const renderComparisonCard = (
		key: string,
		label: string,
		onlineVal: any,
		isSelected: boolean,
		enriched?: { authors?: Author[]; publisher?: Publisher | null; genres?: Genre[] },
	) => {
		// Vérifier la valeur en ligne selon le type de champ
		const effectiveOnlineEmpty = (() => {
			if (isEnriching) {
				// Pendant l'enrichissement, se baser sur les valeurs brutes
				return onlineVal == null || onlineVal === '' || (Array.isArray(onlineVal) && onlineVal.length === 0);
			}
			if (key === 'authors') return (enriched?.authors?.length ?? 0) === 0 && (Array.isArray(onlineVal) && onlineVal.length === 0);
			if (key === 'publisher') return !enriched?.publisher && !onlineVal;
			if (key === 'categories') return (enriched?.genres?.length ?? 0) === 0 && (Array.isArray(onlineVal) && onlineVal.length === 0);
			return onlineVal == null || onlineVal === '' || (Array.isArray(onlineVal) && onlineVal.length === 0) || (key === 'pageCount' && onlineVal === 0);
		})();
		if (effectiveOnlineEmpty) return null;

		const status = baseBook ? getFieldStatus(key, onlineVal) : 'new';
		const isIdentical = status === 'identical';
		const canSelect = !isIdentical;

		const borderColor = isIdentical ? theme.borderLight : status === 'new' ? theme.success : theme.warning;
		const statusIcon = isIdentical ? 'check-circle' : status === 'new' ? 'add-circle' : 'swap-horiz';
		const statusColor = isIdentical ? theme.textMuted : status === 'new' ? theme.success : theme.warning;

		const cardStyle = [
			styles.card,
			{ borderLeftColor: borderColor, backgroundColor: theme.bgCard },
			isIdentical && { opacity: 0.6 },
			isSelected && { backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1.5 },
		];

		return (
			<TouchableOpacity
				key={key}
				style={cardStyle}
				onPress={() => canSelect && toggleSelection(key)}
				activeOpacity={canSelect ? 0.7 : 1}
			>
				{/* Header */}
				<View style={styles.cardHeader}>
					<MaterialIcons name={statusIcon as any} size={16} color={statusColor} />
					<Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
					{isEnriching && (key === 'authors' || key === 'publisher' || key === 'categories') ? (
						<MaterialIcons name="hourglass-empty" size={20} color={theme.warning} style={styles.checkbox} />
					) : (
						<MaterialIcons
							name={isIdentical ? 'remove' : isSelected ? 'check-box' : 'check-box-outline-blank'}
							size={20}
							color={isIdentical ? theme.textMuted : isSelected ? theme.success : theme.borderMedium}
							style={styles.checkbox}
						/>
					)}
				</View>

				{/* Colonnes */}
				<View style={[styles.columns, twoColumns ? styles.columnsRow : styles.columnsStack]}>
					{/* Colonne Base */}
					<View style={[styles.column, twoColumns && styles.columnHalf, { borderColor: theme.borderLight }]}>
						<View style={[styles.columnBadge, { backgroundColor: theme.bgSecondary }]}>
							<Text style={[styles.columnBadgeText, { color: theme.textMuted }]}>Actuel</Text>
						</View>
						{formatBaseValue(key)}
					</View>

					{/* Colonne En ligne */}
					<View style={[styles.column, twoColumns && styles.columnHalf, { borderColor: theme.accent + '44' }]}>
						<View style={[styles.columnBadge, { backgroundColor: theme.accentLight }]}>
							<Text style={[styles.columnBadgeText, { color: theme.accent }]}>En ligne</Text>
						</View>
						{formatOnlineValue(key, onlineVal, enriched)}
					</View>
				</View>

				{isIdentical && (
					<Text style={[styles.identicalLabel, { color: theme.textMuted }]}>Identique — aucune modification nécessaire</Text>
				)}
			</TouchableOpacity>
		);
	};

	// ─── Section exploitable ───────────────────────────────────────────────────

	const renderExploitableData = (bookInfo: any) => {
		if (!bookInfo) return null;

		const fields: Array<{ key: string; label: string; val: any; enriched?: any }> = [
			{ key: 'thumbnail', label: 'Couverture', val: bookInfo.thumbnail },
			{ key: 'title', label: 'Titre', val: bookInfo.title },
			{ key: 'subtitle', label: 'Sous-titre', val: bookInfo.subtitle },
			{ key: 'authors', label: 'Auteur(s)', val: bookInfo.authors, enriched: { authors: enrichedAuthors } },
			{ key: 'publisher', label: 'Éditeur', val: bookInfo.publisher, enriched: { publisher: enrichedPublisher } },
			{ key: 'publishedDate', label: 'Année de publication', val: bookInfo.publishedDate },
			{ key: 'pageCount', label: 'Nombre de pages', val: bookInfo.pageCount },
				{ key: 'categories', label: 'Genres', val: bookInfo.categories?.slice(0, 5), enriched: { genres: enrichedGenres } },
		];

		// Tri : new → different → identical
		const sorted = [...fields].sort((a, b) => {
			const sA = baseBook ? SORT_ORDER[getFieldStatus(a.key, a.val)] : 0;
			const sB = baseBook ? SORT_ORDER[getFieldStatus(b.key, b.val)] : 0;
			return sA - sB;
		});

		const selectableKeys = fields
			.filter(f => f.val != null && f.val !== '' && !(Array.isArray(f.val) && f.val.length === 0))
			.filter(f => !baseBook || getFieldStatus(f.key, f.val) !== 'identical')
			.map(f => f.key);

		const allSelected = selectableKeys.every(k => selectedData[k]);

		return (
			<View style={[styles.section, { borderColor: theme.borderLight, backgroundColor: theme.bgSecondary }]}>
				{baseBook && (
					<View style={[styles.legend, { borderBottomColor: theme.borderLight }]}>
						<View style={styles.legendItem}>
							<MaterialIcons name="add-circle" size={14} color={theme.success} />
							<Text style={[styles.legendText, { color: theme.textMuted }]}>Nouveau</Text>
						</View>
						<View style={styles.legendItem}>
							<MaterialIcons name="swap-horiz" size={14} color={theme.warning} />
							<Text style={[styles.legendText, { color: theme.textMuted }]}>Différent</Text>
						</View>
						<View style={styles.legendItem}>
							<MaterialIcons name="check-circle" size={14} color={theme.textMuted} />
							<Text style={[styles.legendText, { color: theme.textMuted }]}>Identique</Text>
						</View>
					</View>
				)}

				<View style={styles.cardsContainer}>
					{sorted.map(f =>
						renderComparisonCard(f.key, f.label, f.val, currentSelection[f.key], f.enriched)
					)}
				</View>

				{/* Liens de sélection rapide */}
				<View style={styles.selectionLinks}>
					<TouchableOpacity
						onPress={() => {
							const otherTab = activeTab === 'google' ? 'openLibrary' : 'google';
							setSelectedData(prev => {
								const next = { ...prev[activeTab] };
								const otherNext = { ...prev[otherTab] };
								selectableKeys.forEach(k => { next[k] = true; otherNext[k] = false; });
								return { ...prev, [activeTab]: next, [otherTab]: otherNext };
							});
						}}
					>
						<Text style={[styles.selectionLinkText, { color: theme.accent }]}>Tout sélectionner</Text>
					</TouchableOpacity>
					<Text style={[styles.selectionLinkSep, { color: theme.borderMedium }]}>·</Text>
					<TouchableOpacity
						onPress={() => setSelectedData(prev => ({ ...prev, [activeTab]: { ...emptySelection } }))}
					>
						<Text style={[styles.selectionLinkText, { color: theme.textMuted }]}>Tout désélectionner</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	// ─── Rendu principal ───────────────────────────────────────────────────────

	const renderBookInfo = (data: any, source: 'google' | 'openLibrary') => {
		const hasError = source === 'google' ? googleError : openLibraryError;
		const sourceName = source === 'google' ? 'Google Books' : 'OpenLibrary';
		if (!data) {
			if (hasError) return null;
			return (
				<View style={styles.noDataContainer}>
					<Text style={[styles.noDataText, { color: theme.textMuted }]}>Livre non trouvé sur {sourceName}</Text>
				</View>
			);
		}
		const bookInfo = extractBookInfo(data, source);
		if (!bookInfo) return null;

		return (
			<View>
				{renderExploitableData(bookInfo.exploitable)}

				<TouchableOpacity
					style={[
						styles.importButton,
						{ backgroundColor: hasSelectedData() ? theme.success : theme.borderMedium },
					]}
					onPress={() => handleImport(bookInfo.exploitable, source)}
					disabled={!hasSelectedData()}
				>
					<MaterialIcons name="download" size={18} color={theme.textInverse} />
					<Text style={[styles.importButtonText, { color: theme.textInverse }]}>
						Appliquer les données sélectionnées ({getSelectedCount()})
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const hasGoogleData = !!googleData;
	const hasOpenLibraryData = !!openLibraryData;

	if (!hasGoogleData && !hasOpenLibraryData && !googleError && !openLibraryError) {
		return (
			<View style={styles.noDataContainer}>
				<Text style={[styles.noDataText, { color: theme.textMuted }]}>Aucune donnée externe disponible</Text>
			</View>
		);
	}

	const renderErrorBanner = (error: string) => (
		<View style={[styles.errorBanner, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
			<MaterialIcons name="warning" size={20} color={theme.warning} />
			<Text style={[styles.errorBannerText, { color: theme.warning }]}>{error}</Text>
		</View>
	);

	return (
		<View style={[styles.container, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
			<Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Données externes</Text>

			{googleError && renderErrorBanner(googleError)}
			{openLibraryError && renderErrorBanner(openLibraryError)}

			{(hasGoogleData || hasOpenLibraryData) && (
				<>
					<View style={[styles.tabContainer, { backgroundColor: theme.bgMuted }]}>
						{hasGoogleData && (
							<TouchableOpacity
								style={[styles.tab, activeTab === 'google' && { backgroundColor: theme.accent }]}
								onPress={() => setActiveTab('google')}
							>
								<Text style={[styles.tabText, { color: theme.textMuted }, activeTab === 'google' && { color: theme.textInverse }]}>
									Google Books
								</Text>
							</TouchableOpacity>
						)}
						{hasOpenLibraryData && (
							<TouchableOpacity
								style={[styles.tab, activeTab === 'openLibrary' && { backgroundColor: theme.accent }]}
								onPress={() => setActiveTab('openLibrary')}
							>
								<Text style={[styles.tabText, { color: theme.textMuted }, activeTab === 'openLibrary' && { color: theme.textInverse }]}>
									OpenLibrary
								</Text>
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.contentContainer}>
						{activeTab === 'google' && renderBookInfo(googleData, 'google')}
						{activeTab === 'openLibrary' && renderBookInfo(openLibraryData, 'openLibrary')}
					</View>
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		borderRadius: 12,
		margin: 16,
		borderWidth: 1,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 16,
		textAlign: 'center',
	},
	tabContainer: {
		flexDirection: 'row',
		borderRadius: 8,
		padding: 4,
		marginBottom: 16,
	},
	tab: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		alignItems: 'center',
	},
	tabText: {
		fontSize: 14,
		fontWeight: '500',
	},
	contentContainer: {},
	errorBanner: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
	},
	errorBannerText: {
		fontSize: 14,
		fontWeight: '500',
		marginLeft: 8,
		flex: 1,
	},
	noDataContainer: {
		padding: 20,
		alignItems: 'center',
	},
	noDataText: {
		fontSize: 16,
		textAlign: 'center',
		fontStyle: 'italic',
	},
	section: {
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 12,
		overflow: 'hidden',
	},
	legend: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 16 as any,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4 as any,
	},
	legendText: {
		fontSize: 11,
	},
	cardsContainer: {
		padding: 10,
		gap: 10 as any,
	},
	card: {
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 4,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 6 as any,
	},
	cardLabel: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		flex: 1,
		letterSpacing: 0.5,
	},
	checkbox: {
		marginLeft: 'auto' as any,
	},
	columns: {
		gap: 8 as any,
	},
	columnsRow: {
		flexDirection: 'row',
	},
	columnsStack: {
		flexDirection: 'column',
	},
	column: {
		borderRadius: 6,
		borderWidth: 1,
		overflow: 'hidden',
	},
	columnHalf: {
		flex: 1,
	},
	columnBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	columnBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	valueText: {
		fontSize: 13,
		lineHeight: 18,
		paddingHorizontal: 8,
		paddingVertical: 6,
	},
	identicalLabel: {
		fontSize: 11,
		fontStyle: 'italic',
		textAlign: 'center',
		marginTop: 6,
	},
	thumbnailInline: {
		width: 60,
		height: 90,
		borderRadius: 4,
		margin: 8,
		alignSelf: 'center',
	},
	entitiesContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4 as any,
		paddingHorizontal: 8,
		paddingVertical: 6,
	},
	entityChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: 10,
		borderWidth: 1,
		gap: 3 as any,
	},
	entityChipText: {
		fontSize: 11,
		fontWeight: '500',
	},
	selectionLinks: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8 as any,
		paddingVertical: 10,
		paddingHorizontal: 12,
	},
	selectionLinkText: {
		fontSize: 12,
		textDecorationLine: 'underline',
	},
	selectionLinkSep: {
		fontSize: 14,
	},
	importButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8 as any,
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 10,
		marginBottom: 4,
	},
	importButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
});
