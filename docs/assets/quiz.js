/* ===== 64モンスターズ — 設問ページ（/quiz/）=====
   90問の出題と採点だけを受け持つ。答え終わると /t/<CODE>/ へ移動する。
   ?restart=1 で来たときは、途中保存を捨てて最初から始める。 */
(function(){
  "use strict";
  var Q = window.QUESTIONS, AXES = window.AXES;
  var R = window.RENDER, E = window.ENGINE;
  var B = window.SITE_BASE || "";
  var HOME = B || "./";
  var $ = function(id){ return document.getElementById(id); };
  var ORDER = E.ORDER;

  var LABELS = { "-2":"そう思わない", "-1":"どちらかといえば、そう思わない", "0":"どちらでもない", "1":"どちらかといえば、そう思う", "2":"そう思う" };
  var VALS = [-2,-1,0,1,2];

  var answers = new Array(Q.length).fill(null); // -2..2
  var pos = 0;        // ORDER のインデックス
  var leaving = false; // 遷移を始めたら、離脱イベントを二重に送らない

  /* ---------- 計測 ----------
     90問のどこで離脱しているか、実際に何分かかっているかを知るための計測。
     回答内容そのものは送らない。送るのは通過した問数と経過秒だけ。 */
  var MILESTONES = [0.25, 0.5, 0.75].map(function(r){ return Math.round(Q.length * r); });
  var doneMs = 0;      // 中断をまたいだ回答時間の累計
  var segStart = null; // いま回答中の区間の開始時刻
  var lastMile = 0;    // 送信済みの最大マイルストーン

  function segGo(){ if (segStart === null) segStart = Date.now(); }
  function segStop(){ if (segStart !== null){ doneMs += Date.now() - segStart; segStart = null; } }
  function elapsedSec(){ return Math.round((doneMs + (segStart === null ? 0 : Date.now() - segStart)) / 1000); }
  /* タブを離れているあいだは数えない（所要時間を実態に近づける） */
  document.addEventListener("visibilitychange", function(){
    if (document.hidden){ segStop(); persist(); } else { segGo(); }
  });

  function persist(){ return E.save({ answers:answers, pos:pos, ms:elapsedSec()*1000, mile:lastMile }); }
  function answeredCount(){
    var n = 0;
    for (var i = 0; i < ORDER.length; i++){ if (answers[ORDER[i]] !== null) n++; else break; }
    return n;
  }

  /* ---------- 描画 ---------- */
  /* 進み具合は1本の線で表す。分割すると、どこまで進んだかが読み取りにくい */
  function renderSeg(){
    var pct = answeredCount() / ORDER.length * 100;
    var el = $("seg");
    if (!el.firstChild) el.innerHTML = '<b></b>';
    el.firstChild.style.width = pct + "%";
    el.setAttribute("aria-valuenow", Math.round(pct));
  }
  function renderQuestion(){
    var qi = ORDER[pos], q = Q[qi];
    var ax = AXES.filter(function(a){ return a.key === q.axis; })[0];
    $("qAxis").textContent = ax.title;
    $("qText").textContent = q.text;
    $("qNow").textContent = pos + 1;
    $("optLab").textContent = answers[qi] === null ? "" : LABELS[String(answers[qi])];
    $("opts").innerHTML = VALS.map(function(v, i){
      var sel = answers[qi] === v ? " sel" : "";
      return '<button class="opt' + sel + '" data-v="' + v + '" aria-label="' + LABELS[String(v)] + '"><span class="k">' + (i+1) + '</span></button>';
    }).join("");
    Array.prototype.forEach.call($("opts").children, function(b){
      b.addEventListener("click", function(){ answer(parseInt(b.dataset.v, 10)); });
      b.addEventListener("mouseenter", function(){ $("optLab").textContent = LABELS[b.dataset.v]; });
      b.addEventListener("mouseleave", function(){ $("optLab").textContent = answers[ORDER[pos]] === null ? "" : LABELS[String(answers[ORDER[pos]])]; });
    });
    $("backBtn").style.visibility = pos === 0 ? "hidden" : "visible";
    renderSeg();
  }

  var advTimer = null;
  function answer(v){
    if (advTimer){ clearTimeout(advTimer); advTimer = null; }
    answers[ORDER[pos]] = v;
    $("optLab").textContent = LABELS[String(v)];
    Array.prototype.forEach.call($("opts").children, function(b){
      b.classList.toggle("sel", parseInt(b.dataset.v,10) === v);
    });
    renderSeg(); persist();
    checkMilestone();
    advTimer = setTimeout(function(){
      advTimer = null;
      if (pos < ORDER.length - 1){ pos++; renderQuestion(); window.scrollTo(0,0); }
      else { finish(); }
    }, 190);
  }

  /* 25% / 50% / 75% を通過した瞬間に1回だけ送る。
     quiz_start → 各通過 → quiz_complete をファネルとして見ると、
     何問目で人が離れているかが分かる。 */
  function checkMilestone(){
    var n = answeredCount();
    for (var i = 0; i < MILESTONES.length; i++){
      var m = MILESTONES[i];
      if (n >= m && lastMile < m){
        lastMile = m;
        E.track("quiz_progress", { question_no:m, progress_pct:Math.round(m / Q.length * 100), elapsed_sec:elapsedSec() });
        persist();
      }
    }
  }

  /* ---------- 完了：結果ページへ ---------- */
  function finish(){
    leaving = true;
    segStop();
    var sc = E.score(answers), code = E.codeFrom(sc), sec = elapsedSec();
    E.clearSave();
    E.setLast(code, sc);
    /* 遷移先で quiz_complete を1回だけ送るための目印と、かかった秒数 */
    try {
      sessionStorage.setItem(E.KEY + ".fresh", code);
      sessionStorage.setItem(E.KEY + ".sec", String(sec));
    } catch(e){}
    E.setMyType(code);
    location.href = R.typeUrl(B, code);
  }

  /* ---------- 途中でトップへ戻る ---------- */
  function leave(saved){
    if (leaving) return;
    leaving = true;
    segStop();
    var ok = persist();
    var n = answeredCount();
    if (n > 0) E.track(saved ? "quiz_pause" : "quiz_exit", {
      question_no: pos + 1, answered: n,
      progress_pct: Math.round(n / Q.length * 100),
      elapsed_sec: elapsedSec()
    });
    /* トップで「保存しました」を出すための引き継ぎ（0 なら保存できなかった） */
    if (saved && n > 0){ try { sessionStorage.setItem(E.KEY + ".paused", ok ? String(n) : "0"); } catch(e){} }
    location.href = HOME;
  }

  /* ブラウザバックやタブを閉じた場合も、回答を残して離脱として数える */
  window.addEventListener("pagehide", function(){
    if (leaving) return;
    segStop();
    persist();
    var n = answeredCount();
    if (n > 0 && n < Q.length){
      E.track("quiz_exit", {
        question_no: pos + 1, answered: n,
        progress_pct: Math.round(n / Q.length * 100),
        elapsed_sec: elapsedSec()
      });
    }
  });

  /* ---------- 操作 ---------- */
  $("backBtn").addEventListener("click", function(){
    if (pos > 0){ pos--; renderQuestion(); window.scrollTo(0,0); }
  });
  $("homeBtn").addEventListener("click", function(e){ e.preventDefault(); leave(false); });
  $("pauseBtn").addEventListener("click", function(){ leave(true); });
  document.addEventListener("keydown", function(e){
    var i = ["1","2","3","4","5"].indexOf(e.key);
    if (i >= 0){ answer(VALS[i]); }
    else if (e.key === "ArrowLeft" && pos > 0){ pos--; renderQuestion(); }
  });

  /* ---------- 開始 ---------- */
  (function init(){
    var restart = /[?&]restart=1(&|$)/.test(location.search);
    var d = restart ? null : E.load();
    if (restart) E.clearSave();
    if (d && d.p > 0){
      answers = d.a; pos = d.p; doneMs = d.t || 0; lastMile = d.m || 0;
      E.track("quiz_resume", { question_no: pos + 1, elapsed_sec: Math.round(doneMs / 1000) });
    } else {
      E.track("quiz_start", { total_questions: Q.length });
    }
    /* ?restart=1 は履歴に残さない（戻るでもう一度消えないように） */
    if (restart && history.replaceState) history.replaceState(null, "", location.pathname);
    segGo();
    renderQuestion();
  })();
})();
