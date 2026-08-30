/* docs/ の HTML が読み込む CSS / JS に、内容ハッシュの ?v= を付け直す
   使い方: node tools/stamp-assets.js   （push の前に実行する）

   GitHub Pages は CSS/JS を長めにキャッシュするため、ファイル名が同じだと
   ブラウザが古い版を使い続ける。中身が変わったときだけ ?v= が変わるので、
   変更したファイルだけ確実に再取得される。 */
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const DOCS = path.join(__dirname, "..", "docs");
const hashCache = new Map();

function hashOf(rel){
  if (hashCache.has(rel)) return hashCache.get(rel);
  const file = path.join(DOCS, rel);
  if (!fs.existsSync(file)) return null;
  const h = crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
  hashCache.set(rel, h);
  return h;
}

/* assets/xxx.css / assets/xxx.js / assets/xxx.svg を対象にする */
const RE = /(assets\/[A-Za-z0-9_\-.]+\.(?:css|js|svg))(\?v=[a-f0-9]+)?/g;

function stamp(fileRel){
  const file = path.join(DOCS, fileRel);
  const before = fs.readFileSync(file, "utf8");
  let changed = 0;
  const after = before.replace(RE, (m, p) => {
    const h = hashOf(p);
    if (!h) return m;
    const next = p + "?v=" + h;
    if (next !== m) changed++;
    return next;
  });
  if (after !== before){ fs.writeFileSync(file, after); }
  return changed;
}

/* docs/ 以下の HTML をすべて集める（/t/<CODE>/index.html・/pair/index.html を含む） */
function htmlFiles(dir = ""){
  const out = [];
  for (const e of fs.readdirSync(path.join(DOCS, dir), { withFileTypes: true })){
    const rel = dir ? dir + "/" + e.name : e.name;
    if (e.isDirectory()){
      if (e.name === "images" || e.name === "assets") continue;
      out.push(...htmlFiles(rel));
    } else if (e.name.endsWith(".html")) out.push(rel);
  }
  return out;
}

let total = 0, files = 0;
/* settings.js 自身が logo*.svg を参照しているので先に処理し、
   そのあとハッシュを取り直してから HTML を処理する（順序が重要） */
total += stamp("assets/settings.js");
hashCache.clear();
for (const f of htmlFiles()){
  const n = stamp(f);
  total += n; files++;
}
console.log(`HTML ${files} ファイルを走査し、${total} 件のURLを更新しました。`);
console.log(total ? "完了。docs/ をコミットして push してください。" : "変更なし（すべて最新）。");
