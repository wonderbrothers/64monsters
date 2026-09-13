/* 64モンスターズ — 静的ページ生成
   使い方: node tools/build-pages.js

   生成するもの
     docs/t/<CODE>/index.html         64枚  タイプ個別
     docs/t/<CODE>/compat/index.html  64枚  タイプ別の相性
     docs/types.html                        モンスターギャラリー（カードを静的HTMLで出す）
     docs/64types/index.html                入口ページ：64タイプとは
     docs/axis/ao/index.html                入口ページ：A と O
     docs/axis/hc/index.html                入口ページ：H と C
     docs/sitemap.xml                       lastmod は「中身が最後に変わった日」

   原稿の実体は docs/assets/types.js と docs/assets/extra.js の2つだけ。
   ここではそれを読んで HTML に焼き付ける。編集したら再実行すること。

   内部リンクについて（重要）
     以前はヘッダーもギャラリーのカードも settings.js / インラインJSが
     実行時に作っていたため、HTMLの中に <a> が1本も無かった。
     クロールの一巡目でリンクが見えず、64枚が「検出 — インデックス未登録」で
     止まっていた。いまは <a> を静的に出す。JSのヘッダーはそのまま残してよい
     （重複しても害はない）。 */
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const ORIGIN = "https://64monsters.wonder-bros.com";
const GTM = "GTM-PDKDBFBW";
const SITE = "64モンスターズ";
const PUBLISHER = "株式会社ワンダーブラザース";

/* ---- types.js / render.js / extra.js をそのまま読み込む（二重管理を避ける） ---- */
const sandbox = { window: {}, document: undefined };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
["assets/types.js", "assets/render.js", "assets/extra.js"].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(DOCS, f), "utf8"), sandbox, { filename: f });
});
const W = sandbox.window;
const { BASE_TYPES: BASE, SUBTYPES: SUB, RENDER: R, AXES, EXTRA } = W;
const CODES = Object.keys(SUB);
const BASE_KEYS = Object.keys(BASE);
const SFX = ["A-H", "A-C", "O-H", "O-C"];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const AX = k => AXES.filter(a => a.key === k)[0];
/* AO・HC は neg が A / C 側。文字から極の情報を引く */
function pole(axKey, letter){
  const a = AX(axKey);
  return a.neg.l === letter ? a.neg : a.pos;
}
const aoName = l => pole("AO", l).name;   /* A→確信  O→揺らぎ */
const hcName = l => pole("HC", l).name;   /* H→信頼  C→慎重 */

/* ============================================================
   共通の枠
   ============================================================ */

function headHTML(o){
  const ldBlocks = (o.ld || []).map(x =>
    `<script type="application/ld+json">\n${JSON.stringify(x, null, 2)}\n</script>`).join("\n");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM}');</script>
