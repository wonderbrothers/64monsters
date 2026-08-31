# 64monsters — 64モンスターズ

6軸・全90問で、64通りの性格タイプを判定するブラウザ診断です。
`npm run dev` でローカルサーバーを起動して確認します（依存パッケージなし）。

このファイルは**動かすための手順書**です。
なぜその設計にしたか（軸の選び方、相性スコアの重みの根拠と検証結果、文言のルール、
レイアウトの基準）は `DESIGN.md` にまとめてあります。
`DESIGN.md` は `.gitignore` で除外しているため、公開リポジトリには入りません。

## 構成

```
docs/                     ← GitHub に公開するのはこのフォルダだけ
  index.html              トップ（診断の入口・6軸の説明・タイプ選択）
  quiz/index.html         設問90問（noindex。終わると /t/<CODE>/ へ）
  history/index.html      鑑定履歴（noindex。ブラウザ内の記録を時系列で見る）
  about/index.html        この診断について（回答の扱い・外部への通信・権利）
  types.html              64タイプの一覧ページ（キャラクター画像つき）
  t/<CODE>/index.html     タイプごとの結果・解説ページ（64枚・自動生成）
  pair/index.html         2人の相性ページ（?a=CODE&b=CODE）
  assets/style.css        デザイン（白ベース・文字サイズは base 16px の倍数）
  assets/questions.js     設問データ（90問）
  assets/types.js         軸の定義 / 基本16タイプ / 64サブタイプ
  assets/render.js        相性・マトリクスの組み立て（ブラウザとビルドで共用）
  assets/engine.js        出題順・途中保存・採点（/ と /quiz/ が共有）
  assets/home.js          トップの描画（軸の一覧・キャラクターの帯・タイプ選択）
  assets/quiz.js          設問の出題（終わると /t/<CODE>/ へ遷移する）
  assets/type.js          個別ページ側（6軸ゲージ・マイタイプ・画像保存）
  assets/pair.js          相性ページ側
  assets/history.js       鑑定履歴ページ側（書き出し・読み込み）
  assets/share.js         結果の一枚絵（1080×1080）をcanvasで作る
  images/thumbs/          表示用サムネイル（440px・WebP・64枚／約1.4MB）
  images/ogp/             タイプ別のOGP画像（1200×630・JPEG・64枚／約4MB・自動生成）

── 以下は制作用。.gitignore で公開対象から外しています ──
images/characters/        生成した原寸画像（1024px・PNG・64枚／約134MB）
prompts/                  イラスト生成プロンプト一式（prompts/README.md 参照）
prompts.html              プロンプトの一覧・コピー用ページ
tools/make-thumbs.py      サムネイル生成スクリプト
tools/make-ogp.py         タイプ別OGP画像の生成スクリプト
tools/build-pages.js      個別ページ64枚と sitemap.xml の生成スクリプト
tools/stamp-assets.js     キャッシュ対策のハッシュ付与
tools/serve.js            ローカル確認用の静的サーバー（依存パッケージなし）
package.json              npm scripts の入り口。依存パッケージはありません
LICENSE                   利用条件（オープンソースではありません）
DESIGN.md                 設計メモ「なぜそうしたか」（.gitignore で除外・非公開）
```

## ページの構成

- **`/`** … 診断の入口。6軸の説明とタイプ選択。ここからは設問を出しません。
- **`/quiz/`** … 90問の設問。答え終わると `/t/<CODE>/` へ移動します。JSで描画するため中身を持たないので `noindex`（sitemapにも載せていません）。`?restart=1` が付いていれば途中保存を捨てて最初から始めます。
- **`/t/<CODE>/`** … 結果ページ兼、そのタイプの解説ページ。本文はビルド時に静的に書き出してあるので、
  検索エンジンにも読まれます。自分で診断した直後だけ、6軸のスコアが上に足されます（判定は端末内に保存された回答から出しており、サーバーには送っていません）。
- **`/pair/?a=CODE&b=CODE`** … 2人の相性。6軸のどこが同じでどこが違うかを出します。
- **`/about/`** … 注意書きの本体。各ページの下部からはここへリンクするだけにしています（同じ文面を6か所に複製しないため）。
- **`/history/`** … 受けるたびの記録を時系列で。`noindex`（中身は各自のブラウザの中にしかありません）。
  生スコア（`-30〜+30`）と満点を保存しているので、設問数を変えても過去の記録を正しく読めます。
  JSONで書き出し・読み込みができ、端末をまたいで合流できます。上限300件。
- 旧URL（`index.html#ENTP-A-H`）で来た人は、対応する個別ページへ自動で転送されます。

## 公開について

