## Endpoints
### POST /createRecord
- 名刺情報を受け取り、FileMakerにレコードを作成

### POST /upload
- 画像をアップロードして、名刺情報JSONを返却

## Required Bindings
- Cloudflare KV
  - Set Id in `wrangler.toml`

## Required Secrets
### Azure
- AZURE_OPENAI_RESOURCE_NAME
- OPENAI_API_KEY

### Cloudflare
- CLOUDFLARE_AI_GATEWAY

### FileMaker
- FM_DATABASE
  - `<database name>.fmp12`
- FM_USERNAME
- FM_PASSWORD
- FM_SERVER
  - `https://<hostname>`