<!-- End Google Tag Manager -->
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${o.url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="${PUBLISHER}">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15181B" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">

<!-- OGP / Twitter -->
<meta property="og:type" content="${o.ogtype || "article"}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${o.url}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:image" content="${o.ogimg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(o.ogalt || o.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${o.ogimg}">

<link rel="icon" href="${o.base}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" sizes="32x32" href="${o.base}favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="${o.base}favicon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="${o.base}favicon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="${o.base}apple-touch-icon.png">
<link rel="manifest" href="${o.base}site.webmanifest">

${ldBlocks}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&family=Montserrat+Alternates:wght@900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="${o.base}assets/style.css">
<script>
/* 表示設定を描画前に反映（ちらつき防止） */
(function(){try{var d=document.documentElement,t=localStorage.getItem("shindan64.v1.theme"),f=localStorage.getItem("shindan64.v1.fs");if(t!=="dark"&&t!=="light"){t=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";}d.setAttribute("data-theme",t);d.setAttribute("data-fs",(f==="s"||f==="l")?f:"m");}catch(e){}})();
window.SITE_BASE = "${o.base}";
${o.pageCode ? `window.PAGE_CODE = "${o.pageCode}";` : ""}
/* 訪問者の状態を描画前に決める。文言の出し分けはCSSでやるので、ちらつかない。
   new   … 診断の記録が無い（既定。クローラとJS無効もここ）
   mine  … このページが、その人の最新の結果
   other … 記録はあるが、別のタイプのページを見ている */
(function(){try{
  var last=JSON.parse(localStorage.getItem("shindan64.v1.last")||"null");
  var v=(!last||!last.code)?"new":(window.PAGE_CODE&&last.code===window.PAGE_CODE?"mine":"other");
  document.documentElement.setAttribute("data-visit",v);
}catch(e){}})();
</script>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->
`;
}

/* パンくず。JSのヘッダーが載る前でも、ここに静的な <a> がある状態にする */
function crumbHTML(items){
  const parts = items.map((it, i) => {
    const last = i === items.length - 1;
    return last
      ? `<span aria-current="page">${esc(it.name)}</span>`
      : `<a href="${it.href}">${esc(it.name)}</a>`;
  });
  return `<nav class="crumb" aria-label="現在地">${parts.join('<span class="crumb-sep" aria-hidden="true">/</span>')}</nav>`;
}

/* 全ページの下に置く、クロール可能なサイト内リンク。
   ヘッダーは settings.js が実行時に作るので、HTMLだけを見たときの導線がここになる。

   並び・文言・見た目は全ページで同じにすること。トップだけ別物にしない。
   同じ内容が場所によって違う顔で出ると、どれが何なのか読む側が判断できなくなる。
   index.html は手で書いているので、ここを変えたら向こうも合わせる。 */
const SITE_LINKS = [
  ["home",    "",             "ホーム"],
  ["quiz",    "quiz/",        "診断を受ける"],
  ["gallery", "types.html",   "モンスターギャラリー"],
  ["hub",     "64types/",     "64タイプ性格診断とは"],
  ["ao",      "axis/ao/",     "AとOの違い"],
  ["hc",      "axis/hc/",     "HとCの違い"],
  ["pair",    "pair/",        "2人の相性"],
  ["about",   "about/",       "この診断について"],
  ["privacy", "privacy/",     "プライバシーポリシー"],
  ["terms",   "terms/",       "利用規約"]
];

function siteNavHTML(base, current){
  const items = SITE_LINKS.map(([key, rel, label]) => {
    const href = rel ? base + rel : (base || "./");
    const on = key === current ? ' aria-current="page"' : "";
    return `<li><a href="${href}"${on}>${esc(label)}</a></li>`;
  }).join("");
  /* 字下げは0で返す。手書きページへ差し込むときに、その行の字下げを足す */
  return `<nav class="sitenav" aria-label="サイト内リンク">
  <p class="sitenav-h">サイト内のページ</p>
  <ul>${items}</ul>
</nav>`;
}

/* 診断への導線。検索から来た人にとっては、これが唯一の入口になる。
   ただし、もう受けた人に「受けてみると分かります」と言ってはいけない。
   自分の結果ページでも同じ文言が出ていた（2026-09-10、たいし指摘）。
   両方の版をHTMLに置いて、CSSが data-visit で選ぶ。 */
function quizCtaHTML(base, lead){
  return `<div class="quizcta" data-when="new">
    <p class="qc-lead">${esc(lead)}</p>
    <a class="btn qc-btn" href="${base}quiz/">90問の診断を受ける</a>
    <p class="qc-note">全90問・約10分。登録は不要で、回答はブラウザの中だけで採点します。</p>
  </div>
  <div class="quizcta" data-when="mine other">
    <p class="qc-lead">同じ人でも、受けるたびに数値は動きます。</p>
    <a class="btn qc-btn" href="${base}quiz/?restart=1">もう一度受ける</a>
    <p class="qc-note">受けた回ぶんの記録は <a href="${base}history/">ヒストリー</a> に残ります。前回との差を見ると、どの軸が自分の芯で、どの軸が状況で揺れるのかが分かります。</p>
  </div>`;
}

/* 独自サービスであることの共通注記。4文字コードを見せるページ（＝ほぼ全ページ）に出す。
   ここに MBTI® という語は入れない。関係を否定するために商標名をサイト中へ撒くと、
   記述的な打消しではなく検索誘引のための商標的使用と見られる余地が出るし、
   独立したサービスとしても見えにくくなる。
   MBTI® に触れるのは /about/ と /64types/ のFAQだけ。そこで TM_NOTE を出す。 */
const OWN_NOTE = `64モンスターズは独自設計の性格診断です。表示される INTJ などのコードは、独自の設問と採点による結果を表すもので、ほかの性格検査による判定を示すものではありません。`;

/* MBTI® の打消し表示。言及するページだけに置く。
   商標は形容詞として、適切な名詞（アセスメント）を伴わせて使う。
   title / description / h1 / JSON-LD / alt / OGP には入れない。 */
const TM_NOTE = `MBTI®は Myers & Briggs Foundation の商標または登録商標です。64モンスターズは同財団、日本MBTI協会その他のMBTI®関連団体とは関係・提携・承認等の関係がなく、公式のMBTI®アセスメントではありません。このサイトで表示される INTJ などのコードは、64モンスターズ独自の設問と採点による結果です。`;

function tmNoteHTML(){
  return `<p class="disclaimer tm-note">${esc(TM_NOTE)}</p>`;
}

function ownNoteHTML(base){
  return `<p class="disclaimer own-note">${esc(OWN_NOTE)} <a href="${base}about/">この診断について</a></p>`;
}

function footHTML(base, current){
  return `${ownNoteHTML(base)}
  ${siteNavHTML(base, current)}
  <p class="copy">© 2026 WONDER BROTHERS INC. All rights reserved.</p>`;
}

function scripts(base, list){
  return list.map(f => `<script src="${base}assets/${f}"></script>`).join("\n");
}

/* 可視のFAQ。ここに出ている文言と JSON-LD を必ず一致させる。
   例外は `ld:false` を付けた項目だけで、これは可視には出すが FAQPage には入れない。
   商標の打消しは読みに来た人に見せるもので、検索エンジンに差し出すものではない。 */
function faqHTML(items){
  return `<div class="sec split">
    <h2>よくある質問</h2>
    <div class="faq">${items.map(q => `<details class="faq-i"><summary>${esc(q.q)}</summary><p class="body-text">${q.aHTML || esc(q.a)}</p></details>`).join("")}</div>
  </div>`;
}
function faqLD(items){
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.filter(q => q.ld !== false).map(q => ({
      "@type": "Question", name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a }
    }))
  };
}
function crumbLD(items){
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem", position: i + 1, name: it.name, item: it.abs
    }))
  };
}

/* ============================================================
   タイプ個別ページ  /t/<CODE>/
   ============================================================ */

function typeFaq(code){
  const [bt, ao, hc] = code.split("-");
  const b = BASE[bt], s = SUB[code];
  const rank = R.rankAll(code);
  const top3 = i => rank[i].slice(0, 3).map(x => x.code).join("、");
  return [
    { q: `${code}とはどんなタイプですか？`,
      a: `${code}は「${s.label}」です。${b.tagline}という${bt}の性質に、自分への確信が${ao}（${aoName(ao)}）、人への構えが${hc}（${hcName(hc)}）の組み合わせが重なります。${s.desc}` },
    { q: `${code}と相性がいいタイプは？`,
      a: `用途によって変わります。恋人として噛み合うのは${top3(0)}、仕事のパートナーとしては${top3(1)}、友人としては${top3(2)}が上位です。6つの軸それぞれに「一致が効くか、違いが効くか」を用途別に重みづけして、64タイプを順位づけしています。同じタイプ同士も相手として数えています。` },
    { q: `${code}の「${ao}」と「${hc}」は何を表していますか？`,
      a: `${ao}は自分への確信の軸で、${aoName(ao)}＝${pole("AO", ao).note}という意味です。${hc}は人への構えの軸で、${hcName(hc)}＝${pole("HC", hc).note}という意味です。同じ${bt}でも、この2文字が変わると現れ方が変わります。` },
    { q: `${code}は「${bt}-${ao}${hc}」や「${bt} ${ao}${hc}」と同じですか？`,
      a: `同じものです。${code}・${bt}-${ao}${hc}・${bt} ${ao}${hc}・${bt} ${ao} ${hc} は、いずれも同じ組み合わせを指します。区切り方はサービスや記事によって異なります。` }
  ];
}

function typePage(code){
  const [bt, ao, hc] = code.split("-");
  const b = BASE[bt], s = SUB[code], base = "../../";
  const x = EXTRA[code];

  /* A: 検索意図の語を先頭に置く。造語のモンスター名は後ろへ回す */
  const title = `${code}とは？特徴・相性・力を発揮しやすい仕事｜${SITE}`;
  const desc  = clip(`${code}（${code.replace(/-/g, "")}）は「${s.label}」。${b.tagline}${bt}に、${ao}＝${aoName(ao)}と${hc}＝${hcName(hc)}が重なるタイプです。特徴、強みと落とし穴、かみ合いやすいタイプ、力を発揮しやすい仕事をまとめました。`, 122);
  const url   = `${ORIGIN}/t/${code}/`;
  const ogimg = `${ORIGIN}/images/ogp/${code}.jpg`;

  const crumbs = [
    { name: SITE, href: base, abs: ORIGIN + "/" },
    { name: "モンスターギャラリー", href: base + "types.html", abs: ORIGIN + "/types.html" },
    { name: code, href: url, abs: url }
  ];
  const faqs = typeFaq(code);

  const ldPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title, url, inLanguage: "ja", description: desc,
    primaryImageOfPage: { "@type": "ImageObject", contentUrl: ogimg },
    isPartOf: { "@type": "WebSite", name: SITE, url: ORIGIN + "/" },
    about: { "@type": "Thing", name: `${code}（${s.label}）`,
             alternateName: [code.replace(/-/g, ""), `${bt}-${ao}${hc}`, `${bt} ${ao}${hc}`] },
    publisher: { "@type": "Organization", name: PUBLISHER, url: "https://wonder-bros.com" }
  };

  /* D の3節。原稿がある8枚だけ出る。extra.js に足せば、そのまま全64枚に広がる */
  const personaSec = !x ? "" : `
  <div class="sec split">
    <h2>${code} はこんな人</h2>
    <p class="sec-note">実在の人物ではなく、よく見かける役割と場面で書いています。</p>
    <ul class="list persona">${x.persona.map(t => "<li>" + esc(t) + "</li>").join("")}</ul>
  </div>`;

  const aruaruSec = !x ? "" : `
  <div class="sec split">
    <h2>${code} あるある</h2>
    <ul class="list aruaru">${x.aruaru.map(t => "<li>" + esc(t) + "</li>").join("")}</ul>
    <p class="g-note" style="margin-top:16px" data-when="new">当たっているかどうかは、実際に受けてみるのがいちばん早いです。</p>
    <p class="g-note" style="margin-top:16px" data-when="mine other">全部が当たるとは限りません。6軸の組み合わせから見た傾向です。</p>
  </div>`;

  const loveSec = !x ? "" : `
  <div class="sec split">
    <h2>恋愛での ${code}</h2>
    <p class="body-text">${esc(x.love.lead)}</p>
    <div class="cols" style="margin-top:26px">
      <div><p class="sub-h">かみ合う相手</p><p class="body-text">${esc(x.love.good)}</p></div>
      <div><p class="sub-h">気をつけたいところ</p><p class="body-text">${esc(x.love.care)}</p></div>
    </div>
  </div>`;

  return headHTML({ title, desc, url, base, ogimg, ogalt: `${s.label}（${code}）`,
                    pageCode: code, ld: [ldPage, crumbLD(crumbs), faqLD(faqs)] }) +
`<section id="result">
  <div class="wrap">
  ${crumbHTML(crumbs)}
  <div class="res-head">
    <div class="hero"><span class="thumb"><img id="rThumb" src="${base}images/thumbs/${code}.webp" alt="${esc(b.name)}（${esc(s.label)}）のキャラクター" width="440" height="440"></span></div>
    <div class="hero-acts">
      <button class="btn ghost sm" id="shareBtn">このタイプを画像で保存</button>
      <button class="btn ghost sm" id="saveMyBtn" data-code="${code}">マイタイプに登録</button>
    </div>
    <p class="eyebrow" id="rEyebrow">monster type</p>
    <h1 class="res-label"><span class="code" id="rCode"><span class="base">${bt}</span><span class="dash">-</span><span class="sub">${ao}</span><span class="dash">-</span><span class="sub">${hc}</span></span><span class="rl-name">${esc(s.label)}</span></h1>
    <p class="res-tag">${esc(b.tagline)}</p>
    <p class="res-date hidden" id="rDate"></p>
    <p class="res-note">モンスター名は、6軸の組み合わせにつけた分類名です。軸ごとの表現ではありません。</p>
  </div>

  <div class="flatnote hidden" id="flatNote">
    <p class="fn-h">6つの軸すべてが、立っていません。</p>
    <p class="fn-t">同じ答えが続いたときや、どちらとも言えない答えが多かったときにも出る結果です。下の解説はそのまま表示していますが、しっくりこなければ、時間をあけてもう一度受けてみてください。</p>
  </div>

  <!-- 診断を受けていない人に、空いている枠のほうを見せる。
       隠したままだと「鑑定コードというものがある」と知る機会がどこにも無い。
       出し入れは type.js（自分の結果として開かれたときは、下の中身入りに入れ替わる） -->
  <div class="locked hidden" id="secLocked">
    <p class="lk-h">診断を受けると出るものが、2つあります。</p>
    <div class="lk-grid">
      <div class="lk-item">
        <p class="lk-t">6軸のスコア</p>
        <div class="gauges lk-gauges" id="lkGauges" aria-hidden="true"></div>
        <p class="lk-n">同じ ${code} でも、どの軸がどれだけ立っているかは人によって違います。</p>
      </div>
      <div class="lk-item">
        <p class="lk-t">鑑定コード</p>
        <div class="token-row"><code class="token lk-token" aria-hidden="true">64M-****-****-****-*</code></div>
        <p class="lk-n">結果を16文字にしたものです。別の端末に移すときと、<a href="${base}friends/">Myフレンド</a>に登録してもらうときに渡します。</p>
      </div>
    </div>
    <div class="lk-foot">
      <a class="btn lk-btn" href="${base}quiz/">90問を受けて、この2つを出す</a>
      <p class="lk-note">約10分・登録不要。回答はブラウザの中だけで採点します。</p>
    </div>
  </div>

  <!-- 自分の結果として開かれたときだけ出す。ギャラリーから来た人には数値が無い -->
  <div class="sec split hidden" id="secToken">
    <h2>鑑定コード</h2>
    <div>
      <p class="g-note">この結果を16文字にしたものです。別の端末に移すときや、人に渡すときに使います。</p>
      <div class="token-row">
        <code class="token" id="tokenOut">—</code>
        <button class="btn ghost" id="tokenCopy">コピー</button>
      </div>
      <p class="g-note tk-lead">受け取ったコードは <a href="${base}friends/">Myフレンド</a> に登録できます。これまでの記録は <a href="${base}history/">ヒストリー</a> で見られます。</p>
    </div>
  </div>

  <div class="sec split hidden" id="secGauge">
    <h2>6軸のスコア</h2>
    <p class="g-note">数値は、満点30に対するその極への寄りです。3以内は「立っていない」として扱います。</p>
    <div class="gauges" id="gauges"></div>
    <button class="tablebtn" id="tableBtn">数値の一覧を表示</button>
    <div id="tableWrap" class="hidden"></div>
  </div>

  <div class="sec split">
    <h2>${code} とは</h2>
    <p class="body-text"><b>${code}</b>（${bt}-${ao}${hc}／${bt} ${ao}${hc} とも書かれます）は、<a href="${base}64types/">64タイプ性格診断</a>のうちの1つです。${bt}の4文字に、自分への確信を表す<a href="${base}axis/ao/">${ao}（${aoName(ao)}）</a>と、人への構えを表す<a href="${base}axis/hc/">${hc}（${hcName(hc)}）</a>が重なります。64モンスターズでは「${esc(s.label)}」と呼んでいます。</p>
    <p class="g-note">この <code class="mono">${bt}</code> という4文字は、64モンスターズ独自の設問と採点による結果を表すものです。ほかの性格検査による判定を示すものではありません。<a href="${base}64types/">コードの読み方</a></p>
    <p class="body-text">${esc(b.summary)}</p>
    <p class="body-text">${esc(s.desc)}</p>
  </div>
${personaSec}
${aruaruSec}
  <div class="sec split">
    <h2>4つのサブタイプの中での位置</h2>
    <div class="matrix">${R.matrixHTML(base, code)}</div>
    <p class="g-note" style="margin-top:14px">同じ基本タイプでも、自分への確信（A / O）と人への構え（H / C）で現れ方が変わります。</p>
  </div>

  <div class="sec split">
    <h2>強みと、気をつけたいところ</h2>
    <p class="sec-note">ここは基本タイプ（${bt}）に共通する性質です。</p>
    <div class="cols">
      <div><p class="sub-h">強み</p><ul class="list plus">${b.strengths.map(t => "<li>" + esc(t) + "</li>").join("")}</ul></div>
      <div><p class="sub-h">気をつけたいところ</p><ul class="list minus">${b.watch.map(t => "<li>" + esc(t) + "</li>").join("")}</ul></div>
    </div>
    <div class="stbox">
      <p class="stbox-h"><span class="mono">${code}</span> ならでは</p>
      <div class="cols">
        <div><p class="sub-h">このタイプの強み</p><p class="body-text">${esc(s.edge)}</p></div>
        <div><p class="sub-h">落とし穴</p><p class="body-text">${esc(s.care)}</p></div>
      </div>
    </div>
  </div>
${loveSec}
  <div class="sec split">
    <h2>仕事で力を発揮しやすいところ</h2>
    <p class="sec-note">このタイプに多く見られる傾向です。向き不向きを決めるものではありません。</p>
    <div class="cols">
      <div><p class="sub-h">力を発揮しやすい環境</p><p class="body-text">${esc(b.work.env)}</p></div>
      <div><p class="sub-h">担いやすい役割</p><p class="body-text">${esc(b.work.role)}</p></div>
    </div>
    <p class="body-text" style="margin-top:22px">${esc(s.work)}</p>
    <div class="jobs">${b.work.jobs.map(t => "<span>" + esc(t) + "</span>").join("")}</div>
  </div>

  <div class="sec split">
    <h2>相性</h2>
    <p class="sec-note">恋人・仕事・友人で、噛み合う相手は変わります。6軸の重みづけから計算した参考値で、測定した数値ではありません。実際の人間関係や将来の関係を判定・保証するものでもありません。</p>
    <div>${R.topHTML(base, code, 5)}</div>
    <div class="pair-cta">
      <p class="pair-cta-txt">用途別のスコアと、どの軸が効いているかまで見るなら。</p>
      <a class="btn" href="${base}t/${code}/compat/">${code} の相性をくわしく見る</a>
      <a class="btn ghost" href="${base}pair/?a=${code}">相手のコードを入れて調べる</a>
    </div>
  </div>

  ${faqHTML(faqs)}

  ${quizCtaHTML(base, `${code} は診断結果の1つです。自分がどのタイプかは、受けてみると分かります。`)}

  <p class="disclaimer">
    この診断は、回答時点での自己認識を6つの軸で整理したものです。人の性格は状況や時期によって変わります。
  </p>

  ${footHTML(base)}
  </div>
</section>

<canvas id="shareCanvas" width="1080" height="1080" class="sr-only"></canvas>

${scripts(base, ["types.js", "render.js", "questions.js", "engine.js", "share.js", "type.js", "settings.js"])}
</body>
</html>
`;
}

/* ============================================================
   タイプ別の相性ページ  /t/<CODE>/compat/
   ------------------------------------------------------------
   /pair/?a=CODE はクエリパラメータなので評価が乗りにくい。
   同じ内容を、相手ごとに静的なURLで持たせる。
   スコアは測定値ではなく設計した重みなので、必ず内訳を添えて出すこと。
   ============================================================ */

const PURPOSE_SHORT = { love:"恋人", work:"仕事", friend:"友人" };

function partnerCard(base, a, code, active){
  const scores = R.purposeScores(a, code);
  const s = SUB[code];
  const rows = scores[0].rows;                                  /* 軸の内訳は用途で共通 */
  const up = rows.filter(r => r.ok).sort((x, y) => y.w - x.w).slice(0, 2);
  const down = rows.filter(r => !r.ok).sort((x, y) => y.w - x.w).slice(0, 1);
  return `<div class="cmp-card">
    <a class="cmp-head" href="${base}t/${code}/">
      <span class="thumb"><img src="${base}images/thumbs/${code}.webp" alt="" loading="lazy" width="56" height="56"></span>
      <span class="cmp-id"><span class="cmp-code mono">${code}</span><span class="cmp-lab">${esc(s.label)}</span></span>
    </a>
    <div class="cmp-scores">${scores.map((x, i) =>
      `<div class="cmp-s${i === active ? " on" : ""}"><span class="cs-t">${esc(PURPOSE_SHORT[x.key] || x.title)}</span><span class="cs-n">${x.score}</span><span class="cs-b">${esc(x.band)}</span></div>`).join("")}</div>
    <div class="cmp-axes">
      <p class="cmp-ax up"><span class="ax-h">追い風</span>${up.map(r => esc(r.title)).join("、") || "—"}</p>
      <p class="cmp-ax down"><span class="ax-h">向かい風</span>${down.map(r => esc(r.title)).join("、") || "—"}</p>
    </div>
    <p class="cmp-why">${esc(up.length ? up[0].text : down.length ? down[0].text : "")}</p>
    <a class="cmp-more" href="${base}pair/?a=${a}&amp;b=${code}">${a} × ${code} の内訳を見る</a>
  </div>`;
}

/* 64タイプすべての順位表。1つの用途で切ると全体像が見えないので、3用途を横に並べる。
   自分と同じタイプも相手になりうるので、表からは外さない */
function fullTableHTML(base, code){
  const lists = R.rankAll(code);
  const pos = lists.map(l => { const m = {}; l.forEach((x, i) => m[x.code] = { r:i + 1, s:x.score }); return m; });
  const all = lists[0].map(x => x.code).slice().sort();
  return `<details class="fulltable"><summary>全64タイプとの相性を一覧で見る</summary>
    <div class="ft-wrap"><table class="ft">
      <thead><tr><th>タイプ</th><th>恋人</th><th>仕事</th><th>友人</th></tr></thead>
      <tbody>${all.map(c => `<tr>
        <td><a href="${base}t/${c}/"><span class="mono">${c}</span><span class="ft-lab">${esc(SUB[c].label)}${c === code ? "（同じタイプ）" : ""}</span></a></td>
        ${pos.map(m => `<td class="ft-n"><b>${m[c].s}</b><span class="ft-r">${m[c].r}位</span></td>`).join("")}
      </tr>`).join("")}</tbody>
    </table></div>
    <p class="g-note" style="margin-top:14px">数値は6軸の重みづけから計算した目安で、測定値ではありません。順位は64タイプ中のものです。同じタイプ同士も相手として数えています。</p>
  </details>`;
}

function compatPage(code){
  const [bt, ao, hc] = code.split("-");
  const b = BASE[bt], s = SUB[code], base = "../../../";
  const url = `${ORIGIN}/t/${code}/compat/`;
  const ogimg = `${ORIGIN}/images/ogp/${code}.jpg`;
  const lists = R.rankAll(code);
  const top3 = i => lists[i].slice(0, 3).map(x => x.code).join("、");
  const same = i => lists[i].findIndex(x => x.code === code) + 1;

  const title = `${code}の相性｜恋愛・仕事・友人で見る相性ランキング｜${SITE}`;
  const desc  = clip(`${code}（${bt}-${ao}${hc}）と相性がいいのはどのタイプか。恋人・仕事のパートナー・友人の3つの用途ごとに、64タイプを6軸の重みづけで順位づけしました。どの軸が効いたかの内訳つき。`, 122);

  const crumbs = [
    { name: SITE, href: base, abs: ORIGIN + "/" },
    { name: "モンスターギャラリー", href: base + "types.html", abs: ORIGIN + "/types.html" },
    { name: code, href: base + "t/" + code + "/", abs: `${ORIGIN}/t/${code}/` },
    { name: "相性", href: url, abs: url }
  ];

  const faqs = [
    { q: `${code}と最も相性がいいのはどのタイプですか？`,
      a: `用途によって変わります。恋人として噛み合うのは${top3(0)}、仕事のパートナーとしては${top3(1)}、友人としては${top3(2)}が上位です。ひとつの答えにならないのは、同じ相手でも用途ごとに効く軸が違うからです。` },
    { q: `相性のスコアは何を根拠にしていますか？`,
      a: `測定値ではありません。6つの軸それぞれについて「一致が効くか、違いが効くか」を用途別に重みづけし、追い風になっている軸の重みが全体の何割かを出しています。設計した重みなので、数値だけでなく必ずどの軸が効いたかと一緒に見てください。重みの中身は各カードの「追い風」「向かい風」で開いています。` },
    { q: `${code}同士の相性はどうですか？`,
      a: `${code}同士も相手として数えていて、恋人${same(0)}位・仕事${same(1)}位・友人${same(2)}位です。6つの軸がすべて同じになるので、一致が効く用途では上位に来て、違いが効く用途では下がります。同じタイプだから相性がいい、とも悪いとも決めていません。` },
    { q: `相性の悪いタイプはいますか？`,
      a: `順位の下のほうに来るタイプはありますが、悪いという扱いはしていません。噛み合いにくい相手は、価値観の置き所が違うぶん、自分に足りない視点を最も速く手渡してくれる相手でもあります。全64タイプの順位は一覧で開けます。` }
  ];

  const ldPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title, url, inLanguage: "ja", description: desc,
    isPartOf: { "@type": "WebSite", name: SITE, url: ORIGIN + "/" },
    publisher: { "@type": "Organization", name: PUBLISHER, url: "https://wonder-bros.com" }
  };

  const sections = W.PURPOSES.map((P, i) => `<div class="sec split">
      <h2>${esc(R.PURPOSE_LEAD[P.key])}</h2>
      <p class="body-text">${esc(P.lead)}、64タイプを並べたときの上位6です。</p>
      <p class="g-note" style="margin-top:10px">${esc(R.purposeWhy(i))}</p>
      <div class="cmp-grid">${lists[i].slice(0, 6).map(x => partnerCard(base, code, x.code, i)).join("")}</div>
    </div>`).join("\n");

  const siblings = SFX.map(sf => bt + "-" + sf).filter(c => c !== code);

  return headHTML({ title, desc, url, base, ogimg, ogalt: `${code} の相性`,
                    ld: [ldPage, crumbLD(crumbs), faqLD(faqs)] }) +
`<section id="compat" class="wrap">
  ${crumbHTML(crumbs)}
  <div class="page-head">
    <p class="eyebrow">compatibility</p>
    <h1 class="subtitle">${code} の相性</h1>
    <p class="lede">${code}（${esc(s.label)}）と、恋人・仕事のパートナー・友人。用途ごとに効く軸が違うので、順位も変わります。6軸の重みづけから計算した目安であって、測定値ではありません。</p>
  </div>

${sections}

  <div class="sec split">
    <h2>全64タイプとの相性</h2>
    <p class="body-text">上の3つは用途ごとの上位だけです。順位の下のほうまで含めた全体は、こちらで開けます。</p>
    ${fullTableHTML(base, code)}
  </div>

  <div class="sec split">
    <h2>同じ ${bt} の他の3タイプの相性</h2>
    <p class="body-text">自分への確信（A / O）と人への構え（H / C）が変わると、順位も変わります。</p>
    <div class="match-list" style="margin-top:16px">${siblings.map(c =>
      `<a class="chip" href="${base}t/${c}/compat/"><span class="thumb"><img src="${base}images/thumbs/${c}.webp" alt="" loading="lazy"></span><span class="c-txt"><span class="c1">${c}</span><span class="c2">${esc(SUB[c].label)}</span></span></a>`).join("")}</div>
  </div>

  ${faqHTML(faqs)}

  ${quizCtaHTML(base, "相手のコードが分かれば、2人ぶんの内訳をその場で見られます。")}

  <p class="disclaimer">相性の数値は、6軸の重みづけから計算した目安です。人の関係は、タイプだけで決まるものではありません。</p>

  ${footHTML(base)}
</section>

${scripts(base, ["types.js", "render.js", "settings.js"])}
</body>
</html>
`;
}

/* ============================================================
   モンスターギャラリー  /types.html
   ------------------------------------------------------------
   カードは静的HTMLで出す。JSは「いま見ているグループを塗る」だけに絞る。
   ここが64枚への唯一のまとまった入口なので、<a> が実行時にしか
   存在しない状態に戻さないこと。
   ============================================================ */

function galleryPage(){
  const base = "", url = ORIGIN + "/types.html";
  const title = `64タイプ一覧｜モンスターギャラリー｜${SITE}`;
  const desc = "64モンスターズの全64タイプ一覧。4文字のコード×自分への確信（A / O）×人への構え（H / C）の64通りを、キャラクターと解説つきで並べています。";
  const crumbs = [
    { name: SITE, href: base || "./", abs: ORIGIN + "/" },
    { name: "モンスターギャラリー", href: url, abs: url }
  ];

  const groups = BASE_KEYS.map(k => {
    const b = BASE[k];
    const cards = SFX.map(sf => {
      const code = k + "-" + sf, s = SUB[code];
      return `<a class="tcard" href="t/${code}/">` +
        `<span class="thumb"><img src="images/thumbs/${code}.webp" alt="${code} ${esc(s.label)}" loading="lazy"></span>` +
        `<span class="tbody"><span class="tcode">${code}</span>` +
        `<span class="tlab" style="display:block">${esc(s.label)}</span>` +
        `<span class="tdesc" style="display:block">${esc(s.desc)}</span></span></a>`;
    }).join("");
    return `<section class="group" id="g-${k}"><div class="group-head"><span class="gc">${k}</span>` +
      `<span class="gn">${esc(b.name)}</span><span class="gt">${esc(b.tagline)}</span></div>` +
      `<p class="group-sum">${esc(b.summary)}</p>` +
      `<div class="tgrid">${cards}</div>` +
      `<p class="group-more"><a href="t/${k}-O-H/compat/">${k} の相性を見る</a></p></section>`;
  }).join("\n");

  const jump = BASE_KEYS.map(k =>
    `<a href="#g-${k}" data-k="${k}"><span class="gj-c">${k}</span><span class="gj-n">${esc(BASE[k].name.replace("モンスター", ""))}</span></a>`).join("");

  const ldList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "64タイプ一覧",
    numberOfItems: CODES.length,
    itemListElement: CODES.map((c, i) => ({
      "@type": "ListItem", position: i + 1, name: `${c}（${SUB[c].label}）`, url: `${ORIGIN}/t/${c}/`
    }))
  };

  return headHTML({ title, desc, url, base, ogimg: ORIGIN + "/images/ogp.png",
                    ogtype: "website", ld: [ldList, crumbLD(crumbs)] }) +
`<section id="list" class="wrap wide">
  ${crumbHTML(crumbs)}
  <div class="page-head">
    <p class="eyebrow">index</p>
    <h1 class="title" style="font-size:clamp(1.875rem, 5vw, 2.625rem)">モンスターギャラリー</h1>
    <p class="lede">4文字のコード × 自分への確信（A / O）× 人への構え（H / C）で64通り。カードを開くと、そのタイプの解説が読めます。コードの読み方は <a href="64types/">64タイプ性格診断とは</a> にまとめています。</p>
  </div>
  <nav class="gjump" id="gjump" aria-label="基本タイプへ移動">${jump}</nav>
  <div id="groups">
${groups}
  </div>

  ${quizCtaHTML(base, "自分がどのタイプかは、受けてみると分かります。")}

  ${footHTML(base, "gallery")}
</section>
${scripts(base, ["questions.js", "types.js", "settings.js"])}
<script>
/* カードは静的に出してあるので、ここでやるのは現在地の表示だけ */
(function(){
  var bar = document.getElementById("gjump");
  var keys = Array.prototype.map.call(bar.querySelectorAll("a[data-k]"), function(a){ return a.getAttribute("data-k"); });
  var links = {};
  Array.prototype.forEach.call(bar.querySelectorAll("a[data-k]"), function(a){ links[a.getAttribute("data-k")] = a; });

  /* チップの帯のぶんだけ、飛び先を下にずらす（帯は共通ヘッダーの下に貼りつく） */
  function syncOffset(){
    document.documentElement.style.setProperty("--gjump-h", bar.offsetHeight + "px");
  }
  syncOffset();
  window.addEventListener("resize", syncOffset);

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function goTo(k, smooth){
    var el = document.getElementById("g-" + k);
    if (!el) return;
    el.scrollIntoView({ behavior: (smooth && !reduce) ? "smooth" : "auto", block: "start" });
  }
  bar.addEventListener("click", function(e){
    var a = e.target.closest ? e.target.closest("a[data-k]") : null;
    if (!a) return;
    e.preventDefault();
    var k = a.getAttribute("data-k");
    goTo(k, true);
    if (history.replaceState) history.replaceState(null, "", "#g-" + k);
    setCurrent(k);
  });

  var current = null;
  function setCurrent(k){
    if (k === current) return;
    if (current && links[current]) links[current].removeAttribute("aria-current");
    current = k;
    if (!links[k]) return;
    links[k].setAttribute("aria-current", "true");
    var a = links[k], l = a.offsetLeft, r = l + a.offsetWidth;
    if (l < bar.scrollLeft + 8) bar.scrollLeft = l - 8;
    else if (r > bar.scrollLeft + bar.clientWidth - 8) bar.scrollLeft = r - bar.clientWidth + 8;
  }
  if ("IntersectionObserver" in window){
    var headH = 64;
    var probe = getComputedStyle(document.documentElement).getPropertyValue("--head-h");
    if (probe) headH = parseInt(probe, 10) || 64;
    var obs = new IntersectionObserver(function(entries){
      var vis = entries.filter(function(x){ return x.isIntersecting; });
      if (!vis.length) return;
      vis.sort(function(a, b){ return a.boundingClientRect.top - b.boundingClientRect.top; });
      setCurrent(vis[0].target.id.slice(2));
    }, { rootMargin: "-" + (headH + bar.offsetHeight + 4) + "px 0px -62% 0px", threshold: 0 });
    keys.forEach(function(k){ var el = document.getElementById("g-" + k); if (el) obs.observe(el); });
  }

  var m = /^#g-([A-Z]{4})$/.exec(location.hash || "");
  if (m && links[m[1]]){ goTo(m[1], false); setCurrent(m[1]); }
  else { setCurrent(keys[0]); }
})();
</script>
</body>
</html>
`;
}

/* ============================================================
   入口ページ
   ------------------------------------------------------------
   検索の入口になる語（64タイプとは / AとOの違い / HとCの違い）を
   受けるページ。ここまで無かったので、コードを知っている人しか
   来られなかった。64枚への内部リンクもここに集める。
   ============================================================ */

function axisTableHTML(){
  return `<div class="axtable"><table class="axt">
    <thead><tr><th>軸</th><th>一方の極</th><th>もう一方の極</th></tr></thead>
    <tbody>${AXES.map(a => `<tr>
      <td class="axt-t">${esc(a.title)}<span class="axt-k">${a.neg.l} / ${a.pos.l}</span></td>
      <td><b>${a.neg.l}・${esc(a.neg.name)}</b><span class="axt-n">${esc(a.neg.note)}</span></td>
      <td><b>${a.pos.l}・${esc(a.pos.name)}</b><span class="axt-n">${esc(a.pos.note)}</span></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function allTypesTableHTML(base){
  return `<div class="alltypes">${BASE_KEYS.map(k => `<div class="at-group">
    <p class="at-h"><span class="at-c">${k}</span><span class="at-n">${esc(BASE[k].name)}</span></p>
    <ul class="at-list">${SFX.map(sf => {
      const c = k + "-" + sf;
      return `<li><a href="${base}t/${c}/"><span class="mono">${c}</span><span class="at-lab">${esc(SUB[c].label)}</span></a></li>`;
    }).join("")}</ul>
  </div>`).join("")}</div>`;
}

function hubPage(){
  const base = "../", url = ORIGIN + "/64types/";
  const title = `64タイプ性格診断とは？A/O・H/Cの意味とコードの読み方｜${SITE}`;
  const desc = "90問の回答から6つの軸を算出し、いまの自己認識を64タイプとして表す独自の性格診断。INTJ-O-Hのようなコードの読み方、6つの軸の意味、64タイプの全一覧をまとめています。";
  const crumbs = [
    { name: SITE, href: base, abs: ORIGIN + "/" },
    { name: "64タイプ性格診断とは", href: url, abs: url }
  ];
  const faqs = [
    { q: "64タイプ性格診断とは何ですか？",
      a: "90問への回答から6つの軸を算出し、64通りのタイプとして表すものです。E / I・S / N・T / F・P / J の4組の記号に、自分への確信を表すA / Oと、人への構えを表すH / Cを独自に加えた6軸で、16 × 2 × 2 で64通りになります。各記号の意味、設問、採点方法、結果の解釈はいずれも64モンスターズ独自のものです。" },
    { q: "A と O は何を表していますか？",
      a: "自分への確信の軸です。A（確信）は自分の判断を疑わず、迷いが短いこと。O（揺らぎ）は決めたあとも考え直し、揺れながら精度を上げることを表します。Oは自信がないという意味ではありません。" },
    { q: "H と C は何を表していますか？",
      a: "人への構えの軸です。H（信頼）はまず信じて、自分から開いていくこと。C（慎重）は見きわめてから、距離を縮めることを表します。どちらが良いという軸ではありません。" },
    { q: "INTJ-O-H と INTJ-OH は違うものですか？",
      a: "同じものです。INTJ-O-H・INTJ-OH・INTJ OH・INTJ O H は、いずれも同じ組み合わせを指します。区切り方はサービスや記事によって異なります。" },
    { q: "他のサイトで見た64タイプと文字が違います",
      a: "64タイプを名乗る診断は複数あり、追加の2軸の記号が異なる場合があります。A / T と C / S を使うものもあります。64モンスターズは A / O と H / C を使っています。記号が違うものどうしの結果は、そのままでは対応しません。" },
    /* 商標は常に形容詞として、適切な名詞（アセスメント）を伴わせて使う。公式ガイドラインの指定。
       ld:false — 可視のFAQには出すが、FAQPage の構造化データには入れない */
    { q: "MBTI®のアセスメントと関係がありますか？",
      a: TM_NOTE, ld: false }
  ];
  const ldPage = {
    "@context": "https://schema.org", "@type": "WebPage",
    name: title, url, inLanguage: "ja", description: desc,
    isPartOf: { "@type": "WebSite", name: SITE, url: ORIGIN + "/" },
    publisher: { "@type": "Organization", name: PUBLISHER, url: "https://wonder-bros.com" }
  };

  return headHTML({ title, desc, url, base, ogimg: ORIGIN + "/images/ogp.png",
                    ld: [ldPage, crumbLD(crumbs), faqLD(faqs)] }) +
`<section id="hub" class="wrap">
  ${crumbHTML(crumbs)}
  <div class="page-head">
    <p class="eyebrow">about 64 types</p>
    <h1 class="subtitle">64タイプ性格診断とは</h1>
    <p class="lede">90問への回答から6つの軸を算出し、いまの自己認識を64通りのタイプとして表すものです。<code class="mono">INTJ-O-H</code> のように、E / I・S / N・T / F・P / J の4組の記号に、<b>自分への確信（A / O）</b>と<b>人への構え（H / C）</b>を加えて書きます。<b>各記号の意味・設問・採点方法・結果の解釈は、すべて64モンスターズ独自のものです。</b></p>
  </div>

  <div class="sec split">
    <h2>コードの読み方</h2>
    <div class="codemap">
      <div class="cm-part"><span class="cm-c mono">INTJ</span><span class="cm-t">4組の記号</span><span class="cm-n">エネルギーの向き・情報の受け取り方・判断の基準・外界への構え。一般に知られている記号体系と同じアルファベットを使いますが、各記号の定義と判定方法は64モンスターズ独自のものです。</span></div>
      <div class="cm-part"><span class="cm-c mono">O</span><span class="cm-t">自分への確信</span><span class="cm-n">A（確信）か O（揺らぎ）。決めたあとに戻ってくるかどうかの軸です。<a href="${base}axis/ao/">くわしく</a></span></div>
      <div class="cm-part"><span class="cm-c mono">H</span><span class="cm-t">人への構え</span><span class="cm-n">H（信頼）か C（慎重）。人にまず開くか、見きわめてから近づくかの軸です。<a href="${base}axis/hc/">くわしく</a></span></div>
    </div>
  </div>

  <div class="sec split">
    <h2>6つの軸</h2>
    <p class="body-text">64モンスターズは、次の6つの軸で判定しています。上の4つは E / I・S / N・T / F・P / J の記号で表す軸、下の2つは64モンスターズが独自に加えた軸です。いずれも定義と設問、採点方法は独自のものです。</p>
    ${axisTableHTML()}
    <p class="g-note" style="margin-top:16px">それぞれ満点30に対する寄りで測り、差が3以内のときは「立っていない」として扱います。</p>
  </div>

  <div class="sec split">
    <h2>表記のゆれについて</h2>
    <p class="body-text">同じ組み合わせでも、書き方はいくつかあります。<code class="mono">INTJ-O-H</code>、<code class="mono">INTJ-OH</code>、<code class="mono">INTJ OH</code>、<code class="mono">INTJ O H</code>。どれも同じものを指します。このサイトではハイフンで3つに区切る <code class="mono">INTJ-O-H</code> の形に統一しています。</p>
    <p class="body-text">また、64タイプを名乗る診断は複数あり、追加の2軸に <code class="mono">A / T</code> と <code class="mono">C / S</code> を使うものもあります。記号が違うものどうしの結果は、そのままでは対応しません。他のサイトで出たコードをこのサイトで調べるときは、A / O・H / C の表記かどうかを確かめてください。</p>
  </div>

  <div class="sec split">
    <h2>4文字だけでは分かれないところ</h2>
    <p class="body-text">4文字だけでは、同じ<code class="mono">INTJ</code>でも現れ方がまるで違う人が同じ箱に入ります。決めたあとに戻ってくるかどうか、人にまず開くかどうか。この2つは、日々の振る舞いにはっきり出るのに、4文字では区別されません。64モンスターズは、この2つを独自の軸として立てて見ています。</p>
    <p class="body-text">たとえば <a href="${base}t/INTJ-A-H/">INTJ-A-H</a> と <a href="${base}t/INTJ-O-C/">INTJ-O-C</a> は、同じ INTJ でも、旗を掲げて人を巻き込む人と、ひとりで深く潜っていく人に分かれます。<a href="${base}t/INTJ-A-H/">4タイプの違いを並べて見る</a>のがいちばん早いです。</p>
  </div>

  <div class="sec split">
    <h2>64タイプの一覧</h2>
    <p class="body-text">4文字の組み合わせごとに、A / O × H / C の4通りを並べています。</p>
    ${allTypesTableHTML(base)}
    <p class="g-note" style="margin-top:20px">キャラクターつきで見るなら <a href="${base}types.html">モンスターギャラリー</a> へ。</p>
  </div>

  ${faqHTML(faqs)}

  ${quizCtaHTML(base, "自分のコードが分からないときは、90問に答えると出ます。")}

  ${footHTML(base, "hub")}
</section>
${scripts(base, ["types.js", "settings.js"])}
</body>
</html>
`;
}

/* --- A/O・H/C の軸ページ。2枚を同じ型で作る --- */
const AXIS_PAGES = {
  AO: {
    slug: "ao", key: "AO", crumb: "AとOの違い",
    h1: "A（確信）とO（揺らぎ）の違い",
    lede: "64タイプの5文字目にあたる軸です。決めたあとに戻ってくるかどうかを見ています。A が正しくてOが劣る、という軸ではありません。",
    misread: "Oは「自信がない」という意味ではありません。決めたあとにもう一度確かめる幅を持っている、という意味です。同じ4文字でも、Oのほうが検討を重ねるぶん、出来上がりの精度が高くなる場面は多くあります。逆にAは、迷いが短いぶん、動き出しが速くなります。",
    tellA: ["決めたことを、あとから思い返さない", "反対されても判断そのものは揺れない", "根拠を聞かれると、説明より先に結論が出ている"],
    tellO: ["決めたあとに「あの前提でよかったか」と戻る", "人の指摘を素直に取り込める", "締め切りが外から来ないと、検討が終わらない"]
  },
  HC: {
    slug: "hc", key: "HC", crumb: "HとCの違い",
    h1: "H（信頼）とC（慎重）の違い",
    lede: "64タイプの6文字目にあたる軸です。人にまず開くか、見きわめてから近づくかを見ています。どちらが社交的か、という軸ではありません。",
    misread: "Cは「人が嫌い」でも「内向的」でもありません。開く相手を選んでいる、という意味です。外向型（E）でC、内向型（I）でHの人はふつうにいます。人と会う量の話ではなく、会った人にどこから入るかの話です。",
    tellA: ["初対面でも、先に自分のことを話せる", "頼まれごとを、相手を測らずに引き受ける", "裏切られてからでないと、疑わない"],
    tellO: ["相手を見てから、出す情報の量を決める", "打ち解けるまでに時間がかかると言われる", "信用した相手にだけ、急に深く関わる"]
  }
};

function axisPage(kind){
  const A = AXIS_PAGES[kind], ax = AX(A.key), base = "../../";
  const url = `${ORIGIN}/axis/${A.slug}/`;
  /* 見出しの順に合わせる。AO は A（neg）が先、HC は H（pos）が先。
     tellA / tellO はこの順で書いてあるので、ここを入れ替えると中身がずれる */
  const L1 = kind === "AO" ? ax.neg : ax.pos;
  const L2 = kind === "AO" ? ax.pos : ax.neg;
  const title = `${A.h1}｜64タイプの${ax.title}の軸｜${SITE}`;
  const desc = clip(`${L1.l}（${L1.name}）と${L2.l}（${L2.name}）は何が違うのか。${ax.title}の軸が、同じ4文字のタイプにどう効くのかを、見分け方と64タイプへのリンクつきでまとめました。`, 122);
  const crumbs = [
    { name: SITE, href: base, abs: ORIGIN + "/" },
    { name: "64タイプ性格診断とは", href: base + "64types/", abs: ORIGIN + "/64types/" },
    { name: A.crumb, href: url, abs: url }   /* パンくずは短く。見出しをそのまま入れない */
  ];
  const faqs = [
    { q: `${L1.l}と${L2.l}は何が違いますか？`,
      a: `${ax.title}の軸です。${L1.l}（${L1.name}）は${L1.note}。${L2.l}（${L2.name}）は${L2.note}。どちらが優れているという軸ではありません。` },
    { q: `${L2.l}であることは弱点ですか？`, a: A.misread },
    { q: `自分がどちらか分かりません`,
      a: `90問の診断で判定できます。差が3以内のときは「立っていない」として扱い、どちらとも決めつけない形で表示します。` }
  ];
  const ldPage = {
    "@context": "https://schema.org", "@type": "WebPage",
    name: title, url, inLanguage: "ja", description: desc,
    isPartOf: { "@type": "WebSite", name: SITE, url: ORIGIN + "/" },
    publisher: { "@type": "Organization", name: PUBLISHER, url: "https://wonder-bros.com" }
  };

  /* 16の基本タイプそれぞれで、この軸の2通りを並べる。もう一方の軸は H / A に固定して比較を揃える */
  const fix = kind === "AO" ? "H" : "A";
  const pairs = BASE_KEYS.map(k => {
    const c1 = kind === "AO" ? `${k}-${L1.l}-${fix}` : `${k}-${fix}-${L1.l}`;
    const c2 = kind === "AO" ? `${k}-${L2.l}-${fix}` : `${k}-${fix}-${L2.l}`;
    return `<div class="axpair">
      <p class="axp-h"><span class="mono">${k}</span> ${esc(BASE[k].name)}</p>
      <div class="axp-two">
        <a class="axp-c" href="${base}t/${c1}/"><span class="mono">${c1}</span><span class="axp-l">${esc(SUB[c1].label)}</span></a>
        <a class="axp-c" href="${base}t/${c2}/"><span class="mono">${c2}</span><span class="axp-l">${esc(SUB[c2].label)}</span></a>
      </div>
    </div>`;
  }).join("");

  return headHTML({ title, desc, url, base, ogimg: ORIGIN + "/images/ogp.png",
                    ld: [ldPage, crumbLD(crumbs), faqLD(faqs)] }) +
`<section id="axis" class="wrap">
  ${crumbHTML(crumbs)}
  <div class="page-head">
    <p class="eyebrow">axis ${L1.l} / ${L2.l}</p>
    <h1 class="subtitle">${A.h1}</h1>
    <p class="lede">${esc(A.lede)}</p>
  </div>

  <div class="sec split">
    <h2>2つの極</h2>
    <div class="cols">
      <div><p class="sub-h">${L1.l}・${esc(L1.name)}</p><p class="body-text">${esc(L1.note)}</p>
        <ul class="list" style="margin-top:18px">${A.tellA.map(t => "<li>" + esc(t) + "</li>").join("")}</ul></div>
      <div><p class="sub-h">${L2.l}・${esc(L2.name)}</p><p class="body-text">${esc(L2.note)}</p>
        <ul class="list" style="margin-top:18px">${A.tellO.map(t => "<li>" + esc(t) + "</li>").join("")}</ul></div>
    </div>
  </div>

  <div class="sec split">
    <h2>よくある誤解</h2>
    <p class="body-text">${esc(A.misread)}</p>
  </div>

  <div class="sec split">
    <h2>同じ4文字で、${L1.l}と${L2.l}を並べる</h2>
    <p class="body-text">この軸が変わると、同じ基本タイプでも呼び名が変わります。もう一方の軸は${fix}に固定して並べました。</p>
    <div class="axpairs">${pairs}</div>
    <p class="g-note" style="margin-top:20px">64通りすべては <a href="${base}64types/">64タイプ性格診断とは</a> と <a href="${base}types.html">モンスターギャラリー</a> にあります。</p>
  </div>

  ${faqHTML(faqs)}

  ${quizCtaHTML(base, `自分が${L1.l}と${L2.l}のどちらかは、90問に答えると出ます。`)}

  ${footHTML(base, A.slug)}
</section>
${scripts(base, ["types.js", "settings.js"])}
</body>
</html>
`;
}

/* ============================================================
   書き出し
   ============================================================ */

function write(rel, html){
  const file = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const pages = [];   /* { rel, loc, pri, html } */


/* ============================================================
   プライバシーポリシー  /privacy/
   ------------------------------------------------------------
   ここで必ず分けて書くこと。
     A 90問の回答・ヒストリー・マイフレンド … 端末のブラウザの中だけ
     B アクセス解析 … Cookie 等の識別子と閲覧情報が Google へ渡る
   「回答は送っていません」だけだと、B も無いように読める。
   結果ページのURLにタイプが入っている以上、「結果は一切外部に出ない」とは書けない。
   ============================================================ */
function privacyPage(){
  const base = "../", url = ORIGIN + "/privacy/";
  const title = `プライバシーポリシー｜${SITE}`;
  const desc = "90問の回答とヒストリーはブラウザの中にだけ保存し、サーバーへは送信していません。一方でアクセス解析のためCookie等の情報がGoogleへ送信されます。その違いと、オプトアウトの方法をまとめています。";
  const crumbs = [
    { name: SITE, href: base, abs: ORIGIN + "/" },
    { name: "プライバシーポリシー", href: url, abs: url }
  ];
  const ldPage = {
    "@context": "https://schema.org", "@type": "WebPage",
    name: title, url, inLanguage: "ja", description: desc,
    isPartOf: { "@type": "WebSite", name: SITE, url: ORIGIN + "/" },
    publisher: { "@type": "Organization", name: PUBLISHER, url: "https://wonder-bros.com" }
  };

  return headHTML({ title, desc, url, base, ogimg: ORIGIN + "/images/ogp.png",
                    ld: [ldPage, crumbLD(crumbs)] }) +
`<section id="privacy" class="wrap">
  ${crumbHTML(crumbs)}
  <div class="page-head">
    <p class="eyebrow">privacy</p>
    <h1 class="subtitle">プライバシーポリシー</h1>
    <p class="lede">何をこの端末の中だけに置いていて、何が外に出ているのか。ここを混ぜずに書きます。</p>
  </div>

  <div class="sec split">
    <h2>90問の回答と、この端末に残るもの</h2>
    <p class="body-text"><b>90問への回答内容と診断履歴は、当サービスのサーバーへ送信・保存していません。</b>採点もお使いのブラウザの中だけで行っています。「保存して中断」した回答、マイタイプの登録、ヒストリー、<a href="${base}friends/">Myフレンド</a>に登録した名前とコード、表示設定も同じで、すべてブラウザ内（localStorage）にのみ保存しています。</p>
    <p class="body-text">フレンドの名前は、あなたがご自分で付けたものです。鑑定コードそのものに名前は入っていません。他の方の情報をお預かりすることになるため、本名である必要はありませんし、共有の端末では登録を控えることをおすすめします。こちらから相手に知らせることはありませんし、こちらにも届きません。</p>
    <p class="body-text">端末の中にしか無いので、次の場合には失われます。</p>
    <ul class="list">
      <li>ブラウザのデータ（サイトデータ・履歴）を消したとき</li>
      <li>プライベートモードで受けたとき（そのウィンドウを閉じた時点で消えます）</li>
      <li>別の端末・別のブラウザで開いたとき（そちらには引き継がれません）</li>
      <li>Safari（iPhone・iPad・Mac）で、7日間このサイトを開かなかったとき</li>
    </ul>
    <p class="body-text">最後のものは補足が必要です。Safari には、ブラウザを使った日数で7日のあいだ、そのサイトに対する操作が一度もないと、サイトが保存したデータをすべて削除するという仕様があります。こちらで防ぐ方法はありません。Chrome や Firefox にこの動作はありません。記録を長く残したい場合は、<a href="${base}history/">ヒストリー</a>のページから JSONで書き出して手元に保存してください。</p>
  </div>

  <div class="sec split">
    <h2>アクセス解析（Google アナリティクス）</h2>
    <p class="body-text">一方で、利用状況の把握とサービス改善のために <b>Google アナリティクス</b>（Google タグ マネージャー経由）を利用しています。これに伴い、<b>Cookie 等の識別子、閲覧したページ、利用日時、ブラウザ・OS・端末の情報、おおよその地域情報などが Google へ送信される場合があります。</b>これらの情報は Google のプライバシーポリシー等に基づいて処理されます。</p>
    <p class="body-text">送信を望まない場合は、ブラウザで Cookie を無効にするか、Google が提供する<a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">オプトアウト アドオン</a>をご利用ください。いずれの場合も、このサイトの機能はそのままお使いいただけます。Google の取り扱いについては<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google のプライバシーポリシー</a>をご確認ください。</p>
  </div>

  <div class="sec split">
    <h2>結果ページのURLについて</h2>
    <p class="body-text">結果ページのURLにはタイプが含まれます（例：<code class="mono">/t/ENTP-A-H/</code>）。閲覧されたページとして記録されるため、<b>どのタイプのページが表示されたかは、アクセス解析の集計に含まれます。</b>個々の設問への回答そのものは送信していません。「診断結果は一切外部に出ない」とは言えないので、ここは正確に書いておきます。</p>
    <p class="body-text">設問ページ（<code class="mono">/quiz/</code>）とヒストリー（<code class="mono">/history/</code>）は検索エンジンには載せていません。</p>
  </div>

  <div class="sec split">
    <h2>そのほかの外部サービス</h2>
    <p class="body-text">Webフォント（Google Fonts）を読み込んでいます。読み込みの際に、IPアドレスやブラウザの情報が Google へ送信される場合があります。広告のタグは入れていません。</p>
    <p class="body-text">サイト内から外部のサイトへリンクしている場合、リンク先での情報の取り扱いは各サイトのポリシーによります。</p>
  </div>

  <div class="sec split">
    <h2>お問い合わせ</h2>
    <p class="body-text">本サイトは<a href="https://wonder-bros.com" target="_blank" rel="noopener noreferrer">株式会社ワンダーブラザース</a>が運営しています。本ポリシーに関するお問い合わせは、同社のサイトからご連絡ください。</p>
    <p class="body-text">内容は必要に応じて見直します。更新した場合は、このページに反映します。</p>
  </div>

  ${footHTML(base, "privacy")}
</section>

${scripts(base, ["types.js", "render.js", "settings.js"])}
</body>
</html>
`;
}

/* ============================================================
   利用規約  /terms/
   ------------------------------------------------------------
   法律文書らしく威圧的に書かない。ただし、守りたいものははっきりさせる。
   守るのは「具体的な表現物」であって、性格類型という考え方そのものではない。
   ============================================================ */
function termsPage(){
  const base = "../", url = ORIGIN + "/terms/";
  const title = `利用規約｜${SITE}`;
  const desc = "64モンスターズの利用条件、禁止事項、著作権の扱い、診断結果についての免責、責任の範囲などをまとめています。";
  const crumbs = [
    { name: SITE, href: base, abs: ORIGIN + "/" },
    { name: "利用規約", href: url, abs: url }
  ];
  const ldPage = {
    "@context": "https://schema.org", "@type": "WebPage",
    name: title, url, inLanguage: "ja", description: desc,
    isPartOf: { "@type": "WebSite", name: SITE, url: ORIGIN + "/" },
    publisher: { "@type": "Organization", name: PUBLISHER, url: "https://wonder-bros.com" }
  };

  return headHTML({ title, desc, url, base, ogimg: ORIGIN + "/images/ogp.png",
                    ld: [ldPage, crumbLD(crumbs)] }) +
`<section id="terms" class="wrap">
  ${crumbHTML(crumbs)}
  <div class="page-head">
    <p class="eyebrow">terms</p>
    <h1 class="subtitle">利用規約</h1>
    <p class="lede">64モンスターズ（以下「本サービス」）をお使いいただくうえでの約束ごとです。株式会社ワンダーブラザース（以下「当社」）が定めます。</p>
  </div>

  <div class="sec split">
    <h2>本サービスの目的</h2>
    <p class="body-text">本サービスは、90問への回答から6つの軸を算出し、回答した時点での自己認識を64タイプのキャラクターとして表すものです。娯楽および自己理解の手がかりとしてお使いください。心理検査でも、医学的・心理学的な診断でもありません。</p>
  </div>

  <div class="sec split">
    <h2>利用条件</h2>
    <p class="body-text">登録は不要です。どなたでも無料でお使いいただけます。通信料金はご利用者の負担となります。未成年の方は、保護者の方の了解を得てご利用ください。</p>
  </div>

  <div class="sec split">
    <h2>禁止事項</h2>
    <p class="body-text">次のことはご遠慮ください。</p>
    <ul class="list">
      <li>設問文・タイプ名・解説文・キャラクター画像・診断ロジックの、無断での転載、複製、再配布、改変、公衆送信</li>
      <li>本サービスまたはその一部を用いたサービスの提供（商用・非商用を問いません）</li>
      <li>機械的な手段による大量取得（スクレイピング、クローラによる過度なアクセス等）</li>
      <li>AI・機械学習の学習データとしての無断利用</li>
      <li>本サービスの運営を妨げる行為、サーバーやネットワークに過度の負荷をかける行為</li>
      <li>法令または公序良俗に反する行為</li>
    </ul>
    <p class="body-text">診断を受けてご自身の結果を共有すること、出典を明示した引用は自由です。それを超えて利用したい場合は、<a href="https://wonder-bros.com" target="_blank" rel="noopener noreferrer">当社</a>まで事前にご連絡ください。</p>
  </div>

  <div class="sec split">
    <h2>権利について</h2>
    <p class="body-text">本サービスの設問文、タイプ名、解説文、キャラクターおよびその画像、イラスト、デザイン、プログラム、サービス名称・ロゴは、当社に帰属します。オープンソースではありません。サイトが動作するためにソースを読める形で配信していますが、著作権を放棄したものではありません。</p>
    <p class="body-text">当社が権利を主張するのは、これら具体的な表現物とプログラムについてです。性格を軸で捉えるという考え方そのものや、一般に使われている記号体系について、独占を主張するものではありません。</p>
  </div>

  <div class="sec split">
    <h2>診断結果について</h2>
    <p class="body-text">結果は、回答した時点での自己認識を整理したものです。人の性格は状況や時期によって変わります。確定した人格判定ではありません。</p>
    <p class="body-text">相性のスコアは、当社が設計した重みづけによる参考値です。測定した数値ではなく、実際の人間関係、恋愛関係、将来の関係性を判定または保証するものではありません。</p>
    <p class="body-text">採用選考や人事評価など、人の採否や重要な意思決定には使用しないでください。そのための妥当性の検証を行っていません。</p>
  </div>

  <div class="sec split">
    <h2>サービスの変更・停止</h2>
    <p class="body-text">内容の変更、追加、停止を、事前の予告なく行う場合があります。設問や採点方法が変わった場合、それ以前に受けた結果とそのまま比べることはできません。版の見分け方はページ下部の <code class="mono">v</code> ではじまる行に出しています。</p>
  </div>

  <div class="sec split">
    <h2>責任の範囲</h2>
    <p class="body-text">本サービスの利用または利用できなかったことによって生じた損害について、当社の故意または重過失による場合を除き、責任を負いかねます。診断結果は保存していないため、端末側でデータが失われた場合の復旧もできません。必要な記録は<a href="${base}history/">ヒストリー</a>から書き出して保存してください。</p>
  </div>

  <div class="sec split">
    <h2>規約の変更</h2>
    <p class="body-text">必要に応じてこの規約を変更することがあります。変更後の規約は、このページに掲載した時点から適用します。</p>
  </div>

  <div class="sec split">
    <h2>準拠法と管轄</h2>
    <p class="body-text">本規約は日本法に準拠します。本サービスに関して紛争が生じた場合は、当社の本店所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
  </div>

  ${footHTML(base, "terms")}
</section>

${scripts(base, ["types.js", "render.js", "settings.js"])}
</body>
</html>
`;
}


for (const code of CODES){
  pages.push({ rel: `t/${code}/index.html`,        loc: `${ORIGIN}/t/${code}/`,        pri: "0.7", html: typePage(code) });
  pages.push({ rel: `t/${code}/compat/index.html`, loc: `${ORIGIN}/t/${code}/compat/`, pri: "0.6", html: compatPage(code) });
}
pages.push({ rel: "types.html",         loc: `${ORIGIN}/types.html`,  pri: "0.9", html: galleryPage() });
pages.push({ rel: "64types/index.html", loc: `${ORIGIN}/64types/`,    pri: "0.9", html: hubPage() });
pages.push({ rel: "axis/ao/index.html", loc: `${ORIGIN}/axis/ao/`,    pri: "0.8", html: axisPage("AO") });
pages.push({ rel: "axis/hc/index.html", loc: `${ORIGIN}/axis/hc/`,    pri: "0.8", html: axisPage("HC") });
pages.push({ rel: "privacy/index.html", loc: `${ORIGIN}/privacy/`,    pri: "0.3", html: privacyPage() });
pages.push({ rel: "terms/index.html",   loc: `${ORIGIN}/terms/`,      pri: "0.3", html: termsPage() });

for (const p of pages) write(p.rel, p.html);
console.log(`ページを生成しました: ${pages.length} 枚`);

/* ---- 手書きページのサイト内リンクを、SITE_LINKS から上書きする ----
   index.html / about/ / pair/ / history/ / friends/ は生成物ではないので、
   放っておくと SITE_LINKS を変えたときに置き去りになる（実際に一度ずれた）。
   ビルドのたびに <nav class="sitenav"> の中身だけを差し替えて、二重管理をなくす。
   ナビが無いページは対象外。quiz/ は意図的に置いていない（90問に集中する画面） */
const HAND_PAGES = [
  { rel: "index.html",         base: "",     current: "home" },
  { rel: "about/index.html",   base: "../",  current: "about" },
  { rel: "pair/index.html",    base: "../",  current: "pair" },
  { rel: "history/index.html", base: "../",  current: "" },
  { rel: "friends/index.html", base: "../",  current: "" }
];

let synced = 0;
for (const h of HAND_PAGES){
  const file = path.join(DOCS, h.rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  const re = /^([ \t]*)<nav class="sitenav"[\s\S]*?<\/nav>/m;
  const m = before.match(re);
  if (!m){ console.warn(`  ! ${h.rel} に <nav class="sitenav"> がありません`); continue; }
  const indent = m[1];
  const nav = siteNavHTML(h.base, h.current).split("\n").map(l => indent + l).join("\n");
  const after = before.replace(re, nav);
  if (after !== before){ fs.writeFileSync(file, after); synced++; }
}
console.log(`手書きページのサイト内リンクを同期しました: ${HAND_PAGES.length} 枚（書き換え ${synced} 枚）`);

/* ---- 手書きページの共通注記も、OWN_NOTE から流し込む ----
   4文字コードを見せるページには全部出す。手書きの5枚は生成物ではないので、
   ここで <p class="disclaimer own-note"> を上書きし、無ければ sitenav の直前に足す。
   文言の二重管理をなくすため、手でこの段落を書き換えないこと。
   MBTI® の打消し（TM_NOTE）はここには流さない。言及するページだけに置く。 */
{
  const re = /^([ \t]*)<p class="disclaimer (?:tm|own)-note">[\s\S]*?<\/p>[ \t]*$/m;
  let put = 0;
  for (const h of HAND_PAGES){
    const file = path.join(DOCS, h.rel);
    if (!fs.existsSync(file)) continue;
    const before = fs.readFileSync(file, "utf8");
    let after;
    const m = before.match(re);
    if (m){
      after = before.replace(re, m[1] + ownNoteHTML(h.base));
    } else {
      const nav = /^([ \t]*)<nav class="sitenav"/m;
      const n = before.match(nav);
      if (!n){ console.warn(`  ! ${h.rel} に共通注記を入れる場所がありません`); continue; }
      after = before.replace(nav, n[1] + ownNoteHTML(h.base) + "\n" + n[1] + '<nav class="sitenav"');
    }
    if (after !== before){ fs.writeFileSync(file, after); put++; }
  }
  console.log(`手書きページの共通注記を同期しました: ${HAND_PAGES.length} 枚（書き換え ${put} 枚）`);
}

/* ---- 共通パーツの欠けを、ビルドのたびに知らせる ----
   パンくず・見出しブロック・サイト内リンクは、手で足すページがあるぶん抜けやすい。
   実際に about / pair / friends に抜けがあった。黙って通さない。 */
{
  const skip = new Set(["quiz/index.html"]);          /* 90問に集中する画面。導線を置かない */
  const noCrumb = new Set(["index.html"]);            /* トップは現在地そのもの */
  const walk = (d = "") => fs.readdirSync(path.join(DOCS, d), { withFileTypes: true })
    .flatMap(e => {
      const r = d ? d + "/" + e.name : e.name;
      if (e.isDirectory()) return (e.name === "images" || e.name === "assets") ? [] : walk(r);
      return e.name.endsWith(".html") ? [r] : [];
    });
  const warn = [];
  for (const rel of walk()){
    if (skip.has(rel)) continue;
    const html = fs.readFileSync(path.join(DOCS, rel), "utf8");
    const lack = [];
    if (!noCrumb.has(rel) && !html.includes('class="crumb"')) lack.push("パンくず");
    if (!/class="page-head|class="res-head|class="fv-copy/.test(html)) lack.push("見出しブロック");
    if (!html.includes('class="sitenav"')) lack.push("サイト内リンク");
    if (!html.includes('class="disclaimer own-note"')) lack.push("独自性の注記");
    if (lack.length) warn.push(`  ! ${rel} … ${lack.join(" / ")} が無い`);
  }
  if (warn.length){ console.warn("共通パーツの欠け:"); warn.forEach(w => console.warn(w)); }
  else console.log("共通パーツ（パンくず・見出し・サイト内リンク・独自性の注記）の欠けはありません");
}

/* ---- sitemap の lastmod ----
   ビルドした日ではなく「そのURLの中身が最後に変わった日」を出す。
   全URLが毎回今日になっていると、どれが本当に変わったのかを伝えられない。
   ?v= はビルドのたびに変わるので、ハッシュを取る前に落とす。 */
const LM = path.join(ROOT, "lastmod.json");
let lm = {};
try { lm = JSON.parse(fs.readFileSync(LM, "utf8")); } catch(e){}

function today(){
  const d = new Date(), p2 = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
}
function stable(s){ return String(s).replace(/\?v=[a-f0-9]{8}/g, ""); }
function hashOf(s){ return crypto.createHash("md5").update(stable(s)).digest("hex").slice(0, 12); }

/* 手で書いているページ。生成物ではないので、ファイルの中身からハッシュを取る */
const STATIC = [
  { rel: "index.html",       loc: ORIGIN + "/",       pri: "1.0" },
  { rel: "pair/index.html",  loc: ORIGIN + "/pair/",  pri: "0.6" },
  { rel: "about/index.html", loc: ORIGIN + "/about/", pri: "0.4" }
];

const all = [
  ...STATIC.map(s => ({ loc: s.loc, pri: s.pri, src: fs.readFileSync(path.join(DOCS, s.rel), "utf8") })),
  ...pages.map(p => ({ loc: p.loc, pri: p.pri, src: p.html }))
];

const now = today();
let moved = 0;
const urls = all.map(u => {
  const h = hashOf(u.src);
  const prev = lm[u.loc];
  if (!prev || prev.hash !== h){ lm[u.loc] = { hash: h, date: now }; moved++; }
  return { loc: u.loc, pri: u.pri, lastmod: lm[u.loc].date };
});

/* 消えたURLは持ち越さない */
const live = new Set(urls.map(u => u.loc));
for (const k of Object.keys(lm)) if (!live.has(k)) delete lm[k];
fs.writeFileSync(LM, JSON.stringify(lm, null, 2) + "\n");

urls.sort((a, b) => (b.pri === a.pri ? a.loc.localeCompare(b.loc) : Number(b.pri) - Number(a.pri)));
fs.writeFileSync(path.join(DOCS, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.pri}</priority></url>`).join("\n")}
</urlset>
`);
console.log(`sitemap.xml を更新しました: ${urls.length} URL（うち中身が変わったもの ${moved} 件 → lastmod を ${now} に）`);
