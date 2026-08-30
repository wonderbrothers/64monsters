/* ローカル確認用の静的サーバー（依存パッケージなし）
   使い方: npm run dev  ／  node tools/serve.js --port 5173 --no-reload

   docs/ を公開ルートとして配信する。GitHub Pages と同じく、
   ディレクトリへのアクセスは index.html を返すので /t/ENTP-A-H/ がそのまま開ける。
   キャッシュは無効。docs/ 内のファイルが変わるとブラウザを自動でリロードする。 */
const http = require("http");
const fs   = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "docs");
const args = process.argv.slice(2);
const argv = (k, def) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : def; };
const PORT   = Number(argv("--port", process.env.PORT || 5173));
const RELOAD = !args.includes("--no-reload");

const TYPES = {
  ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8",
  ".xml":"application/xml; charset=utf-8", ".txt":"text/plain; charset=utf-8",
  ".svg":"image/svg+xml", ".webp":"image/webp", ".png":"image/png",
  ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".ico":"image/x-icon",
  ".woff2":"font/woff2", ".woff":"font/woff", ".ttf":"font/ttf",
  ".webmanifest":"application/manifest+json"
};

/* ---------- 自動リロード（SSEで「変わった」とだけ伝える） ---------- */
const clients = new Set();
const SNIPPET =
  '\n<script>/* dev only */(function(){var s=new EventSource("/__reload");' +
  's.onmessage=function(){location.reload()};' +
  's.onerror=function(){setTimeout(function(){location.reload()},1000)};})()</script>\n';

if (RELOAD){
  let timer = null;
  try {
    fs.watch(ROOT, { recursive:true }, function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        clients.forEach(function(res){ res.write("data: reload\n\n"); });
      }, 120);
    });
  } catch (e) {
    console.warn("※ ファイル監視を開始できませんでした。自動リロードなしで続けます。");
  }
}

/* ---------- 配信 ---------- */
function send(res, code, body, type, extra){
  res.writeHead(code, Object.assign({
    "Content-Type": type,
    "Cache-Control": "no-store, must-revalidate"
  }, extra || {}));
  res.end(body);
}

const server = http.createServer(function(req, res){
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch(e){ return send(res, 400, "Bad Request", TYPES[".txt"]); }

  if (RELOAD && pathname === "/__reload"){
    res.writeHead(200, {
      "Content-Type":"text/event-stream", "Cache-Control":"no-store", "Connection":"keep-alive"
    });
    res.write("retry: 1000\n\n");
    clients.add(res);
    req.on("close", function(){ clients.delete(res); });
    return;
  }

  /* docs/ の外へ出る経路（..）は弾く */
  let file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden", TYPES[".txt"]);

  fs.stat(file, function(err, st){
    if (!err && st.isDirectory()){
      if (!pathname.endsWith("/")){
        res.writeHead(301, { Location: pathname + "/" }); return res.end();
      }
      file = path.join(file, "index.html");
    }
    fs.readFile(file, function(err2, buf){
      if (err2){
        const msg = "404 Not Found\n\n" + pathname +
          "\n\n個別ページが無いときは、先に `npm run build` を実行してください。";
        return send(res, 404, msg, TYPES[".txt"]);
      }
      const ext  = path.extname(file).toLowerCase();
      const type = TYPES[ext] || "application/octet-stream";
      if (RELOAD && ext === ".html"){
        let html = buf.toString("utf8");
        html = html.includes("</body>") ? html.replace("</body>", SNIPPET + "</body>") : html + SNIPPET;
        return send(res, 200, html, type);
      }
      send(res, 200, buf, type);
    });
  });
});

server.on("error", function(e){
  if (e.code === "EADDRINUSE"){
    console.error("ポート " + PORT + " は使用中です。`npm run dev -- --port 5174` のように変えてください。");
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, function(){
  console.log("");
  console.log("  64モンスターズ  ローカルサーバー");
  console.log("  http://localhost:" + PORT + "/");
  console.log("");
  console.log("  公開ルート : docs/");
  console.log("  自動リロード: " + (RELOAD ? "あり（docs/ の変更を監視）" : "なし"));
  console.log("  終了       : Ctrl + C");
  console.log("");
});
