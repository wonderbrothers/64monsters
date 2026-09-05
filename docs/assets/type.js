/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
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

  /* 記録（.history）から、このタイプで受けたいちばん新しい回。
     診断日の表示と鑑定コードの両方で使う。 */
  var E = window.ENGINE, rec = null;
  if (sc && E){
    var hh = E.getHistory();
    for (var hi = hh.length - 1; hi >= 0; hi--){
      if (hh[hi].code === CODE){ rec = hh[hi]; break; }
    }
  }
  function fmtDate(t){
    var d = new Date(t), p = function(n){ return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
  }
  /* 極の名前＋大きさ。符号は出さない。「外向 −9」は「外向が9足りない」と読まれる。 */
  function poleAbs(a, d){
    if (d.sum === 0) return "0 / 30";
    return (d.sum > 0 ? a.pos.name : a.neg.name) + " " + Math.abs(d.sum) + " / 30";
  }

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

  /* 検索から来た人が診断へ進んだかを見るための計測
     （下部の導線は廃止したので、残っているのは相性セクションからの誘導だけ） */
  Array.prototype.forEach.call(document.querySelectorAll(".pair-cta a"), function(a){
    a.addEventListener("click", function(){
      track("cta_click", { monster_type: CODE, label: a.textContent.trim(), from_result: !!sc });
    });
  });

  /* ---------- 全軸が拮抗したときの断り ----------
     全問おなじ答えだと、逆転項目が打ち消し合って6軸とも均衡する。
     ランダム回答でここまで揃う確率は0.2%ほどなので、ほぼ「答えが偏っていた」
     と見てよい。結果は隠さず出したうえで、読み方だけ添える。 */
  if (sc){
    var flat = AXES.every(function(a){ return sc[a.key] && sc[a.key].tie; });
    if (flat){
      $("flatNote").classList.remove("hidden");
      if (fresh) track("quiz_flat", { monster_type: CODE });
    }
  }

  /* ---------- 4文字コード：立っていない軸の文字は薄く出す ----------
     その文字は数点の差で決まっている。濃く出すと「T」が確定したように見える。 */
  if (sc){
    var sp = function(d){ return '<span' + (d.tie ? ' class="weak"' : '') + '>' + d.letter + '</span>'; };
    $("rCode").innerHTML =
      '<span class="base">' + sp(sc.EI) + sp(sc.SN) + sp(sc.TF) + sp(sc.JP) + '</span>' +
      '<span class="dash">-</span><span class="sub">' + sp(sc.AO) + '</span>' +
      '<span class="dash">-</span><span class="sub">' + sp(sc.HC) + '</span>';
    if (rec && rec.t){
      $("rDate").textContent = "診断日 " + fmtDate(rec.t) + "　この日時点のあなたです";
      $("rDate").classList.remove("hidden");
    }
  }

  /* ---------- 6軸ゲージ ---------- */
  if (sc){
    $("rEyebrow").textContent = "your type";
    $("secGauge").classList.remove("hidden");
    $("gauges").innerHTML = AXES.map(function(a){
      var d = sc[a.key], right = d.pctPos > 50, pct = right ? d.pctPos : 100 - d.pctPos;
      var w = Math.abs(d.pctPos - 50), left = right ? 50 : d.pctPos;
      return '<div class="gauge">' +
        '<div class="g-top"><span class="g-title">' + a.title + '</span>' +
        '<span class="g-pct">' + poleAbs(a, d) + (d.tie ? '<span class="g-flat">立っていない</span>' : '') + '</span></div>' +
        '<div class="g-track"><div class="g-fill ' + (right ? "right" : "left") + '" style="left:' + left + '%;width:' + w + '%"></div></div>' +
        '<div class="g-poles">' +
          '<span class="g-pole left' + (right ? "" : " on") + '"><span class="l">' + a.neg.l + '</span>' + a.neg.name + '</span>' +
          '<span class="g-pole right' + (right ? " on" : "") + '">' + a.pos.name + '<span class="l">' + a.pos.l + '</span></span>' +
        '</div></div>';
    }).join("");
    $("tableWrap").innerHTML = '<table class="scoretable"><thead><tr><th>軸</th><th>判定</th><th style="text-align:right">スコア</th></tr></thead><tbody>' +
      AXES.map(function(a){
        var d = sc[a.key];
        return '<tr><td>' + a.title + '（' + a.neg.l + '/' + a.pos.l + '）</td>' +
               '<td class="mono' + (d.tie ? ' weak' : '') + '">' + d.letter + (d.tie ? '<span class="flat">立っていない</span>' : '') +
               '</td><td class="n">' + poleAbs(a, d).replace(' / 30', '') + '</td></tr>';   /* 表は「/ 30」を省いて幅を抑える。満点は上の注記にある */
      }).join("") + '</tbody></table>';

    $("tableBtn").addEventListener("click", function(){
      var hid = $("tableWrap").classList.toggle("hidden");
      this.textContent = hid ? "数値の一覧を表示" : "数値の一覧を閉じる";
    });
  }

  /* ---------- 鑑定コード ----------
     自分の結果として開かれたときだけ出す。ギャラリーから来た人には
     6軸の数値が無く、符号化するものが無い。
     記録（.history）から、このタイプで受けたいちばん新しい回を探して使う。
     受けた日時が要るので .last だけでは作れない。 */
  if (sc && E){
    var token = rec ? E.encodeRecord(rec) : null;
    if (token){
      $("tokenOut").textContent = token;
      $("secToken").classList.remove("hidden");
      $("tokenCopy").addEventListener("click", function(){
        var btn = this;
        navigator.clipboard.writeText(token).then(function(){
          btn.textContent = "コピーしました";
          setTimeout(function(){ btn.textContent = "コピー"; }, 1800);
          track("code_copy", { monster_type: CODE, from: "result" });
        }).catch(function(){ btn.textContent = "コピーできませんでした"; });
      });
    }
  }

  /* ---------- マイタイプ ---------- */
  var MYKEY = KEY + ".mytype";
  var MYOFF = KEY + ".myoff";   /* 解除は「自分で外した」として残す（履歴から戻さないため） */
  var myBtn = $("saveMyBtn");
  function paintMy(){
    var mine = ls(MYKEY) === CODE;
    myBtn.textContent = mine ? "マイタイプに登録済み" : "マイタイプに登録";
    myBtn.classList.toggle("done", mine);
  }
  paintMy();
  /* 履歴からマイタイプが埋め直されたとき（settings.js）にも合わせる */
  document.addEventListener("mytype:change", paintMy);
  myBtn.addEventListener("click", function(){
    if (ls(MYKEY) === CODE){ lsDel(MYKEY); lsSet(MYOFF, "1"); }
    else { lsSet(MYKEY, CODE); lsDel(MYOFF); }
    paintMy();
    /* ヘッダーのマイタイプにも反映する */
    if (window.SiteHeader && window.SiteHeader.refreshMyType) window.SiteHeader.refreshMyType();
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
