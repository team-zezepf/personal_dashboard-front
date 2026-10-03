import type { CapacitorConfig } from '@capacitor/cli';

// Android版アプリ(オフライン・Dashboard と資格学習のみ / front#184)の設定。
// webDir は ng build --configuration android の出力先(angular.json の outputPath: dist/android)
const config: CapacitorConfig = {
  appId: 'com.zezepf.personaldashboard',
  appName: 'Personal Dashboard',
  webDir: 'dist/android/browser'
};

export default config;
