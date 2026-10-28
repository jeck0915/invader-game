# Space Invaders

React（フロントエンド）+ Kotlin/Ktor（バックエンド：ハイスコアAPI）構成のインベーダーゲームです。

## 構成

- `frontend/` — React + TypeScript + Vite。Canvas でゲーム本体（移動・弾・敵・衝突判定・ウェーブ進行）を実装。
- `backend/` — Kotlin + Ktor。ハイスコアの保存・取得のみを担当する REST API（インメモリ、再起動で消えます）。

## 起動方法

### バックエンド（Kotlin/Ktor）

Java 17 以上が必要です（Gradle本体は不要、Gradle Wrapperを同梱済み）。

```powershell
cd backend
.\gradlew.bat run       # http://localhost:8080 で起動（Macの場合は ./gradlew run）
```

API:
- `GET /api/scores` — 上位10件のハイスコアを取得
- `POST /api/scores` — `{ "playerName": "AAA", "score": 1234 }` を送信して登録

### フロントエンド（React）

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

`vite.config.ts` で `/api` を `http://localhost:8080` にプロキシしているので、バックエンドを起動していればそのままハイスコア登録・表示が動きます。バックエンドを起動していなくてもゲーム自体はプレイ可能です（スコア送信のみ失敗します）。

## 操作方法

- `←` `→` または `A` `D`：移動
- `SPACE`：弾を発射

敵を全滅させると次のウェーブへ進み、敵の弾に当たるかライフが尽きると、または敵の編隊が自機の高さまで到達するとゲームオーバーです。

iPhoneなどタッチデバイスでは、画面下に移動・発射用のタッチボタンが自動的に表示されます。

## インターネット公開デプロイ（Render + Vercel）

PCを起動しておかなくても、どこからでもURLでアクセスできるようにする手順です。両方とも無料プランで可能です。

### 1. バックエンドを Render にデプロイ

1. このプロジェクトをGitHubリポジトリにpushしておく
2. [Render](https://render.com) にログインし、「New +」→「Web Service」
3. 対象リポジトリを選択し、Root Directory に `backend` を指定
4. Environment は **Docker** を選択（`backend/Dockerfile` を自動検出）
5. デプロイ完了後に発行されるURL（例: `https://invader-backend-xxxx.onrender.com`）をメモ

### 2. フロントエンドを Vercel にデプロイ

1. [Vercel](https://vercel.com) にログインし、「Add New...」→「Project」で同じリポジトリを選択
2. Root Directory に `frontend` を指定（Framework は Vite が自動検出されます）
3. 「Environment Variables」に以下を追加
   - `VITE_API_BASE_URL` = `https://invader-backend-xxxx.onrender.com`（手順1で発行されたURL）
4. Deploy を実行し、発行されたURL（例: `https://invader-game.vercel.app`）を開く

これでPCの電源や起動状態に関係なく、iPhoneやどの端末からでもそのURLにアクセスしてプレイ・ハイスコア登録ができます。

補足：Renderの無料プランは一定時間アクセスが無いとスリープし、次回アクセス時に起動まで数十秒かかることがあります。