- 公開するのは `docs/` の中身だけです。GitHub Pages は「リポジトリ直下」か「/docs」のどちらかを公開元に選べるため、フォルダ名を `docs` にしてあります（Settings → Pages → Source を `main` / `/docs` に設定するだけで公開できます）。Vercel や Netlify を使う場合は公開ディレクトリに `docs` を指定してください。
- `.gitignore` で `prompts/`・`prompts.html`・`images/` を除外しています。原寸PNGは合計134MBあり、GitHubは100MB超の単一ファイルを拒否するうえリポジトリが重くなるため、手元にだけ残す運用です。

## ローカルで確認する

```bash
npm run dev            # http://localhost:5173/ で docs/ を配信
npm run dev -- --port 5174   # ポートを変えたいとき
```

インストールは不要です（依存パッケージなし。Node 18以上のみ）。

- `docs/` を公開ルートとして配信するので、本番と同じ `/t/ENTP-A-H/` や `/pair/?a=...` がそのまま開けます。
- `docs/` 内のファイルを保存すると、開いているブラウザが自動でリロードします（切るときは `-- --no-reload`）。
- キャッシュは無効にしてあるので、CSS を直したのに反映されない、が起きません。

**`docs/index.html` のダブルクリック（`file://`）では正しく確認できません。**
`/t/<CODE>/` のようなディレクトリURLが解決されず、90問を答え終えたあとの遷移先がフォルダ一覧になります。
また `file://` はページごとに別オリジン扱いになる場合があり、マイタイプや途中保存（localStorage）がページをまたいで引き継がれません。

| コマンド | 何をするか |
|---|---|
| `npm run dev` | ローカルサーバーを起動 |
| `npm run build` | 個別ページ64枚＋sitemap を作り直し、続けてハッシュを付け直す |
| `npm run pages` | 個別ページ64枚と sitemap.xml だけを生成 |
| `npm run stamp` | アセットURLのハッシュだけを付け直す |
| `npm run ogp` | OGP画像64枚を生成（原寸画像とPythonが必要） |
| `npm run prompts` | イラスト生成プロンプトを書き出す（制作用） |

## 公開前に必ず実行するもの

**タイプの解説（`assets/types.js`）を変えたとき**は、個別ページを作り直します。

```bash
npm run pages                  # docs/t/<CODE>/index.html を64枚 + sitemap.xml
npm run ogp                    # docs/images/ogp/<CODE>.jpg を64枚（原寸画像が必要）
```

そのうえで、**CSS や JS を変更したとき**は、コミットの前に次を実行してください。

```bash
npm run stamp
```

`npm run build` は `pages` → `stamp` をまとめて実行します（OGPは原寸画像が要るので別扱い）。

`docs/` 以下のすべての HTML（`/t/<CODE>/` と `/pair/` を含む）と `assets/settings.js` が読み込むアセットの URL に、**中身のハッシュを `?v=` として付け直します**。
`build-pages.js` が書き出した直後のページにはハッシュが付いていないので、**必ず build のあとに実行**してください。
GitHub Pages は CSS/JS を長めにキャッシュするため、これをやらないと更新を push してもブラウザが古いファイルを使い続けます。
中身が変わったファイルだけハッシュが変わるので、無駄な再ダウンロードも起きません。何度実行しても結果は同じです（冪等）。

## 画像について

画面に表示しているのは `docs/images/thumbs/` の WebP です。原寸は `images/characters/` に置いたまま公開しません。
原寸を追加・差し替えたら、プロジェクト直下で次を実行するとサムネイルが作り直されます。

```bash
python3 tools/make-thumbs.py
```

（サムネイルは HTML から直接参照しているためハッシュ付与の対象外です。差し替えたのに反映されないときは、スーパーリロードで確認してください）

ファイル名はタイプコードそのまま（`INTJ-A-H.png` → `INTJ-A-H.webp`）。コードが一致していれば自動で表示されます。


## 計測しているもの

GTM（`GTM-PDKDBFBW`）経由で dataLayer に送っているイベントです。**回答内容そのものは送っていません。** 送っているのは、何問目まで進んだか・何秒かかったか・どのタイプが表示されたか、だけです。

