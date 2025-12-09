import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tertius.integrity',
  appName: 'Tertius Integrity AI',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,      // 1. Don't wait 3 seconds
      launchAutoHide: false,      // 2. Let our React code hide it
      backgroundColor: "#020617", // 3. Match app color
      androidScaleType: "CENTER_CROP",
      showSpinner: false,         // 4. Hide the native spinner (optional)
    }
  }
};

export default config;