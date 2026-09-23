// 開発用(ng serve / development configuration)のデフォルト値。
// 本番ビルド(configuration: production)時はfileReplacements(angular.json)により
// environment.prod.tsに差し替えられる。
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080'
};
