/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
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

  /* ===== 相性 =====
     以前は BASE_TYPES[].match（best/good/learn）という手書きのリストを土台にしていた。
     やめた理由: そのリストは4文字レベルの言い伝えで根拠が書けないうえ、
     このサイト自身の purposeScores と食い違っていた。全452組で測ったところ、
     「かみ合う相手」はスコア順63件中の中央値25位で、上位10位に入るものが1つも無かった。
     1番目に置いた群が、自分の計算ではいちばん低い。これは注記で説明できる話ではない。

     いまは purposeScores を唯一の土台にして、用途ごとに順位で並べる。
     重みづけは設計したものであって測定値ではないが、少なくとも内訳を開いて説明できる。
     BASE_TYPES[].match は使っていない（types.js のコメント参照）。 */

  var PURPOSE_SHORT = { love:"恋人", work:"仕事", friend:"友人" };
  var PURPOSE_LEAD  = {
    love:  "恋人としてかみ合う相手",
    work:  "仕事のパートナーとして組みやすい相手",
    friend:"友人として続きやすい相手"
  };

  /* その用途で何が効くのか。重みの大きい2軸を、PURPOSES の設計そのままに文章化する。
     code を渡すと、そのコードの上位6人がその2軸をどれだけ満たしているかを続けて出す。
     code なしだと64枚のページに同じ3文が並ぶことになるので、
     静的ページから呼ぶときは必ず code を渡すこと。 */
  function purposeWhy(i, code){
    var AXES = root.AXES, P = root.PURPOSES[i];
    var top = AXES.map(function(x){ return { key:x.key, title:x.title, w:P.w[x.key].w, pref:P.w[x.key].pref }; })
                  .sort(function(a, b){ return b.w - a.w; }).slice(0, 2);
    var head = "この用途では「" + top.map(function(t){
      return t.title + "が" + (t.pref === "same" ? "同じ" : "違う");
    }).join("」と「") + "」ことを最も重く見ています。";
    if (!code) return head;
    var both = 0;
    rankAll(code)[i].slice(0, 6).forEach(function(x){
      var rows = purposeScores(code, x.code)[i].rows;
      var hit = top.filter(function(t){
        return rows.some(function(r){ return r.key === t.key && r.ok; });
      }).length;
      if (hit === 2) both++;
    });
    return head + code + " の上位6人では、" + (
      both === 6 ? "6人ともこの2つを両方とも満たしています" :
      both === 0 ? "2つとも満たす相手はいません。片方だけで上がってきた顔ぶれです" :
      both + "人がこの2つを両方とも満たし、残りはどちらか一方です"
    ) + "。";
  }

  /* そのコード自身の6軸。相性ページの冒頭で「何を持っている人か」を先に置くために使う */
  function axisProfile(code){
    var l = letterMap(code);
    return root.AXES.map(function(x){
      var side = x.neg.l === l[x.key] ? x.neg : x.pos;
      return { key:x.key, title:x.title, letter:side.l, name:side.name, note:side.note };
    });
  }

  /* その用途で、2人のあいだで効いている軸。かみ合う側・ずれる側それぞれ重みの大きい順。
     用途ごとに pref が違うので、必ず見ている用途の index で取ること
     （以前ここで恋人の内訳を仕事・友人の節にも出していた） */
  function pairReasons(a, b, i){
    var rows = purposeScores(a, b)[i].rows;
    var by = function(f){ return rows.filter(f).sort(function(x, y){ return y.w - x.w; }); };
    return { up: by(function(r){ return r.ok; }), down: by(function(r){ return !r.ok; }) };
  }

  /* 64タイプすべてを、用途ごとに噛み合いの高い順で返す。
     自分と同じタイプを外さないこと。相手が同じタイプというのはふつうにある組み合わせで、
     /pair/ では両側に同じコードを選べる。以前ここで自分を除いていたため、
     同じコード同士を選ぶと順位が見つからず例外になっていた。
     同点は他2用途の合計、それも同じならコード順（並びを毎回同じにするため） */
  function rankAll(code){
    var codes = Object.keys(root.SUBTYPES);
    var lists = root.PURPOSES.map(function(){ return []; });
    codes.forEach(function(c){
      var ps = purposeScores(code, c);
      var total = ps.reduce(function(a, x){ return a + x.score; }, 0);
      ps.forEach(function(P, i){
        lists[i].push({ code:c, score:P.score, band:P.band, rows:P.rows, other:total - P.score });
      });
    });
    lists.forEach(function(list){
      list.sort(function(a, b){
        return (b.score - a.score) || (b.other - a.other) || (a.code < b.code ? -1 : 1);
      });
    });
    return lists;
  }

  /* ===== 4文字（16タイプ）レベルの相性 =====
     4文字の段階では A/O（自分への確信）と H/C（人への構え）が分からない。
     そこを平均して1つの数値に丸めると、このサイトの取り柄が消えるうえ、
     根拠を示さない他所の「INTJの相性」記事と同じものになる。
     なので丸めず、サブタイプの組み合わせ16通りぶんの幅をそのまま返す。

     注意: 幅の「大きさ」は全256組で同じになる（恋人31点・仕事36点・友人25点）。
     A/O と H/C の重みが4文字の中身に依存しないので当然そうなる。
     したがってページに書けるのは幅の数値ではなく、レンジの位置と、
     どの相手で評価が覆るかという顔ぶれのほう。 */
  var BAND_ORDER = ["ほとんどかみ合わない", "かみ合いにくい", "半々", "かみ合う", "よくかみ合う"];
  function bandIndex(score){
    return score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
  }

  /* a, b は4文字。用途ごとに16通りの内訳と、そのまとめを返す */
  function baseSpread(a, b){
    var SFX = ["A-H", "A-C", "O-H", "O-C"];
    return root.PURPOSES.map(function(P, i){
      var list = [];
      SFX.forEach(function(sa){
        SFX.forEach(function(sb){
          var s = purposeScores(a + "-" + sa, b + "-" + sb)[i];
          list.push({ a:a + "-" + sa, b:b + "-" + sb, score:s.score, band:s.band });
        });
      });
      list.sort(function(x, y){ return (y.score - x.score) || (x.a < y.a ? -1 : 1); });
      var hi = list[0], lo = list[list.length - 1];
      var sorted = list.map(function(x){ return x.score; }).sort(function(p, q){ return p - q; });
      var median = Math.round((sorted[7] + sorted[8]) / 2);
      /* 「覆る」= かみ合いにくい以下からかみ合う以上まで届く。中途半端な幅は数えない */
      var flips = bandIndex(lo.score) <= 1 && bandIndex(hi.score) >= 3;
      return {
        key:P.key, title:P.title, all:list,
        min:lo.score, max:hi.score, median:median,
        best:hi, worst:lo, flips:flips,
        verdict: lo.score >= 60 ? "always-up" : hi.score < 40 ? "always-down" : "mixed"
      };
    });
  }

  /* あるベースタイプから見た、16タイプぶんのまとめ（用途ごとに中央値で並べる） */
  function baseRank(a){
    var keys = Object.keys(root.BASE_TYPES);
    var rows = keys.map(function(b){ return { code:b, p:baseSpread(a, b) }; });
    return root.PURPOSES.map(function(P, i){
      return rows.slice().sort(function(x, y){
        return (y.p[i].median - x.p[i].median) || (y.p[i].max - x.p[i].max) || (x.code < y.code ? -1 : 1);
      }).map(function(r){ return { code:r.code, s:r.p[i] }; });
    });
  }

  /* 2人が、それぞれの用途で64タイプ中の何位にあたるか（/pair/ 用） */
  function standing(a, b){
    var lists = rankAll(a);
    return root.PURPOSES.map(function(P, i){
      var idx = lists[i].findIndex(function(x){ return x.code === b; });
      var hit = lists[i][idx];
      return {
        key:P.key, title:P.title, short:PURPOSE_SHORT[P.key],
        rank:idx + 1, of:lists[i].length, score:hit.score, band:hit.band
      };
    });
  }

  function chipHTML(base, code, score, self){
    var S = root.SUBTYPES;
    return '<a class="chip' + (self ? " same" : "") + '" href="' + typeUrl(base, code) + '">' +
      '<span class="thumb"><img src="' + thumb(base, code) + '" alt="" loading="lazy"></span>' +
      '<span class="c-txt"><span class="c1">' + code + (self ? '<span class="c-self">同じタイプ</span>' : '') + '</span>' +
      '<span class="c2">' + S[code].label + '</span></span>' +
      (score == null ? "" : '<span class="c-score">' + score + '</span>') + '</a>';
  }

  /* 個別ページの「相性」節。用途ごとに上位 n 件 */
  function topHTML(base, code, n){
    var lists = rankAll(code);
    return root.PURPOSES.map(function(P, i){
      var chips = lists[i].slice(0, n || 5).map(function(x){
        return chipHTML(base, x.code, x.score, x.code === code);
      }).join("");
      return '<div class="match-group" data-purpose="' + P.key + '"><p class="sub-h">' + PURPOSE_LEAD[P.key] + '</p>' +
             '<div class="match-list">' + chips + '</div>' +
             '<p class="match-why">' + purposeWhy(i, code) + '</p></div>';
    }).join("");
  }

  /* 用途ごとの相性スコア（/pair/ 用）
     6軸それぞれについて「一致が効く／違いが効く」を用途別に重みづけし、
     かみ合っている軸の重みが全体の何割かを出す。測定値ではなく設計した重みなので、
     数値だけを出さず、必ずどの軸が効いたかを一緒に見せること。 */
  var BANDS = [
    /* 段階の言い回し。「追い風／向かい風」は比喩なので、読む側が一度
       翻訳しないと意味が取れなかった（2026-09-21 たいし指摘）。
       見出しの「恋人としてかみ合う相手」と語を揃えて、そのまま読める形にする。 */
    { min:80, lab:"よくかみ合う" },   { min:60, lab:"かみ合う" },
    { min:40, lab:"半々" },           { min:20, lab:"かみ合いにくい" },
    { min:0,  lab:"ほとんどかみ合わない" }
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

  /* 相性の判定（/pair/ 用）。「どの群か」ではなく「どの用途で何位か」を返す */
  function relation(a, b){
    var st = standing(a, b);
    var best = st.slice().sort(function(x, y){ return x.rank - y.rank; })[0];
    return { purposes:st, best:best };
  }

  root.RENDER = {
    thumb:thumb, typeUrl:typeUrl, pairUrl:pairUrl, flip:flip,
    matrixHTML:matrixHTML, chipHTML:chipHTML, topHTML:topHTML,
    rankAll:rankAll, standing:standing, relation:relation, purposeWhy:purposeWhy,
    axisProfile:axisProfile, pairReasons:pairReasons,
    baseSpread:baseSpread, baseRank:baseRank, bandIndex:bandIndex, BAND_ORDER:BAND_ORDER,
    PURPOSE_SHORT:PURPOSE_SHORT, PURPOSE_LEAD:PURPOSE_LEAD,
    purposeScores:purposeScores, letterMap:letterMap
  };
})(typeof window !== "undefined" ? window : globalThis);
