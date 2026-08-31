/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
/* ===== 64モンスターズ — 診断の共有部分 =====
   トップ（/）と設問ページ（/quiz/）の両方が読む。
   出題順・保存・採点はここ1か所だけに置き、画面の描画は home.js / quiz.js が持つ。 */
(function(root){
  "use strict";
  var Q = root.QUESTIONS, AXES = root.AXES, SUB = root.SUBTYPES;
  var KEY = "shindan64.v1";
  var MYKEY  = KEY + ".mytype";
  var LASTKEY = KEY + ".last";
  /* 設問データの版。questions.js の並びを入れ替えたら必ず上げること。
     途中保存した回答は並びに依存しているので、版が違えば捨てる。 */
  var QV = 2;

  /* GTM（dataLayer）へのイベント送信。タグを外しても動くようにガードする */
  function track(name, props){
    try {
      root.dataLayer = root.dataLayer || [];
      root.dataLayer.push(Object.assign({ event: name }, props || {}));
    } catch(e){}
  }

  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); return true; } catch(e){ return false; } }
  function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }

  function getMyType(){ var c = ls(MYKEY); return (c && SUB[c]) ? c : null; }
  function setMyType(code){ lsSet(MYKEY, code); }

  function getLast(){
    try { var d = JSON.parse(ls(LASTKEY)); return (d && SUB[d.code]) ? d : null; } catch(e){ return null; }
  }
  function setLast(code, sc){ lsSet(LASTKEY, JSON.stringify({ code: code, sc: sc })); }

  /* ---------- 鑑定履歴 ----------
     受けるたびに1件積む。生スコア（sum）と満点（max）を残すのが肝で、
     設問数が変わっても過去の記録を正しく読めるようにしている。
     pctPos は sum と max から導けるので保存しない。 */
  var HISTKEY = KEY + ".history";
  var HIST_MAX = 300;   /* localStorage を圧迫しないための上限。古いものから捨てる */

  function getHistory(){
    try {
      var a = JSON.parse(ls(HISTKEY));
      if (!Array.isArray(a)) return [];
      return a.filter(function(r){ return r && r.t && r.code && r.sum; })
              .sort(function(x, y){ return x.t - y.t; });
    } catch(e){ return []; }
  }
  function setHistory(list){
    var a = list.slice(-HIST_MAX);
    return lsSet(HISTKEY, JSON.stringify(a));
  }
  function pushHistory(code, sc, sec){
    var sum = {}, max = {};
    AXES.forEach(function(x){ sum[x.key] = sc[x.key].sum; max[x.key] = 30; });
    var h = getHistory();
    h.push({ t: Date.now(), code: code, sec: sec, sum: sum, max: max });
    return setHistory(h);
  }
  function clearHistory(){ lsDel(HISTKEY); }

  /* 履歴の1件から、結果ページが使う形（score() と同じ）に戻す。
     pctPos・letter・tie は sum と max から導けるので保存していない。 */
  function scFromRecord(r){
    var out = {};
    AXES.forEach(function(a){
      var sum = r.sum[a.key], m = (r.max && r.max[a.key]) || 30;
      var p = pct(sum, m);
      out[a.key] = { sum:sum, pctPos:p, letter: sum > 0 ? a.pos.l : a.neg.l, tie: Math.abs(p - 50) < 4 };
    });
    return out;
  }

  /* 履歴のいちばん新しい記録を「前回の結果」とマイタイプに反映する。
     書き出したJSONを別の端末で読み込んだとき、記録だけが移って
     マイタイプと6軸ゲージが古いままになるのを防ぐ。 */
  function syncFromHistory(){
    var h = getHistory();
    if (!h.length) return null;
    var r = h[h.length - 1];
    if (!SUB[r.code] || !r.sum) return null;
    setLast(r.code, scFromRecord(r));
    setMyType(r.code);
    return r.code;
  }
  /* 生スコア → pos極の割合（0〜100） */
  function pct(sum, max){ return Math.round(((sum + max) / (2 * max)) * 100); }

  /* --- 出題順 ---
     6軸をラウンドロビンで交互に出す（似た設問を続けない）のは固定。
     そのうえで、受けるたびに「各軸の中の15問の並び」と「1周の中の軸の順番」を
     入れ替える。設問セットは同じなので測定は変わらず、順序の慣れだけが薄まる。
     ラウンドの境目で同じ軸が続かないように、先頭だけ入れ替えて避ける。 */
  var byAxis = {};
  AXES.forEach(function(a){ byAxis[a.key] = []; });
  Q.forEach(function(q, i){ byAxis[q.axis].push(i); });
  var ROUNDS = byAxis[AXES[0].key].length;   /* 各軸の問数 = 15 */

  function shuffled(arr){
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* random=false なら、以前と同じ決まった並び（古い途中保存の復元に使う） */
  function makeOrder(random){
    var pool = {};
    AXES.forEach(function(a){ pool[a.key] = random ? shuffled(byAxis[a.key]) : byAxis[a.key]; });
    var order = [], prevLast = null;
    for (var r = 0; r < ROUNDS; r++){
      var axes = random ? shuffled(AXES) : AXES.slice();
      if (random && prevLast && axes[0].key === prevLast){
        var j = 1 + Math.floor(Math.random() * (axes.length - 1));
        var t = axes[0]; axes[0] = axes[j]; axes[j] = t;
      }
      axes.forEach(function(a){ order.push(pool[a.key][r]); });
      prevLast = axes[axes.length - 1].key;
    }
    return order;
  }

  /* 保存された並びが壊れていないか（全設問がちょうど1回ずつ入っているか） */
  function validOrder(o){
    if (!Array.isArray(o) || o.length !== Q.length) return false;
    var seen = new Array(Q.length).fill(false);
    for (var i = 0; i < o.length; i++){
      var v = o[i];
      if (typeof v !== "number" || v < 0 || v >= Q.length || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }

  /* ---------- 途中保存 ---------- */
  function save(st){
    return lsSet(KEY, JSON.stringify({ v:QV, a:st.answers, p:st.pos, t:st.ms, m:st.mile, o:st.order }));
  }
  function load(){
    try {
      var s = ls(KEY); if (!s) return null;
      var d = JSON.parse(s);
      /* 設問が入れ替わったあとの古い回答は、番号がずれるので使わない */
      if (!d || d.v !== QV || !Array.isArray(d.a) || d.a.length !== Q.length){ clearSave(); return null; }
      /* 全問埋まっている保存は終わった回。途中保存として復元してはいけない */
      var done = true;
      for (var i = 0; i < d.a.length; i++){ if (d.a[i] === null){ done = false; break; } }
      if (done){ clearSave(); return null; }
      /* 並びを保存する前の途中保存も、以前と同じ並びで復元できる */
      if (!validOrder(d.o)) d.o = makeOrder(false);
      return d;
    } catch(e){ return null; }
  }
  function clearSave(){ lsDel(KEY); }

  /* ---------- 採点 ---------- */
  function score(answers){
    var sums = {}, max = {};
    AXES.forEach(function(a){ sums[a.key] = 0; max[a.key] = 0; });
    Q.forEach(function(q, i){
      var v = answers[i] === null ? 0 : answers[i];
      sums[q.axis] += v * q.dir;
      max[q.axis] += 2;
    });
    var out = {};
    AXES.forEach(function(a){
      var s = sums[a.key], m = max[a.key];
      var pctPos = Math.round(((s + m) / (2*m)) * 100);      // pos極の割合
      var letter = s > 0 ? a.pos.l : a.neg.l;
      out[a.key] = { sum:s, pctPos:pctPos, letter:letter, tie: Math.abs(pctPos - 50) < 4 };
    });
    return out;
  }
  function codeFrom(sc){
    return sc.EI.letter + sc.SN.letter + sc.TF.letter + sc.JP.letter + "-" + sc.AO.letter + "-" + sc.HC.letter;
  }

  root.ENGINE = {
    KEY:KEY, QV:QV, TOTAL:Q.length, makeOrder:makeOrder,
    track:track, save:save, load:load, clearSave:clearSave,
    getMyType:getMyType, setMyType:setMyType, getLast:getLast, setLast:setLast,
    score:score, codeFrom:codeFrom,
    getHistory:getHistory, setHistory:setHistory, pushHistory:pushHistory,
    clearHistory:clearHistory, pct:pct,
    scFromRecord:scFromRecord, syncFromHistory:syncFromHistory
  };
})(window);
