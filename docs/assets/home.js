/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
/* ===== 64モンスターズ — トップページ（/）=====
   軸の一覧・キャラクターの帯・タイプ選択と、設問ページ（/quiz/）への導線。
   設問そのものは quiz.js が /quiz/ で受け持つ。 */
(function(){
  "use strict";
  var AXES = window.AXES, BASE = window.BASE_TYPES, SUB = window.SUBTYPES;
  var R = window.RENDER, E = window.ENGINE;
  var B = window.SITE_BASE || "";
  var QUIZ_URL = B + "quiz/";
  var $ = function(id){ return document.getElementById(id); };
  var THUMB = function(code){ return R.thumb(B, code); };
  var TURL  = function(code){ return R.typeUrl(B, code); };

  /* ---------- 軸の一覧 ---------- */
  $("axisList").innerHTML = AXES.map(function(a){
    return '<div class="axis-row" data-ax="' + a.key + '">' +
      '<div class="pair"><span class="dot" aria-hidden="true"></span>' +
        '<span class="l">' + a.neg.l + '</span><span class="sep">/</span><span class="r">' + a.pos.l + '</span></div>' +
      '<div class="desc"><b>' + a.title + '</b>' +
        '<span class="pole"><i>' + a.neg.l + '・' + a.neg.name + '</i>' + a.neg.note + '</span>' +
        '<span class="pole"><i>' + a.pos.l + '・' + a.pos.name + '</i>' + a.pos.note + '</span>' +
      '</div>' +
    '</div>';
  }).join("");

  /* ---------- キャラクターの帯 ---------- */
  /* 16の基本タイプを1枚ずつ。絵は各タイプの A-H を代表に使い、
     押すとそのタイプのページへ行く（行き先は従来の帯と同じ /t/<CODE>/）。 */
  (function renderStrip(){
    $("strip").innerHTML = Object.keys(BASE).map(function(k){
      var code = k + "-A-H", b = BASE[k];
      return '<a class="mcard" href="' + TURL(code) + '">' +
        '<span class="thumb"><img src="' + THUMB(code) + '" alt="" loading="lazy"></span>' +
        '<span class="mbody">' +
          '<span class="mcode">' + k + '</span>' +
          '<span class="mname">' + b.name + '</span>' +
          '<span class="mtag">' + b.tagline + '</span>' +
        '</span>' +
      '</a>';
    }).join("");
  })();

  /* ---------- タイプを選ぶ（診断せずに見る） ---------- */
  (function buildPicker(){
    var pk = { base:"INTJ", ao:"A", hc:"H" };
    var my = E.getMyType();
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
      E.setMyType(code);
      location.href = TURL(code);
    });
    paint();
  })();

  /* ---------- 再開／前回の結果 ----------
     途中の回答があればそこへ、なければ前回の結果へ。どちらもなければ出さない。 */
  (function refreshResume(){
    var btn = $("resumeBtn");
    btn.classList.add("hidden");
    var d = E.load();
    if (d && d.p > 0){
      btn.href = QUIZ_URL;
      btn.textContent = "途中から再開する（" + (d.p + 1) + "問目）";
      btn.classList.remove("hidden");
      return;
    }
    var L = E.getLast();
    if (L){
      btn.href = TURL(L.code);
      btn.textContent = "前回の結果を見る";
      btn.classList.remove("hidden");
    }
  })();

  /* ---------- 「保存して中断」から戻ってきたときの案内 ---------- */
  (function showPausedNote(){
    var n = null;
    try {
      n = sessionStorage.getItem(E.KEY + ".paused");
      sessionStorage.removeItem(E.KEY + ".paused");
    } catch(e){}
    if (!n) return;
    var note = $("saveNote");
    note.textContent = n === "0"
      ? "このブラウザでは回答を保存できませんでした（プライベートモードなどの可能性があります）。"
      : "ここまでの回答（" + n + "問）を保存しました。「途中から再開する」でこの続きから答えられます。";
    note.classList.remove("hidden");
  })();

  /* 旧URL（index.html#ENTP-A-H）で来た人を個別ページへ送る */
  (function oldHash(){
    var h = decodeURIComponent(location.hash.replace("#","")).toUpperCase();
    if (SUB[h]) location.replace(TURL(h));
  })();
})();