| イベント | いつ | 一緒に送る値 |
|---|---|---|
| `quiz_start` | `/quiz/` を新規に開いた | `total_questions` |
| `quiz_progress` | 25% / 50% / 75%（23・45・68問目）を通過した | `question_no` `progress_pct` `elapsed_sec` |
| `quiz_pause` | 「保存して中断」を押した | `question_no` `answered` `progress_pct` `elapsed_sec` |
| `quiz_exit` | `/quiz/` から HOME で抜けた、またはタブを閉じた・戻った | 同上 |
| `quiz_resume` | 途中保存のある状態で `/quiz/` を開いた | `question_no` `elapsed_sec` |
| `quiz_complete` | 90問終えて結果ページに着いた | `monster_type` `base_type` `elapsed_sec` |
| `quiz_flat` | 6軸すべてが拮抗した結果に着いた（回答が偏っていた疑い） | `monster_type` |
| `type_view` | 結果ページを見た（診断直後をのぞく） | `monster_type` `base_type` |
| `cta_click` | 結果ページ下部の導線を押した | `monster_type` `label` `from_result` |
| `share_image` | 結果の一枚絵を保存・共有した | `monster_type` `method` |
| `pair_view` | 相性を表示した | `pair_a` `pair_b` `axis_match` |
| `share_pair_image` | 相性の一枚絵を保存・共有した | `pair_a` `pair_b` `method` |
| `invite_copy` | 「診断リンクをコピー」を押した | `from` |
| `history_view` | 鑑定履歴を開いた | `records` |
| `history_export` | 記録をJSONで書き出した | `records` |
| `history_import` | 記録をJSONから読み込んだ | `added` `total` |
| `history_clear` | 記録をすべて削除した | — |

> **GTM側の設定が要ります。** ここで送っているのは dataLayer までです。GA4 に届けるには、GTM で各イベント名のトリガーと GA4 イベントタグを作る必要があります（既存の設定にないイベントは、そのままでは GA4 に現れません）。

## 設問を編集するときの制約

- 出題順は受けるたびに入れ替わります（6軸のラウンドロビンは固定、その中の並びだけランダム）。
  途中保存にはそのときの並びも一緒に残しているので、再開しても設問がずれません。
- 各軸15問。**逆転項目（`dir` の正負）を7〜8問ずつ**入れて、
  すべて「そう思う」で答えても偏らないようにしています。増減させるときは
  軸ごとの問数と正負のバランスを必ず保ってください。
- **設問の並びを変えたら** `docs/assets/engine.js` の `QV` を上げます。
  途中保存した回答は並びに依存しているためです。
  **文言だけの修正では上げないでください**（進行中の回答を全部捨てることになります）。

## 編集するには

- **設問を変える** … `docs/assets/questions.js`。軸ごとの問数を揃え、`dir` の正負のバランスを保ってください。
- **タイプ解説を変える** … `docs/assets/types.js`。
  - `BASE_TYPES` … 基本16タイプの本文・強み・注意点・仕事・相性。**同じ基本タイプの4ページで共通**の内容。
  - `SUBTYPES` … 64通りの `label`（呼称）/ `desc`（説明）/ `edge`（このタイプならではの強み）/ `care`（落とし穴）/ `work`（仕事での現れ方）。**そのサブタイプにしかない**内容。
  - 変更したら `npm run build` で個別ページを作り直す。
- **配色・書体・文字サイズを変える** … `docs/assets/style.css` 冒頭の `html{font-size}` と `:root` 変数。文字サイズはすべて base（16px）の倍数（rem）で定義しています。
- **相性のロジック** … `docs/assets/render.js` の `matchGroups()` / `relation()`。基本タイプの相性リスト（`types.js` の `match`）に、A/O・H/C の組み合わせルールを掛け合わせて64タイプ表記に変換しています。画面表示と個別ページのビルドが同じ関数を使うので、直すのはここ1か所だけです。
- **相性ページの文面** … `docs/assets/pair.js` の `NOTE`（軸ごとに「同じとき／違うとき」の一言）と `verdictOf()`。
- **一枚絵のデザイン** … `docs/assets/share.js`。1080×1080 のcanvasに描いています。

## 公開するときの注意

既存の性格検査の名称には登録商標があります。本プロジェクトでは、プロジェクト名・フォルダ名・画面表示・プロンプトのいずれにも、そうした商標や既存サービス名を使っていません。
設問・タイプ名（設計モンスター・火つけモンスターなど）・解説文・キャラクターはすべて独自に制作したものです。対外的に公開する場合も、この方針のまま運用することをおすすめします。

## 権利について

© 2026 WONDER BROTHERS INC. All rights reserved.

**本プロジェクトはオープンソースではありません。** 詳細は [LICENSE](./LICENSE) を参照してください。
サイトが動作するためにソースを読める形で配信していますが、著作権は放棄していません。
設問文・タイプ名・解説文・キャラクター画像の転載や再配布、本診断を用いたサービスの提供、
学習データとしての利用は、商用・非商用を問わず許可していません。

設問・タイプ名・解説文・キャラクターはすべて独自に制作したものです。既存の性格検査や
診断サービスの名称、タイプ呼称、解説文は使用していません。
