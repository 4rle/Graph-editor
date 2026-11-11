# 同梱・利用ライブラリ

実行依存のバージョンは package-lock.json に固定しています。各パッケージのライセンスはインストール後の node_modules 内にも含まれます。

| 用途                 | ライブラリ                               | ライセンス                |
| -------------------- | ---------------------------------------- | ------------------------- |
| 関数計算             | FormulaJS                                | MIT                       |
| 数学・行列・記号微分 | mathjs                                   | Apache-2.0                |
| 記号積分             | Nerdamer                                 | MIT                       |
| 数式組版             | KaTeX / MathJax                          | MIT / Apache-2.0          |
| PDF                  | jsPDF / svg2pdf.js                       | MIT                       |
| 等高線               | d3-contour                               | ISC                       |
| 図形演算             | polygon-clipping                         | MIT                       |
| 曲線・パス演算       | Paper.js                                 | MIT                       |
| 標準表計算編集       | Fortune Sheet / React / React DOM        | MIT                       |
| ICC色変換            | lcms-wasm / LittleCMS                    | MIT                       |
| フォント解析         | fontkit                                  | MIT                       |
| 出力用フォント       | Noto CJK のJP・Sans/Serif/Monoサブセット | SIL Open Font License 1.1 |

フォントの原典は環境に導入済みの Noto CJK (Google / Adobe)。BMPのUnicode範囲を抽出しWOFFへ変換したものです。著作権・ライセンス全文は assets/NotoSansJP-LICENSE.txt に保持しています。フォント生成時のコマンド例:

```bash
pyftsubset /usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc \
  --font-number=0 --unicodes='U+0000-FFFF' --flavor=woff \
  --output-file=assets/NotoSansJP.woff
```

通常のビルド・起動ではフォント生成ツールは不要です。
