# nosemami.com — note ミラーサイト

noteに投稿 → 自動でnosemami.comに反映されるサイトです。

## 構成

```
.
├── .github/
│   └── workflows/
│       └── update.yml   # 1時間ごとに自動実行
├── fetch-rss.js          # RSS取得 → HTML生成スクリプト
├── package.json
└── README.md
```

---

## セットアップ手順

### 1. GitHubにリポジトリを作る

1. https://github.com/new を開く
2. Repository name: `nosemami` （任意）
3. **Public** を選択
4. 「Create repository」をクリック

---

### 2. このファイルをアップロードする

ターミナルが使える場合:
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/nosemami.git
git push -u origin main
```

ターミナルが使えない場合:
- GitHubの画面で「uploading an existing file」からファイルをドラッグ&ドロップ

---

### 3. GitHub Pages を有効にする

1. リポジトリの「Settings」タブを開く
2. 左メニュー「Pages」をクリック
3. Source: **Deploy from a branch**
4. Branch: **gh-pages** / `/ (root)` を選択
5. 「Save」をクリック

---

### 4. GitHub Actionsを初回実行する

1. リポジトリの「Actions」タブを開く
2. 「Update from note RSS」ワークフローをクリック
3. 「Run workflow」→「Run workflow」をクリック

数分後、`gh-pages` ブランチにサイトが生成されます。

---

### 5. 独自ドメインを設定する

**GitHub側:**
1. Settings → Pages → Custom domain に `nosemami.com` を入力
2. 「Save」をクリック

**ドメイン側 (DNSレコード設定):**

| タイプ | ホスト | 値 |
|--------|--------|----|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | あなたのGitHubユーザー名.github.io |

DNSの反映に数時間〜24時間かかる場合があります。

---

## 自動更新について

- GitHub Actionsが**1時間ごと**にnoteのRSSを取得してサイトを再生成します
- noteに投稿してから最大1時間で反映されます
- 手動で今すぐ反映したい場合はActionsタブから「Run workflow」を実行してください

---

## カスタマイズ

`fetch-rss.js` の先頭部分で設定できます:

```js
const NOTE_RSS   = 'https://note.com/nocey/rss';  // noteのRSS URL
const SITE_TITLE = 'nocey';                         // サイト名
const SITE_URL   = 'https://nosemami.com';          // 独自ドメイン
const NOTE_URL   = 'https://note.com/nocey';        // noteのURL
```
