# Cloudflare Workersでの配信

対象: `https://graph-editor.4rlecchin0-11.workers.dev/`

## 設定

リポジトリの `wrangler.jsonc` がWorkersの設定です。

| 項目                  | 値                                              |
| --------------------- | ----------------------------------------------- |
| プロジェクト/Worker名 | `graph-editor`                                  |
| リポジトリルート      | `.`                                             |
| Node.js               | 22.12以上 (`.node-version` は22)                |
| ビルドコマンド        | `npm run build`                                 |
| デプロイコマンド      | `npx wrangler deploy`                           |
| 静的アセット          | `wrangler.jsonc` の `assets.directory = ./dist` |

CLIからは `npm ci && npm run deploy` でも同じビルド・配信を実行できます。アカウント認証はCloudflare側のGit連携またはCLIの既存認証を使用します。アプリ実行用のAPIキーは不要です。

Workers Buildsの設定で `--assets .` のような上書きを行わず、リポジトリの設定を使ってください。リポジトリ全体や `src` を配信先にしません。

Pagesを使用する場合も静的成果物は共通です。ビルドは `npm run build`、出力ディレクトリは `dist` にします。

## 白画面の原因と修正

旧ビルドは `dist/app.js` とKaTeXの一部しか生成せず、HTML・画面CSS・出力用フォントを配信ディレクトリへまとめていませんでした。またHTMLは `/src/` や `/dist/` という開発用パスを参照していました。ビルド成功だけでは配信可能なサイトにならない構成でした。

現在は `dist` が独立した静的サイトです。HTML、ハッシュ付きJavaScript、動的チャンク、CSS、フォント、色変換用WASMを含み、NodeサーバーをCloudflare上で動かす必要はありません。HTMLとbootstrapは再検証するキャッシュ設定です。

起動用JSの取得・実行に失敗しても、エラーと再読み込み・保存データの書き出しを表示します。既存の保存データを自動削除しません。

## 確認

```bash
npm ci
npm test
npm run check
npm run test:deployment
```

`test:deployment` はWorkersの実ランタイムをローカル起動し、配信された `dist` に対して全ブラウザーテストを実行します。ICC出力テストは `ICC_FILE` にCMYK ICCファイルを指定できます。このクラウド環境では `/usr/share/color/icc/ghostscript/default_cmyk.icc` を使用して検証しています。

```bash
ICC_FILE=/path/to/print-profile.icc npm run test:deployment
```

この検証と、公開サイトへの実際の反映確認は別です。外部通信ポリシーで公開URLがブロックされる環境では、公開URLを確認済みとは扱いません。
