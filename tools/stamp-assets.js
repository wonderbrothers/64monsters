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

/* ---------- フッターに出す版と「更新日」 ----------
   日付は「ビルドを回した日」ではなく「中身が最後に変わった日」にする。
   何も直していない日にビルドし直しても、日付は動かない。

   そのために docs/ の中身のハッシュを取り、前回のものと突き合わせる。
   ?v= と VERSION / BUILT の行は、ビルドのたびに変わるので取り除いてから数える
   （これを忘れると毎回ハッシュが変わり、日付が毎日動いてしまう）。
   前回の値は build-state.json に置く。これはリポジトリに入れる。 */
const STATE = path.join(__dirname, "..", "build-state.json");
const VOLATILE = [
  [/\?v=[a-f0-9]{8}/g, ""],
  [/var VERSION = "[^"]*";/g, ""],
  [/var BUILT   = "[^"]*";/g, ""]
];

function allFiles(dir = ""){
  const out = [];
  for (const e of fs.readdirSync(path.join(DOCS, dir), { withFileTypes: true })){
    const rel = dir ? dir + "/" + e.name : e.name;
    if (e.isDirectory()) out.push(...allFiles(rel));
    else out.push(rel);
  }
  return out.sort();
}

function contentHash(){
  const h = crypto.createHash("md5");
  for (const rel of allFiles()){
    let buf = fs.readFileSync(path.join(DOCS, rel));
    if (/\.(html|js|css|svg|xml|txt|json|webmanifest)$/.test(rel)){
      let t = buf.toString("utf8");
      for (const [re, to] of VOLATILE) t = t.replace(re, to);
      buf = Buffer.from(t, "utf8");
    }
    h.update(rel); h.update(buf);
  }
  return h.digest("hex").slice(0, 12);
}

function today(){
  const d = new Date(), p2 = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
}

function writeVersion(){
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const hash = contentHash();
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch(e){}

  const changed = prev.hash !== hash || prev.version !== pkg.version;
  const updated = changed ? today() : prev.updated;

  if (changed) fs.writeFileSync(STATE, JSON.stringify(
    { version: pkg.version, updated: updated, hash: hash }, null, 2) + "\n");

  const file = path.join(DOCS, "assets/settings.js");
  const before = fs.readFileSync(file, "utf8");
  const after = before
    .replace(/var VERSION = "[^"]*";/, `var VERSION = "${pkg.version}";`)
    .replace(/var BUILT   = "[^"]*";/, `var BUILT   = "${updated}";`);
  if (after !== before) fs.writeFileSync(file, after);

  return { version: pkg.version, updated: updated, changed: changed };
}
const ver = writeVersion();

let total = 0, files = 0;
/* settings.js 自身が logo*.svg を参照しているので先に処理し、
   そのあとハッシュを取り直してから HTML を処理する（順序が重要） */
total += stamp("assets/settings.js");
hashCache.clear();
for (const f of htmlFiles()){
  const n = stamp(f);
  total += n; files++;
}
console.log(ver.changed
  ? `中身が変わっています。更新日を ${ver.updated} にしました（v${ver.version}）。`
  : `中身は前回と同じです。更新日は ${ver.updated} のままです（v${ver.version}）。`);
console.log(`HTML ${files} ファイルを走査し、${total} 件のURLを更新しました。`);
console.log(total ? "完了。docs/ をコミットして push してください。" : "変更なし（すべて最新）。");
