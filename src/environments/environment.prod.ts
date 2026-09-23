// 本番ビルド用の設定。デプロイ先のAPIサーバーが確定したら、ここを1箇所書き換えるだけで
// front側の全リクエスト先(GraphQL/REST/アバター画像)が切り替わる。
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080'
};
