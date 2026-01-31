import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.eidola.app',
  appName: 'Eidola',
  webDir: 'dist',
  server: {
    // For development, uncomment to load from the web URL:
    // url: 'https://eidola.io',
    // cleartext: true,

    // For production, we bundle the built web app
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    // Allow inline media playback
    allowsLinkPreview: true,
    scrollEnabled: true,
    // Content inset adjustment for safe areas
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f8f6f3', // eidola-bg color
      androidSplashResourceName: 'splash',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light', // light text on dark background
      backgroundColor: '#ff8c42', // eidola-orange
    },
    Camera: {
      // iOS requires these permissions
    },
    Geolocation: {
      // iOS requires these permissions
    },
  },
};

export default config;
