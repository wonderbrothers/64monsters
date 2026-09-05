/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
/* ===== 64モンスターズ — ヒストリー（/history/）=====
   受けるたびの記録を時系列で見る。数値は生スコア（-30〜+30）を主にする。
   割合（0〜100）は導出値なので、括弧で添えるだけにとどめる。 */
(function(){
  "use strict";
  var AXES = window.AXES, SUB = window.SUBTYPES, BASE = window.BASE_TYPES;
  var R = window.RENDER, E = window.ENGINE;
  var B = window.SITE_BASE || "";
  var $ = function(id){ return document.getElementById(id); };

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
    });
  }
  function fmtDate(t){
    var d = new Date(t), p = function(n){ return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) +
           " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function fmtMin(sec){
    if (!sec && sec !== 0) return "—";
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + "分" + (s < 10 ? "0" : "") + s + "秒";
  }
  function signed(n){ return (n > 0 ? "+" : "") + n; }
  /* 表示は極の名前＋大きさ。「外向 −9」は「外向が9足りない」と読まれるので符号を出さない。
     signed() は書き出しの互換のために残す。 */
  function poleAbs(a, v){ return v === 0 ? "0" : (v > 0 ? a.pos.name : a.neg.name) + " " + Math.abs(v); }

  /* ---------- サマリー ---------- */
  function renderTiles(h){
    var first = h[0], last = h[h.length - 1];
    var codes = {};
    h.forEach(function(r){ codes[r.code] = (codes[r.code] || 0) + 1; });
    var uniq = Object.keys(codes).length;
    var days = Math.max(0, Math.round((last.t - first.t) / 86400000));
    var b = BASE[last.code.split("-")[0]];
    $("tiles").innerHTML =
      tile("受けた回数", h.length, "回") +
      tile("出たコード", uniq, "通り") +
      tile("記録した期間", days, "日") +
      '<div class="htile htile-wide">' +
        '<p class="ht-k">最新</p>' +
        '<a class="ht-last" href="' + B + "t/" + last.code + '/">' +
          '<span class="thumb"><img src="' + R.thumb(B, last.code) + '" alt="" loading="lazy"></span>' +
          '<span class="ht-txt"><span class="ht-code mono">' + esc(last.code) + '</span>' +
          '<span class="ht-lab">' + esc(SUB[last.code].label) + '</span>' +
          '<span class="ht-when">' + fmtDate(last.t) + '</span></span>' +
        '</a>' +
      '</div>';
  }
  function tile(k, v, unit){
    return '<div class="htile"><p class="ht-k">' + k + '</p>' +
      '<p class="ht-v"><span class="mono">' + v + '</span><span class="ht-u">' + unit + '</span></p></div>';
  }

  /* ---------- 軸ごとのばらつき ----------
     少ない回数でも読めるように、折れ線ではなく点の並び（ドットストリップ）にする。
     位置＝どちらの極に寄っているか、色＝最新のみ強調、幅＝ばらつき。 */
  function renderStrips(h){
    $("strips").innerHTML = AXES.map(function(a){
      var vals = h.map(function(r){ return { v:r.sum[a.key], m:r.max[a.key] || 30, t:r.t }; })
                  .filter(function(x){ return typeof x.v === "number"; });
      if (!vals.length) return "";
      var max = vals[0].m;
      var lo = Math.min.apply(null, vals.map(function(x){ return x.v; }));
      var hi = Math.max.apply(null, vals.map(function(x){ return x.v; }));
      var latest = vals[vals.length - 1];
      var posOf = function(v){ return (v + max) / (2 * max) * 100; };
      var side = latest.v === 0 ? "" : (latest.v > 0 ? " pos" : " neg");

      var dots = vals.map(function(x, i){
        var isLast = i === vals.length - 1;
        return '<span class="sp-dot' + (isLast ? " last" + side : "") + '"' +
          ' style="left:' + posOf(x.v).toFixed(2) + '%"' +
          ' title="' + fmtDate(x.t) + '　' + poleAbs(a, x.v) + '"></span>';
      }).join("");

      var range = hi === lo ? "" :
        '<span class="sp-range" style="left:' + posOf(lo).toFixed(2) + '%;width:' +
        (posOf(hi) - posOf(lo)).toFixed(2) + '%"></span>';

      return '<div class="axstrip">' +
        '<div class="sp-top">' +
          '<span class="sp-title">' + esc(a.title) + '</span>' +
          '<span class="sp-now mono' + side + '">' + poleAbs(a, latest.v) + ' / ' + max + '</span>' +
        '</div>' +
        '<div class="sp-track">' + range + '<span class="sp-mid"></span>' + dots + '</div>' +
        '<div class="sp-ends">' +
          '<span><span class="l neg">' + a.neg.l + '</span> ' + esc(a.neg.name) + '</span>' +
          '<span class="sp-spread">' + (hi === lo ? "ばらつきなし" : "幅 " + (hi - lo)) + '</span>' +
          '<span>' + esc(a.pos.name) + ' <span class="l pos">' + a.pos.l + '</span></span>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  /* ---------- 記録の表（新しい順） ---------- */
  function renderTable(h){
    var rows = h.slice().reverse();
    var head = '<thead><tr><th>日時</th><th>コード</th>' +
      AXES.map(function(a){ return '<th class="n">' + esc(a.neg.l) + "/" + esc(a.pos.l) + '</th>'; }).join("") +
      '<th class="n">所要</th></tr></thead>';
    var body = "<tbody>" + rows.map(function(r){
      return "<tr>" +
        '<td class="mono t">' + fmtDate(r.t) + "</td>" +
        '<td><a class="mono hcode" href="' + B + "t/" + r.code + '/">' + esc(r.code) + "</a></td>" +
        AXES.map(function(a){
          var v = r.sum[a.key], m = r.max[a.key] || 30;
          var cls = v === 0 ? "" : (v > 0 ? " pos" : " neg");
          return '<td class="n mono' + cls + '">' + poleAbs(a, v) + "</td>";
        }).join("") +
        '<td class="n mono">' + fmtMin(r.sec) + "</td>" +
      "</tr>";
    }).join("") + "</tbody>";
    $("table").innerHTML = head + body;
  }

  /* ---------- 書き出し・読み込み ---------- */
  function download(){
    var h = E.getHistory();
    var out = {
      app: "64monsters", kind: "history", version: 1,
      exportedAt: new Date().toISOString(),
      axes: AXES.map(function(a){ return { key:a.key, title:a.title, neg:a.neg.l, pos:a.pos.l }; }),
      records: h
    };
    var blob = new Blob([JSON.stringify(out, null, 2)], { type:"application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = "64monsters-history-" + new Date().toISOString().slice(0,10) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    E.track("history_export", { records: h.length });
  }

  function merge(text, btn){
    var data;
    try { data = JSON.parse(text); } catch(e){ return say(btn, "読み込めませんでした"); }
    var incoming = Array.isArray(data) ? data : (data && data.records);
    if (!Array.isArray(incoming)) return say(btn, "形式が違います");
    var ok = incoming.filter(function(r){
      return r && typeof r.t === "number" && r.code && SUB[r.code] && r.sum;
    });
    if (!ok.length) return say(btn, "有効な記録がありません");
    /* 同じ時刻の記録は同一とみなす（二重取り込みを防ぐ） */
    var cur = E.getHistory(), seen = {};
    cur.forEach(function(r){ seen[r.t] = true; });
    var added = 0;
    ok.forEach(function(r){
      if (seen[r.t]) return;
      seen[r.t] = true;
      if (!r.max) r.max = { EI:30, SN:30, TF:30, JP:30, AO:30, HC:30 };
      cur.push(r); added++;
    });
    cur.sort(function(x, y){ return x.t - y.t; });
    E.setHistory(cur);
    /* いちばん新しい記録を「前回の結果」とマイタイプに反映する。
       別の端末で読み込んだとき、記録だけが移って表示が古いままにならないように。 */
    var code = E.syncFromHistory();   /* 追加0件でも最新に合わせ直す */
    if (code && window.SiteHeader && window.SiteHeader.refreshMyType) window.SiteHeader.refreshMyType();
    E.track("history_import", { added: added, total: cur.length });
    say(btn, added ? added + "件を追加しました" : "新しい記録はありませんでした");
    setTimeout(paint, 900);
  }
  function say(btn, msg){
    if (!btn) return;
    var orig = btn.dataset.orig || btn.textContent;
    btn.dataset.orig = orig;
    btn.textContent = msg;
    setTimeout(function(){ btn.textContent = orig; }, 2200);
  }

  /* ---------- 鑑定コード ---------- */
  function tokenMsg(text, bad){
    var el = $("tokenMsg");
    el.textContent = text;
    el.classList.toggle("bad", !!bad);
    el.classList.remove("hidden");
  }

  /* ---------- 描画 ---------- */
  function paint(){
    var h = E.getHistory();
    var has = h.length > 0;
    $("empty").classList.toggle("hidden", has);
    $("body").classList.toggle("hidden", !has);
    $("foot").classList.toggle("hidden", !has);
    $("recWrap").classList.toggle("hidden", !has);   /* 表だけ隠す。貼り付け欄は残す */
    if (!has) return;
    renderTiles(h);
    renderStrips(h);
    renderTable(h);
  }

  /* ---------- 操作 ---------- */
  var pending = null;
  function pickFile(btn){
    pending = btn;
    $("importFile").click();
  }
  $("importFile").addEventListener("change", function(){
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function(){ merge(String(fr.result), pending); };
    fr.onerror = function(){ say(pending, "読み込めませんでした"); };
    fr.readAsText(f);
  });
  $("importBtn").addEventListener("click", function(){ pickFile(this); });
  $("importBtn2").addEventListener("click", function(){ pickFile(this); });
  $("exportBtn").addEventListener("click", download);

  $("tokenAdd").addEventListener("click", function(){
    var v = $("tokenIn").value;
    if (!v.trim()) return tokenMsg("鑑定コードを貼り付けてください", true);
    var r = E.decodeToken(v);
    if (!r.ok) return tokenMsg(r.reason, true);
    var cur = E.getHistory();
    for (var i = 0; i < cur.length; i++){
      if (cur[i].t === r.record.t) return tokenMsg("この記録はすでに入っています（" + r.code + "）", false);
    }
    cur.push(r.record);
    cur.sort(function(x, y){ return x.t - y.t; });
    E.setHistory(cur);
    E.syncFromHistory();
    if (window.SiteHeader && window.SiteHeader.refreshMyType) window.SiteHeader.refreshMyType();
    E.track("code_import", { monster_type: r.code });
    tokenMsg(fmtDate(r.record.t) + " の記録（" + r.code + "）を加えました", false);
    $("tokenIn").value = "";
    setTimeout(paint, 300);
  });
  $("tokenIn").addEventListener("keydown", function(e){
    if (e.key === "Enter"){ e.preventDefault(); $("tokenAdd").click(); }
  });

  /* 削除は取り返しがつかないので、2段階にする */
  $("clearBtn").addEventListener("click", function(){
    var btn = this;
    if (btn.dataset.armed !== "1"){
      btn.dataset.armed = "1";
      btn.textContent = "本当に削除する（もう一度押す）";
      btn.classList.add("armed");
      setTimeout(function(){
        if (btn.dataset.armed !== "1") return;
        btn.dataset.armed = "0";
        btn.textContent = "すべての記録を削除する";
        btn.classList.remove("armed");
      }, 5000);
      return;
    }
    E.clearHistory();
    btn.dataset.armed = "0";
    btn.textContent = "すべての記録を削除する";
    btn.classList.remove("armed");
    E.track("history_clear", {});
    paint();
  });

  paint();
  E.track("history_view", { records: E.getHistory().length });
})();
