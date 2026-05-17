# CSV de test — Import

| Fichier | Ce qu'il teste |
|---|---|
| `01_import_nominal.csv` | Import classique de 5 livres variés (avec/sans ISBN, séries, notes, statut lu) |
| `02_doublons_avec_isbn.csv` | À importer **après le 01** — mêmes livres avec ISBN → détectés comme doublons |
| `03_doublons_sans_isbn.csv` | À importer **après le 01** — "Le Petit Prince" sans ISBN en double → détecté (fix NULL!=NULL) |
| `04_conflits_champs_manquants.csv` | À importer **après le 01** — livres existants avec nouveaux champs (notes, couverture) → écran de résolution des conflits |
| `05_page_count_invalide.csv` | `pages=0`, `pages=beaucoup`, `pages=` vide → tous importés avec `page_count=null` |
| `06_couvertures_openlibrary.csv` | ISBNs réels → test de `get_openlibrary_cover_url()` (vérifie que l'image n'est pas un pixel 1×1) |

## Ordre recommandé

1. Importer `01` (bibliothèque de base)
2. Importer `02` → vérifier que les 2 livres sont détectés comme doublons (skipped ou conflicts)
3. Importer `03` → vérifier que "Le Petit Prince" sans ISBN est détecté en doublon
4. Importer `04` → vérifier que l'écran récapitulatif s'affiche avec les champs manquants cochés
5. Importer `05` seul → vérifier que les 4 livres passent sans erreur, `page_count` null pour les 3 premiers
6. Importer `06` avec **populate_covers activé** → vérifier que les couvertures sont récupérées (et qu'aucun pixel 1×1 n'est stocké)
