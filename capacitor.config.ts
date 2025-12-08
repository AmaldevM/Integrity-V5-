import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tertius.integrity',
  appName: 'Tertius Integrity AI',
  webDir: 'dist',
  server: {
    // This connects the phone to your laptop wirelessly
    url: 'http://192.168.1.111:5173',
    cleartext: true
  }
};

export default config;