/* ===== 64モンスターズ — 診断本体（イントロ＋設問）=====
   結果はタイプ個別ページ（/t/<CODE>/）に遷移して表示する。
   このファイルは「出題と採点」まで、結果の描画は type.js が担当する。 */
(function(){
  "use strict";
  var Q = window.QUESTIONS, AXES = window.AXES, BASE = window.BASE_TYPES, SUB = window.SUBTYPES;
  var R = window.RENDER;
  var KEY = "shindan64.v1";
  var MYKEY = KEY + ".mytype";
  /* 設問データの版。questions.js の内容を入れ替えたら必ず上げること。
     途中保存した回答は設問の並びに依存しているので、版が違えば捨てる。 */
  var QV = 2;
  var $ = function(id){ return document.getElementById(id); };

  /* GTM（dataLayer）へのイベント送信。タグを外しても動くようにガードする */
  function track(name, props){
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, props || {}));
    } catch(e){}
  }
  var THUMB = function(code){ return R.thumb("", code); };
  var TURL  = function(code){ return R.typeUrl("", code); };

  function getMyType(){
    try { var c = localStorage.getItem(MYKEY); return (c && SUB[c]) ? c : null; } catch(e){ return null; }
  }
  function setMyType(code){ try { localStorage.setItem(MYKEY, code); } catch(e){} }
  function clearMyType(){ try { localStorage.removeItem(MYKEY); } catch(e){} }

  /* --- 出題順：6軸をラウンドロビンで交互に出す（連続する類似設問を避ける） --- */
  var byAxis = {};
  AXES.forEach(function(a){ byAxis[a.key] = []; });
  Q.forEach(function(q, i){ byAxis[q.axis].push(i); });
  var ORDER = [];
  for (var r = 0; r < 15; r++) AXES.forEach(function(a){ ORDER.push(byAxis[a.key][r]); });

  var answers = new Array(Q.length).fill(null); // -2..2
  var pos = 0;   // ORDER のインデックス
  var LABELS = { "-2":"そう思わない", "-1":"どちらかといえば、そう思わない", "0":"どちらでもない", "1":"どちらかといえば、そう思う", "2":"そう思う" };
  var VALS = [-2,-1,0,1,2];

  /* ---------- イントロ：軸の一覧 ---------- */
  (function renderAxisList(){
    $("axisList").innerHTML = AXES.map(function(a){
      return '<div class="axis-row">' +
        '<div class="pair"><span class="l">' + a.neg.l + '</span><span class="sep"> / </span><span class="r">' + a.pos.l + '</span></div>' +
        '<div class="desc"><b>' + a.title + '</b>　' + a.neg.name + '＝' + a.neg.note + '／' + a.pos.name + '＝' + a.pos.note + '</div>' +
      '</div>';
    }).join("");
  })();

  /* ---------- イントロ：キャラクターの帯 ---------- */
  (function renderStrip(){
    var picks = ["INTJ-A-H","ENFP-A-H","ISFJ-O-H","ESTP-A-C","INFJ-O-C","ESFP-A-H","ISTP-A-C","ENFJ-O-H"];
    $("strip").innerHTML = picks.map(function(c){
      return '<a class="thumb" href="' + TURL(c) + '" title="' + c + '"><img src="' + THUMB(c) + '" alt="' + c + '" loading="lazy"></a>';
    }).join("");
  })();

  /* ---------- タイプを選ぶ（診断せずに見る） ---------- */
  var pk = { base:"INTJ", ao:"A", hc:"H" };
  (function buildPicker(){
    var my = getMyType();
    if (my){ var mp = my.split("-"); pk.base = mp[0]; pk.ao = mp[1]; pk.hc = mp[2]; }
    $("pkBase").innerHTML = Object.keys(BASE).map(function(k){
      return '<option value="' + k + '">' + k + '　' + BASE[k].name + '</option>';
    }).join("");
    function paint(){
      ["pkAO","pkHC"].forEach(function(id){
        Array.prototype.forEach.call($(id).children, function(b){
          b.classList.toggle("on", b.dataset.v === (id === "pkAO" ? pk.ao : pk.hc));
        });
      });
      var code = pk.base + "-" + pk.ao + "-" + pk.hc;
      $("pkNote").innerHTML = '<span class="mono">' + code + '</span>　' + SUB[code].label;
      $("pkGo").dataset.code = code;
    }
    $("pkBase").value = pk.base;
    $("pkBase").addEventListener("change", function(){ pk.base = this.value; paint(); });
    $("pkAO").addEventListener("click", function(e){
      var b = e.target.closest("button"); if (!b) return; pk.ao = b.dataset.v; paint();
    });
    $("pkHC").addEventListener("click", function(e){
      var b = e.target.closest("button"); if (!b) return; pk.hc = b.dataset.v; paint();
    });
    $("pkGo").addEventListener("click", function(){
      var code = this.dataset.code;
      setMyType(code);
      location.href = TURL(code);
    });
    paint();
  })();

  /* ---------- 保存・復元 ---------- */
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify({ v:QV, a:answers, p:pos })); return true; }
    catch(e){ return false; }
  }
  function load(){
    try {
      var s = localStorage.getItem(KEY); if (!s) return null;
      var d = JSON.parse(s);
      /* 設問が入れ替わったあとの古い回答は、番号がずれるので使わない */
      if (!d || d.v !== QV || !Array.isArray(d.a) || d.a.length !== Q.length){ clearSave(); return null; }
      return d;
    } catch(e){ return null; }
  }
  function clearSave(){ try{ localStorage.removeItem(KEY); }catch(e){} }

  /* ---------- 設問の描画 ---------- */
  function renderSeg(){
    var per = Math.ceil(ORDER.length / 6), html = "";
    for (var s = 0; s < 6; s++){
      var done = Math.min(Math.max(answeredCount() - s*per, 0), per);
      html += '<i><b style="width:' + (done/per*100) + '%"></b></i>';
    }
    $("seg").innerHTML = html;
  }
  function answeredCount(){
    var n = 0;
    for (var i = 0; i < ORDER.length; i++){ if (answers[ORDER[i]] !== null) n++; else break; }
    return n;
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
    if (advTimer) { clearTimeout(advTimer); advTimer = null; }
    answers[ORDER[pos]] = v;
    $("optLab").textContent = LABELS[String(v)];
    Array.prototype.forEach.call($("opts").children, function(b){
      b.classList.toggle("sel", parseInt(b.dataset.v,10) === v);
    });
    renderSeg(); save();
    advTimer = setTimeout(function(){
      advTimer = null;
      if (pos < ORDER.length - 1){ pos++; renderQuestion(); window.scrollTo(0,0); }
      else { finish(); }
    }, 190);
  }

  /* ---------- スコア計算 ---------- */
  function score(){
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
      var letter = s > 0 ? a.pos.l : (s < 0 ? a.neg.l : a.neg.l);
      out[a.key] = { sum:s, pctPos:pctPos, letter:letter, tie: Math.abs(pctPos - 50) < 4 };
    });
    return out;
  }
  function codeFrom(sc){
    return sc.EI.letter + sc.SN.letter + sc.TF.letter + sc.JP.letter + "-" + sc.AO.letter + "-" + sc.HC.letter;
  }

  /* ---------- 完了：結果ページへ ---------- */
  function finish(){
    var sc = score(), code = codeFrom(sc);
    clearSave();
    try { localStorage.setItem(KEY + ".last", JSON.stringify({ code: code, sc: sc })); } catch(e){}
    /* 遷移先で quiz_complete を1回だけ送るための目印 */
    try { sessionStorage.setItem(KEY + ".fresh", code); } catch(e){}
    setMyType(code);
    location.href = TURL(code);
  }

  /* ---------- 画面切り替え ---------- */
  function show(which){
    ["intro","quiz"].forEach(function(id){ $(id).classList.toggle("hidden", id !== which); });
  }

  /* ---------- イベント ---------- */
  $("startBtn").addEventListener("click", function(){
    $("saveNote").classList.add("hidden");
    answers = new Array(Q.length).fill(null); pos = 0; clearSave();
    track("quiz_start");
    show("quiz"); renderQuestion(); window.scrollTo(0,0);
  });
  $("resumeBtn").addEventListener("click", function(){
    if ($("resumeBtn").dataset.mode === "last"){
      var L = null;
      try { L = JSON.parse(localStorage.getItem(KEY + ".last")); } catch(e){}
      if (L && SUB[L.code]) location.href = TURL(L.code);
      return;
    }
    var d = load(); if (!d) return;
    answers = d.a; pos = d.p; show("quiz"); renderQuestion(); window.scrollTo(0,0);
  });
  $("backBtn").addEventListener("click", function(){
    if (pos > 0){ pos--; renderQuestion(); window.scrollTo(0,0); }
  });
  document.addEventListener("keydown", function(e){
    if ($("quiz").classList.contains("hidden")) return;
    var i = ["1","2","3","4","5"].indexOf(e.key);
    if (i >= 0){ answer(VALS[i]); }
    else if (e.key === "ArrowLeft" && pos > 0){ pos--; renderQuestion(); }
  });

  /* ---------- マイタイプの表示 ---------- */
  function renderMyType(){
    var code = getMyType(), box = $("myType");
    if (!code){ box.classList.add("hidden"); return; }
    var b = BASE[code.split("-")[0]], s = SUB[code];
    $("myThumb").href = TURL(code);
    $("myThumb").querySelector("img").src = THUMB(code);
    $("myThumb").querySelector("img").alt = b.name + "（" + s.label + "）";
    $("myCode").textContent = code;
    $("myName").textContent = s.label;
    $("myView").href = TURL(code);
    $("myPair").href = R.pairUrl("", code);
    box.classList.remove("hidden");
  }

  function refreshIntroButtons(){
    renderMyType();
    var btn = $("resumeBtn");
    btn.classList.add("hidden");
    var d = load();
    if (d && d.p > 0){
      btn.dataset.mode = "resume";
      btn.textContent = "途中から再開する（" + (d.p + 1) + "問目）";
      btn.classList.remove("hidden");
      return;
    }
    var L = null;
    try { L = JSON.parse(localStorage.getItem(KEY + ".last")); } catch(e){}
    if (L && SUB[L.code]){
      btn.dataset.mode = "last";
      btn.textContent = "前回の結果を見る";
      btn.classList.remove("hidden");
    }
  }

  /* 設問画面から抜けてイントロへ戻る。saved=true なら保存した旨を伝える */
  function leaveQuiz(saved){
    var ok = save();
    var n = answeredCount();
    if (saved && n > 0) track("quiz_pause", { question_no: pos + 1, answered: n });
    var note = $("saveNote");
    if (saved && n > 0 && ok){
      note.textContent = "ここまでの回答（" + n + "問）を保存しました。「途中から再開する」でこの続きから答えられます。";
      note.classList.remove("hidden");
    } else if (saved && n > 0 && !ok){
      note.textContent = "このブラウザでは回答を保存できませんでした（プライベートモードなどの可能性があります）。";
      note.classList.remove("hidden");
    } else {
      note.classList.add("hidden");
    }
    refreshIntroButtons();
    show("intro");
    window.scrollTo(0, 0);
  }

  $("myClear").addEventListener("click", function(){ clearMyType(); renderMyType(); });
  $("homeBtn").addEventListener("click", function(){ leaveQuiz(false); });
  $("pauseBtn").addEventListener("click", function(){ leaveQuiz(true); });

  (function init(){
    /* 旧URL（index.html#ENTP-A-H）で来た人を個別ページへ送る */
    var h = decodeURIComponent(location.hash.replace("#","")).toUpperCase();
    if (SUB[h]){ location.replace(TURL(h)); return; }
    refreshIntroButtons();
  })();
})();
