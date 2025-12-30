# Système d'hébergement APK

## Problème résolu

Avant, l'APK était hébergé sur Expo et le lien expirait après ~30 jours, rendant le téléchargement impossible sans rebuilder l'APK.

## Solution

L'APK est maintenant **téléchargé et hébergé directement** sur le serveur Synology, ce qui permet :
- ✅ Un lien permanent qui ne expire jamais
- ✅ Pas besoin de rebuilder l'APK tous les mois
- ✅ Téléchargements plus rapides (pas de redirection)

## Architecture

```
┌─────────────┐
│   Expo EAS  │ ← Build de l'APK
└──────┬──────┘
       │
       │ (1) Téléchargement unique
       ▼
┌─────────────┐
│ update-apk  │ ← Script PowerShell
│   .ps1      │
└──────┬──────┘
       │
       │ (2) Upload SSH/SCP
       ▼
┌─────────────┐
│  Synology   │ ← Stockage permanent
│  NAS        │   /volume1/docker/mabibliotheque/apk/
└──────┬──────┘
       │
       │ (3) Volume Docker monté
       ▼
┌─────────────┐
│   Nginx     │ ← Serveur web
│  Container  │   /app/apk/ (lecture seule)
└─────────────┘
       │
       │ (4) HTTPS
       ▼
┌─────────────┐
│ Utilisateur │ ← Téléchargement
└─────────────┘
```

## Utilisation

### Mise à jour manuelle de l'APK

Pour mettre à jour l'APK après un nouveau build :

```powershell
.\scripts\deploy\update-apk.ps1
```

Le script va automatiquement :
1. Récupérer le dernier build APK depuis EAS
2. Télécharger l'APK localement
3. L'uploader sur le serveur via SCP
4. Nettoyer le fichier temporaire

### Avec une URL spécifique

```powershell
.\scripts\deploy\update-apk.ps1 -ApkUrl "https://expo.dev/artifacts/eas/xyz.apk"
```

### Déploiement complet

Le script `deploy-all.ps1` appelle automatiquement `update-apk.ps1` :

```powershell
.\scripts\deploy\deploy-all.ps1 -UpdateMessage "Votre message"
```

Pour sauter la mise à jour APK :

```powershell
.\scripts\deploy\deploy-all.ps1 -UpdateMessage "..." -SkipApk
```

## Configuration nginx

L'APK est servi directement par nginx (pas de redirection 302) :

```nginx
location = /bibliotheque.apk {
    alias /app/apk/bibliotheque.apk;
    add_header Content-Type "application/vnd.android.package-archive";
    add_header Content-Disposition "attachment; filename=bibliotheque.apk";
}
```

## Volume Docker

Le conteneur frontend monte le répertoire APK en lecture seule :

```bash
-v /volume1/docker/mabibliotheque/apk:/app/apk:ro
```

## Vérification

Pour vérifier que l'APK est accessible :

```bash
curl -I https://mabibliotheque.ovh/bibliotheque.apk
```

Vous devriez voir :
```
HTTP/2 200
content-type: application/vnd.android.package-archive
content-disposition: attachment; filename=bibliotheque.apk
```

## Maintenance

L'APK n'a besoin d'être mis à jour que lorsque vous buildez une nouvelle version native (changement de `runtimeVersion` dans `app.json`).

Les mises à jour OTA (JavaScript) n'affectent pas l'APK.
