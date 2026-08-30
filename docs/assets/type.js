/* ===== タイプ個別ページ（/t/<CODE>/）=====
   本文は静的に書き出してあるので、ここでやるのは
   「その人自身の結果として開かれたときだけの上乗せ」だけ。 */
(function(){
  "use strict";
  var KEY = "shindan64.v1";
  var CODE = window.PAGE_CODE;
  var AXES = window.AXES, BASE = window.BASE_TYPES, SUB = window.SUBTYPES;
  var $ = function(id){ return document.getElementById(id); };

  function track(name, props){
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, props || {}));
    } catch(e){}
  }
  function ls(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }

  /* ---------- 自分の結果かどうか ---------- */
  var last = null;
  try { last = JSON.parse(ls(KEY + ".last")); } catch(e){}
  var isMyResult = !!(last && last.code === CODE && last.sc);
  var sc = isMyResult ? last.sc : null;

  /* 診断直後の1回だけ quiz_complete を送る（再訪では type_view）。
     かかった秒数は設問ページから sessionStorage 経由で受け取る。 */
  var fresh = false, sec = null;
  try {
    fresh = sessionStorage.getItem(KEY + ".fresh") === CODE;
    if (fresh){
      sec = parseInt(sessionStorage.getItem(KEY + ".sec"), 10);
      sessionStorage.removeItem(KEY + ".fresh");
      sessionStorage.removeItem(KEY + ".sec");
    }
  } catch(e){}
  var ev = { monster_type: CODE, base_type: CODE.split("-")[0] };
  if (fresh && !isNaN(sec)) ev.elapsed_sec = sec;
  track(fresh ? "quiz_complete" : "type_view", ev);

  /* 検索から来た人が診断へ進んだかを見るための計測 */
  Array.prototype.forEach.call(document.querySelectorAll(".res-foot2 a, .pair-cta a"), function(a){
    a.addEventListener("click", function(){
      track("cta_click", { monster_type: CODE, label: a.textContent.trim(), from_result: !!sc });
    });
  });

  /* ---------- 6軸ゲージ ---------- */
  if (sc){
    $("rEyebrow").textContent = "your type";
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

    $("tableBtn").addEventListener("click", function(){
      var hid = $("tableWrap").classList.toggle("hidden");
      this.textContent = hid ? "数値の一覧を表示" : "数値の一覧を閉じる";
    });
  }

  /* ---------- マイタイプ ---------- */
  var MYKEY = KEY + ".mytype";
  var myBtn = $("saveMyBtn");
  function paintMy(){
    var mine = ls(MYKEY) === CODE;
    myBtn.textContent = mine ? "マイタイプに登録済み" : "マイタイプに登録";
    myBtn.classList.toggle("done", mine);
  }
  paintMy();
  myBtn.addEventListener("click", function(){
    if (ls(MYKEY) === CODE) lsDel(MYKEY); else lsSet(MYKEY, CODE);
    paintMy();
  });

  /* ---------- URLコピー ---------- */
  $("copyBtn").addEventListener("click", function(){
    var btn = this, url = location.origin + location.pathname;
    navigator.clipboard.writeText(url).then(function(){
      btn.textContent = "コピーしました";
      setTimeout(function(){ btn.textContent = "URLをコピー"; }, 1800);
    }).catch(function(){ btn.textContent = "コピーできませんでした"; });
  });

  /* ---------- 一枚絵 ---------- */
  $("shareBtn").addEventListener("click", function(){
    var btn = this, orig = "結果を画像で保存";
    btn.disabled = true; btn.textContent = "画像を作っています…";
    window.SHARE.save({
      code: CODE,
      label: SUB[CODE].label,
      tagline: BASE[CODE.split("-")[0]].tagline,
      desc: SUB[CODE].desc,
      sc: sc
    }).then(function(how){
      track("share_image", { monster_type: CODE, method: how });
      btn.textContent = how === "downloaded" ? "保存しました" : orig;
      setTimeout(function(){ btn.textContent = orig; btn.disabled = false; }, 2000);
    }).catch(function(){
      btn.textContent = "画像を作れませんでした";
      setTimeout(function(){ btn.textContent = orig; btn.disabled = false; }, 2200);
    });
  });
})();
