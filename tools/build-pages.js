/* 64タイプの個別ページ docs/t/<CODE>/index.html を生成する
   使い方: node tools/build-pages.js

   解説文の実体は docs/assets/types.js の1か所だけ。ここではそれを読んで
   HTML に焼き付ける。types.js を編集したら、このスクリプトを再実行すること。 */
const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const ORIGIN = "https://64monsters.wonder-bros.com";
const GTM = "GTM-PDKDBFBW";

/* ---- types.js / render.js をそのまま読み込む（二重管理を避ける） ---- */
const sandbox = { window: {}, document: undefined };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
["assets/types.js", "assets/render.js"].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(DOCS, f), "utf8"), sandbox, { filename: f });
});
const W = sandbox.window;
const { BASE_TYPES: BASE, SUBTYPES: SUB, RENDER: R } = W;
const CODES = Object.keys(SUB);

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function page(code){
  const [bt, ao, hc] = code.split("-");
  const b = BASE[bt], s = SUB[code], base = "../../";
  const title = `${s.label}（${code}）｜64モンスターズ`;
  const desc  = clip(`${b.tagline}。${s.desc}`, 118);
  const url   = `${ORIGIN}/t/${code}/`;
  const ogimg = `${ORIGIN}/images/ogp/${code}.jpg`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url,
    inLanguage: "ja",
    description: desc,
    primaryImageOfPage: { "@type": "ImageObject", contentUrl: ogimg },
    isPartOf: { "@type": "WebSite", name: "64モンスターズ", url: ORIGIN + "/" },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "64モンスターズ", item: ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: "モンスターギャラリー", item: ORIGIN + "/types.html" },
        { "@type": "ListItem", position: 3, name: s.label, item: url }
      ]
    }
  };

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
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="WONDER BROTHERS INC.">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15181B" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">

<!-- OGP / Twitter -->
<meta property="og:type" content="article">
<meta property="og:site_name" content="64モンスターズ">
<meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ogimg}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(s.label)}（${code}）">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogimg}">

<link rel="icon" href="${base}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/png" sizes="32x32" href="${base}favicon-32.png" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/png" sizes="32x32" href="${base}favicon-dark-32.png" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" sizes="192x192" href="${base}favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="${base}apple-touch-icon.png">
<link rel="manifest" href="${base}site.webmanifest">

<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${base}assets/style.css">
<script>
/* 表示設定を描画前に反映（ちらつき防止） */
(function(){try{var d=document.documentElement,t=localStorage.getItem("shindan64.v1.theme"),f=localStorage.getItem("shindan64.v1.fs");if(t!=="dark"&&t!=="light"){t=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";}d.setAttribute("data-theme",t);d.setAttribute("data-fs",(f==="s"||f==="l")?f:"m");}catch(e){}})();
window.SITE_BASE = "${base}";
window.PAGE_CODE = "${code}";
</script>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->

<section id="result">
  <div class="wrap">
  <div class="res-head">
    <div class="hero"><span class="thumb"><img id="rThumb" src="${base}images/thumbs/${code}.webp" alt="${esc(b.name)}（${esc(s.label)}）のキャラクター" width="440" height="440"></span></div>
    <p class="eyebrow" id="rEyebrow">monster type</p>
    <p class="code" id="rCode"><span class="base">${bt}</span><span class="dash">-</span><span class="sub">${ao}</span><span class="dash">-</span><span class="sub">${hc}</span></p>
    <h1 class="res-label">${esc(s.label)}</h1>
    <p class="res-tag">${esc(b.tagline)}</p>
  </div>

  <div class="sec split hidden" id="secGauge">
    <h2>6軸のスコア</h2>
    <div class="gauges" id="gauges"></div>
    <button class="tablebtn" id="tableBtn">数値の一覧を表示</button>
    <div id="tableWrap" class="hidden"></div>
  </div>

  <div class="sec split">
    <h2>あなたという人</h2>
    <p class="body-text">${esc(b.summary)}</p>
    <p class="body-text">${esc(s.desc)}</p>
  </div>

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

  <div class="sec split">
    <h2>仕事での適性</h2>
    <div class="cols">
      <div><p class="sub-h">力を発揮する環境</p><p class="body-text">${esc(b.work.env)}</p></div>
      <div><p class="sub-h">向いている役割</p><p class="body-text">${esc(b.work.role)}</p></div>
    </div>
    <p class="body-text" style="margin-top:22px">${esc(s.work)}</p>
    <div class="jobs">${b.work.jobs.map(t => "<span>" + esc(t) + "</span>").join("")}</div>
  </div>

  <div class="sec split">
    <h2>相性</h2>
    <div>${R.matchHTML(base, code)}</div>
    <div class="pair-cta">
      <p class="pair-cta-txt">相手のコードがわかれば、2人の相性をこの場で見られます。</p>
      <a class="btn" href="${base}pair/?a=${code}">この人との相性を調べる</a>
    </div>
  </div>

  <div class="res-foot">
    <button class="btn" id="shareBtn">結果を画像で保存</button>
    <button class="btn ghost" id="saveMyBtn" data-code="${code}">マイタイプに登録</button>
    <button class="btn ghost" id="copyBtn">URLをコピー</button>
  </div>
  <div class="res-foot2">
    <a class="btn ghost" href="${base}quiz/">90問の診断を受ける</a>
    <a class="btn ghost" href="${base}types.html">モンスターギャラリー</a>
  </div>

  <p class="disclaimer">
    この診断は、回答時点での自己認識を6つの軸で整理したものです。人の性格は状況や時期によって変わります。
  </p>

  <p class="notice-link"><a href="${base}about/">この診断についての注意（回答の扱い・外部への通信・権利）</a></p>

  <p class="copy">© 2026 <a class="copy-link" href="https://wonder-bros.com" target="_blank" rel="noopener noreferrer">WONDER BROTHERS INC.</a> All rights reserved.</p>
  </div>
</section>

<canvas id="shareCanvas" width="1080" height="1080" class="sr-only"></canvas>

<script src="${base}assets/types.js"></script>
<script src="${base}assets/render.js"></script>
<script src="${base}assets/share.js"></script>
<script src="${base}assets/type.js"></script>
<script src="${base}assets/settings.js"></script>
</body>
</html>
`;
}

/* ---- 書き出し ---- */
let n = 0;
for (const code of CODES){
  const dir = path.join(DOCS, "t", code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(code));
  n++;
}
console.log(`個別ページを生成しました: ${n} 枚 → docs/t/<CODE>/index.html`);

/* ---- sitemap ---- */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: ORIGIN + "/", pri: "1.0" },
  { loc: ORIGIN + "/types.html", pri: "0.8" },
  { loc: ORIGIN + "/pair/", pri: "0.6" },
  { loc: ORIGIN + "/about/", pri: "0.4" },
  ...CODES.map(c => ({ loc: `${ORIGIN}/t/${c}/`, pri: "0.7" }))
];
fs.writeFileSync(path.join(DOCS, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join("\n")}
</urlset>
`);
console.log(`sitemap.xml を更新しました: ${urls.length} URL`);
