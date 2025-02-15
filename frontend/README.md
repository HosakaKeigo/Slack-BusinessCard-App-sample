# Slack-to-namecard
Slackにアップした名刺画像をJSON化し、FileMakerにレコードを作成する。

## 処理フロー
- 画像付きメッセージをリッスン
- LLMでJSON化
  - 名刺でない場合はエラー
- JSONからFileMakerでレコード作成

## スタック
- Cloudflare Workers
- Cloudflare KV
  - FileMakerの認証ストレージ
- Azure OpenAI Service
- FileMaker Data API

## 環境変数
`<secret>`はCloudflare Secretsとして使用。
```
SLACK_SIGNING_SECRET=<secret>
SLACK_BOT_TOKEN=<secret>

OPENAI_API_KEY=<secret>
AZURE_OPENAI_ENDPOINT=<secret>
AZURE_OPENAI_API_VERSION=<secret>
OPENAI_MODEL=

FM_DATABASE=
FM_SERVER=
FM_USERNAME=
FM_PASSWORD=<secret>
```

`filemakerConfig.ts`にもそれぞれの環境に合わせた値を設定する。