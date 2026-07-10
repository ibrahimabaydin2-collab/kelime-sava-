import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kelimesavasi.app',
  appName: 'Kelime Savaşı',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
