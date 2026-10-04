# ブランチ運用ルール

このリポジトリは [personal_dashboard-api](https://github.com/team-zezepf/personal_dashboard-api) と対になっており、両リポジトリで同じルールを採用しています。

## 基本方針

- 主軸ブランチは `main` のみ。`develop` や `release` ブランチは作らない（GitHub Flow）。
- `main` は常にビルド・デプロイ可能な状態を保つ。
- 作業は必ず作業ブランチを切り、`main` へは直接pushせずPR経由でマージする。

## ブランチの命名規則

```
<type>/<Issue番号>-<内容を短く英語 or ローマ字で>
```

- `type` は以下のいずれか
  - `feature` : 新機能
  - `fix` : バグ修正
  - `chore` : 設定・依存関係更新などの雑務
  - `docs` : ドキュメントのみの変更
- 例
  - `feature/10-login-page`
  - `fix/8-delete-schedule-error`
  - `chore/6-graphql-endpoint-config`

Issue番号を含めることで、PRの説明欄に `closes #10` と書いた際にマージ後Issueが自動でクローズされる。

`develop/v1.0.1` のようなバージョン番号入りの命名は使わない（過去に存在した古いブランチは整理済み）。

## PRのルール

- [pull_request_template.md](.github/pull_request_template.md) に沿って記載する。
- 「関連Issue・チケット」欄に `closes #番号` を必ず書く。
- api/frontの両リポジトリにまたがる変更の場合、PR本文にもう一方のリポジトリのPRリンクを貼り、対応関係を明示する。
- マージ前にCI（`.github/workflows/ci.yml`）が通っていることを確認する。

## マージ方法

- **Squash merge** に統一する。`main` の履歴が1機能・1修正ごとに追いやすくなる。
- マージ後は作業ブランチを削除する。

## 補足：ブランチ保護について

現在プライベートリポジトリ + GitHub Freeプランのため、GitHub上での必須レビュー・必須ステータスチェックといったブランチ保護ルールは設定できない（Pro化 or Public化が必要）。共同作業者が増える、またはプラン変更のタイミングで正式に有効化する。それまでは本ドキュメントのルールを運用ベースで守ること。
