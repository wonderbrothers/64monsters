/* ===== 64タイプ性格診断 — アプリケーション ===== */
(function(){
  "use strict";
  var Q = window.QUESTIONS, AXES = window.AXES, BASE = window.BASE_TYPES, SUB = window.SUBTYPES;
  var KEY = "shindan64.v1";
  var $ = function(id){ return document.getElementById(id); };
  var THUMB = function(code){ return "images/thumbs/" + code + ".webp"; };

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
      return '<a class="thumb" href="#' + c + '" title="' + c + '"><img src="' + THUMB(c) + '" alt="' + c + '" loading="lazy"></a>';
    }).join("");
  })();

  /* ---------- 保存・復元 ---------- */
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify({ a:answers, p:pos })); } catch(e){}
  }
  function load(){
    try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch(e){ return null; }
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

  /* ---------- 相性の組み立て ---------- */
  function flip(l){ return { A:"O", O:"A", H:"C", C:"H" }[l]; }
  function partnerCode(base, ao, hc){ return base + "-" + ao + "-" + hc; }
  function matchHTML(base, ao, hc){
    var b = BASE[base];
    var groups = [
      { title:"かみ合う相手", list:b.match.best, ao:flip(ao), hc:hc,
        why:"見ている世界が補い合う組み合わせ。対人の温度が同じなので距離が縮まりやすく、決断のリズムが違うぶん、速さと慎重さを互いに預けられます。" },
      { title:"安心できる相手", list:b.match.good, ao:ao, hc:hc,
        why:"テンポも間合いも近く、説明のいらない関係になりやすい相手。長く一緒にいても疲れにくい組み合わせです。" },
      { title:"刺激をくれる相手", list:b.match.learn, ao:ao, hc:flip(hc),
        why:"価値観の置き所が違うため摩擦は起きますが、自分に足りない視点を最も速く手渡してくれる相手です。" }
    ];
    return groups.map(function(g){
      var chips = g.list.map(function(t){
        var code = partnerCode(t, g.ao, g.hc);
        return '<a class="chip" href="#' + code + '"><span class="thumb"><img src="' + THUMB(code) + '" alt="" loading="lazy"></span>' +
               '<span class="c-txt"><span class="c1">' + code + '</span><span class="c2">' + BASE[t].name + '・' + SUB[code].label + '</span></span></a>';
      }).join("");
      return '<div class="match-group"><p class="sub-h">' + g.title + '</p>' +
             '<div class="match-list">' + chips + '</div>' +
             '<p class="match-why">' + g.why + '</p></div>';
    }).join("");
  }

  /* ---------- 結果の描画 ---------- */
  function renderResult(code, sc){
    var parts = code.split("-"), base = parts[0], ao = parts[1], hc = parts[2];
    var b = BASE[base], s = SUB[code];

    $("rThumb").src = THUMB(code);
    $("rThumb").alt = b.name + "（" + s.label + "）のキャラクター";
    $("rCode").innerHTML = '<span class="base">' + base + '</span><span class="dash">-</span><span class="sub">' + ao +
                           '</span><span class="dash">-</span><span class="sub">' + hc + '</span>';
    $("rName").textContent = b.name;
    $("rTag").textContent = b.tagline;
    $("rLabel").textContent = s.label;
    $("rSummary").textContent = b.summary;
    $("rSubDesc").textContent = s.desc;

    /* 6軸ゲージ（発散型・中央が均衡点） */
    if (sc){
      $("secGauge").classList.remove("hidden");
      $("gauges").innerHTML = AXES.map(function(a){
        var d = sc[a.key], right = d.pctPos > 50, pct = right ? d.pctPos : 100 - d.pctPos;
        var w = Math.abs(d.pctPos - 50), left = right ? 50 : d.pctPos;
        return '<div class="gauge">' +
          '<div class="g-top"><span class="g-title">' + a.title + '</span>' +
          '<span class="g-pct">' + pct + '%' + (d.tie ? '（ほぼ拮抗）' : '') + '</span></div>' +
          '<div class="g-track"><div class="g-fill ' + (right ? "right" : "left") + '" style="left:' + left + '%;width:' + w + '%"></div></div>' +
          '<div class="g-poles">' +
            '<span class="g-pole left' + (right ? "" : " on") + '"><span class="l">' + a.neg.l + '</span>' + a.neg.name + '</span>' +
            '<span class="g-pole right' + (right ? " on" : "") + '">' + a.pos.name + '<span class="l">' + a.pos.l + '</span></span>' +
          '</div></div>';
      }).join("");
      $("tableWrap").innerHTML = '<table class="scoretable"><thead><tr><th>軸</th><th>判定</th><th style="text-align:right">スコア</th><th style="text-align:right">傾向の強さ</th></tr></thead><tbody>' +
        AXES.map(function(a){
          var d = sc[a.key], p = d.pctPos > 50 ? d.pctPos : 100 - d.pctPos;
          return '<tr><td>' + a.title + '（' + a.neg.l + '/' + a.pos.l + '）</td><td class="mono">' + d.letter +
                 '</td><td class="n">' + (d.sum > 0 ? "+" : "") + d.sum + ' / ±30</td><td class="n">' + p + '%</td></tr>';
        }).join("") + '</tbody></table>';
    } else {
      $("secGauge").classList.add("hidden");
    }

    /* 2×2 マトリクス */
    var cells = "";
    cells += '<div class="hd"></div><div class="hd">H・温和</div><div class="hd">C・沈静</div>';
    ["A","O"].forEach(function(x){
      cells += '<div class="hd side">' + x + (x === "A" ? "・即断" : "・熟慮") + '</div>';
      ["H","C"].forEach(function(y){
        var c = base + "-" + x + "-" + y;
        cells += '<div class="cell' + (c === code ? " on" : "") + '">' +
          '<span class="thumb"><img src="' + THUMB(c) + '" alt="" loading="lazy"></span>' +
          '<div class="c-txt"><div class="c-code">' + c + '</div><div class="c-lab">' + SUB[c].label + '</div></div></div>';
      });
    });
    $("matrix").innerHTML = cells;

    $("rStrengths").innerHTML = b.strengths.map(function(t){ return "<li>" + t + "</li>"; }).join("");
    $("rWatch").innerHTML = b.watch.map(function(t){ return "<li>" + t + "</li>"; }).join("");
    $("rEnv").textContent = b.work.env;
    $("rRole").textContent = b.work.role;
    $("rSubWork").textContent = s.work;
    $("rJobs").innerHTML = b.work.jobs.map(function(t){ return "<span>" + t + "</span>"; }).join("");
    $("matches").innerHTML = matchHTML(base, ao, hc);

    show("result");
    window.scrollTo(0, 0);
    window.__result = { code: code, base: b, sub: s, sc: sc };
  }

  function finish(){
    var sc = score(), code = codeFrom(sc);
    clearSave();
    try { localStorage.setItem(KEY + ".last", JSON.stringify({ code: code, sc: sc })); } catch(e){}
    renderResult(code, sc);
  }

  /* ---------- 画面切り替え ---------- */
  function show(which){
    ["intro","quiz","result"].forEach(function(id){ $(id).classList.toggle("hidden", id !== which); });
  }

  /* ---------- イベント ---------- */
  $("startBtn").addEventListener("click", function(){
    answers = new Array(Q.length).fill(null); pos = 0; clearSave();
    show("quiz"); renderQuestion(); window.scrollTo(0,0);
  });
  $("resumeBtn").addEventListener("click", function(){
    if ($("resumeBtn").dataset.mode === "last"){
      var L = null;
      try { L = JSON.parse(localStorage.getItem(KEY + ".last")); } catch(e){}
      if (L && SUB[L.code]) renderResult(L.code, L.sc);
      return;
    }
    var d = load(); if (!d) return;
    answers = d.a; pos = d.p; show("quiz"); renderQuestion(); window.scrollTo(0,0);
  });
  $("backBtn").addEventListener("click", function(){
    if (pos > 0){ pos--; renderQuestion(); window.scrollTo(0,0); }
  });
  $("againBtn").addEventListener("click", function(){
    location.hash = ""; answers = new Array(Q.length).fill(null); pos = 0; clearSave();
    show("intro"); window.scrollTo(0,0);
  });
  $("tableBtn").addEventListener("click", function(){
    var w = $("tableWrap"), hid = w.classList.toggle("hidden");
    this.textContent = hid ? "数値の一覧を表示" : "数値の一覧を閉じる";
  });
  $("copyBtn").addEventListener("click", function(){
    var r = window.__result; if (!r) return;
    var txt = "【64タイプ性格診断】\n" + r.code + "　" + r.base.name + "／" + r.sub.label + "\n" +
              r.base.tagline + "\n\n" + r.sub.desc;
    var btn = this;
    navigator.clipboard.writeText(txt).then(function(){
      btn.textContent = "コピーしました"; setTimeout(function(){ btn.textContent = "結果をコピー"; }, 1800);
    }).catch(function(){ btn.textContent = "コピーできませんでした"; });
  });
  document.addEventListener("keydown", function(e){
    if ($("quiz").classList.contains("hidden")) return;
    var i = ["1","2","3","4","5"].indexOf(e.key);
    if (i >= 0){ answer(VALS[i]); }
    else if (e.key === "ArrowLeft" && pos > 0){ pos--; renderQuestion(); }
  });

  /* ---------- 起動 ---------- */
  function hashCode(){
    return decodeURIComponent(location.hash.replace("#","")).toUpperCase();
  }
  window.addEventListener("hashchange", function(){
    var h = hashCode();
    if (SUB[h]) renderResult(h, null);
    else if (h === "" && $("quiz").classList.contains("hidden")) show("intro");
  });
  (function init(){
    var h = hashCode();
    if (SUB[h]){ renderResult(h, null); return; }
    var d = load();
    if (d && d.p > 0){
      $("resumeBtn").dataset.mode = "resume";
      $("resumeBtn").textContent = "途中から再開する（" + (d.p + 1) + "問目）";
      $("resumeBtn").classList.remove("hidden");
      return;
    }
    var L = null;
    try { L = JSON.parse(localStorage.getItem(KEY + ".last")); } catch(e){}
    if (L && SUB[L.code]){
      $("resumeBtn").dataset.mode = "last";
      $("resumeBtn").textContent = "前回の結果を見る（" + L.code + "）";
      $("resumeBtn").classList.remove("hidden");
    }
  })();
})();
