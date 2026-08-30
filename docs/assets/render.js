/* ===== 共有レンダラ =====
   ブラウザと Node（tools/build-pages.js）の両方から読み込んで使う。
   1つのロジックで、個別ページの静的HTMLと画面上の描画の両方を作るための土台。

   base … そのページから docs/ 直下までの相対プレフィックス
           ルート直下のページ  → ""
           /t/CODE/ のページ   → "../../"
           /pair/ のページ     → "../"                                     */
(function(root){
  "use strict";

  function thumb(base, code){ return base + "images/thumbs/" + code + ".webp"; }
  function typeUrl(base, code){ return base + "t/" + code + "/"; }
  function pairUrl(base, a, b){ return base + "pair/?a=" + a + (b ? "&b=" + b : ""); }
  function flip(l){ return { A:"O", O:"A", H:"C", C:"H" }[l]; }

  /* 4つのサブタイプの位置関係（2×2） */
  function matrixHTML(base, code){
    var SUB = root.SUBTYPES, bt = code.split("-")[0];
    var cells = '<div class="hd"></div><div class="hd">H・信頼</div><div class="hd">C・慎重</div>';
    ["A","O"].forEach(function(x){
      cells += '<div class="hd side">' + x + (x === "A" ? "・確信" : "・揺らぎ") + '</div>';
      ["H","C"].forEach(function(y){
        var c = bt + "-" + x + "-" + y;
        cells += '<a class="cell' + (c === code ? " on" : "") + '" href="' + typeUrl(base, c) + '">' +
          '<span class="thumb"><img src="' + thumb(base, c) + '" alt="" loading="lazy"></span>' +
          '<span class="c-txt"><span class="c-code">' + c + '</span><span class="c-lab">' + SUB[c].label + '</span></span></a>';
      });
    });
    return cells;
  }

  /* 相性。基本タイプの相性リストに A/O・H/C の組み合わせルールを掛けて64タイプ表記にする */
  function matchGroups(code){
    var BASE = root.BASE_TYPES;
    var p = code.split("-"), bt = p[0], ao = p[1], hc = p[2], b = BASE[bt];
    return [
      { title:"かみ合う相手", list:b.match.best, ao:flip(ao), hc:hc,
        why:"見ている世界が補い合う組み合わせ。人への構えが同じなので距離の取り方で揉めにくく、自分への確信が違うぶん、迷いのなさと慎重さを互いに預けられます。" },
      { title:"安心できる相手", list:b.match.good, ao:ao, hc:hc,
        why:"テンポも間合いも近く、説明のいらない関係になりやすい相手。長く一緒にいても疲れにくい組み合わせです。" },
      { title:"刺激をくれる相手", list:b.match.learn, ao:ao, hc:flip(hc),
        why:"価値観の置き所が違うため摩擦は起きますが、自分に足りない視点を最も速く手渡してくれる相手です。" }
    ];
  }

  function matchHTML(base, code){
    var SUB = root.SUBTYPES;
    return matchGroups(code).map(function(g){
      var chips = g.list.map(function(t){
        var c = t + "-" + g.ao + "-" + g.hc;
        return '<a class="chip" href="' + typeUrl(base, c) + '"><span class="thumb"><img src="' + thumb(base, c) + '" alt="" loading="lazy"></span>' +
               '<span class="c-txt"><span class="c1">' + c + '</span><span class="c2">' + SUB[c].label + '</span></span></a>';
      }).join("");
      return '<div class="match-group"><p class="sub-h">' + g.title + '</p>' +
             '<div class="match-list">' + chips + '</div>' +
             '<p class="match-why">' + g.why + '</p></div>';
    }).join("");
  }

  /* 用途ごとの相性スコア（/pair/ 用）
     6軸それぞれについて「一致が効く／違いが効く」を用途別に重みづけし、
     追い風になっている軸の重みが全体の何割かを出す。測定値ではなく設計した重みなので、
     数値だけを出さず、必ずどの軸が効いたかを一緒に見せること。 */
  var BANDS = [
    { min:80, lab:"かなり追い風" }, { min:60, lab:"追い風" },
    { min:40, lab:"半々" },        { min:20, lab:"向かい風が多い" },
    { min:0,  lab:"ほぼ向かい風" }
  ];
  function letterMap(code){
    var p = code.split("-");
    return { EI:p[0][0], SN:p[0][1], TF:p[0][2], JP:p[0][3], AO:p[1], HC:p[2] };
  }
  function purposeScores(a, b){
    var AXES = root.AXES, PS = root.PURPOSES;
    var la = letterMap(a), lb = letterMap(b);
    return PS.map(function(P){
      var got = 0, max = 0;
      var rows = AXES.map(function(x){
        var d = P.w[x.key], same = la[x.key] === lb[x.key], ok = (d.pref === "same") === same;
        max += d.w; if (ok) got += d.w;
        return { key:x.key, title:x.title, w:d.w, ok:ok, same:same, text:ok ? d.y : d.n };
      });
      var score = Math.round(got / max * 100);
      var band = BANDS.filter(function(z){ return score >= z.min; })[0];
      return { key:P.key, title:P.title, lead:P.lead, score:score, band:band.lab, got:got, max:max, rows:rows };
    });
  }

  /* 相性の判定（/pair/ 用）。上の3グループに入っていれば その関係、なければ「並走する相手」 */
  function relation(a, b){
    var gs = matchGroups(a), bp = b.split("-"), bt = bp[0], ao = bp[1], hc = bp[2];
    for (var i = 0; i < gs.length; i++){
      var g = gs[i];
      if (g.list.indexOf(bt) >= 0 && g.ao === ao && g.hc === hc) return { key:["best","good","learn"][i], title:g.title, why:g.why, exact:true };
    }
    for (var j = 0; j < gs.length; j++){
      if (gs[j].list.indexOf(bt) >= 0) return { key:["best","good","learn"][j], title:gs[j].title, why:gs[j].why, exact:false };
    }
    return null;
  }

  root.RENDER = {
    thumb:thumb, typeUrl:typeUrl, pairUrl:pairUrl, flip:flip,
    matrixHTML:matrixHTML, matchHTML:matchHTML, matchGroups:matchGroups, relation:relation,
    purposeScores:purposeScores, letterMap:letterMap
  };
})(typeof window !== "undefined" ? window : globalThis);
