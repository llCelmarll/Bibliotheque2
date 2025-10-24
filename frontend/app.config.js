module.exports = {
  expo: {
    name: "Bibliothèque", // Nom de l'application
    slug: "bibliotheque", // Identifiant unique pour Expo
    version: "1.0.0", // Version de l'application
    orientation: "portrait", // Orientation par défaut
    icon: "./assets/icon.png", // Icône de l'application (à ajouter)
    splash: {
      image: "./assets/splash.png", // Image de démarrage (à ajouter)
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*" // Pattern pour inclure tous les assets
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lcelmarl.bibliotheque.frontend"
    },
    android: {
      package: "com.lcelmarl.bibliotheque.frontend",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png", // Icône adaptative pour Android (à ajouter)
        backgroundColor: "#FFFFFF"
      },
      permissions: [
        "CAMERA"
      ]
    },
    web: {
      favicon: "./assets/favicon.png", // Favicon pour la version web (à ajouter)
      camera: {
        enableBarCode: true,
        enableQrCode: true,
        enableFrontCamera: true,
        enableBackCamera: true,

      }
    },
    plugins: [
      [
        "expo-camera",
        {
          "cameraPermissions": "Autorisez l'accès à la caméra pour scanner les livres",

        }
      ]
    ]
  }
};