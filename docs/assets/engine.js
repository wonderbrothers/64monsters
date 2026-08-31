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

  /* --- 出題順：6軸をラウンドロビンで交互に出す（連続する類似設問を避ける） --- */
  var byAxis = {};
  AXES.forEach(function(a){ byAxis[a.key] = []; });
  Q.forEach(function(q, i){ byAxis[q.axis].push(i); });
  var ORDER = [];
  for (var r = 0; r < 15; r++) AXES.forEach(function(a){ ORDER.push(byAxis[a.key][r]); });

  /* ---------- 途中保存 ---------- */
  function save(st){
    return lsSet(KEY, JSON.stringify({ v:QV, a:st.answers, p:st.pos, t:st.ms, m:st.mile }));
  }
  function load(){
    try {
      var s = ls(KEY); if (!s) return null;
      var d = JSON.parse(s);
      /* 設問が入れ替わったあとの古い回答は、番号がずれるので使わない */
      if (!d || d.v !== QV || !Array.isArray(d.a) || d.a.length !== Q.length){ clearSave(); return null; }
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
    KEY:KEY, QV:QV, ORDER:ORDER, TOTAL:Q.length,
    track:track, save:save, load:load, clearSave:clearSave,
    getMyType:getMyType, setMyType:setMyType, getLast:getLast, setLast:setLast,
    score:score, codeFrom:codeFrom
  };
})(window);
