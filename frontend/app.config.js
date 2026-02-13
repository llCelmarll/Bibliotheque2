const { version } = require("react");

module.exports = {
  expo: {
    name: "Bibliothèque", // Nom de l'application
    slug: "bibliotheque", // Identifiant unique pour Expo
    version: "1.0.3", // Version de l'application
    orientation: "portrait", // Orientation par défaut
    icon: "./assets/icon.png", // Icône de l'application (à ajouter)
    splash: {
      image: "./assets/splash.png", // Image de démarrage (à ajouter)
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
      eas: {
        projectId: "b94a31f7-30e7-4781-8a4d-c32e75cb7e82"
      }
    },
    updates: {
      url: "https://u.expo.dev/b94a31f7-30e7-4781-8a4d-c32e75cb7e82",
      fallbackToCacheTimeout: 0
    },
    runtimeVersion: "stable",
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
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Autorisez l'accès à vos photos pour choisir une couverture de livre",
          "cameraPermission": "Autorisez l'accès à la caméra pour prendre une photo de couverture"
        }
      ],
      "expo-secure-store"
    ]
  }
};
