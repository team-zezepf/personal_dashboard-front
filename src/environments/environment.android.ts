// Android版アプリ(Capacitor・オフライン)用の設定。configuration: android のときに
// fileReplacements(angular.json)で environment.ts と差し替えられる。
// API へは通信せず、OfflineBackendService が端末内でデータを読み書きする。
export const environment = {
  production: true,
  apiBaseUrl: '',
  offline: true
};
