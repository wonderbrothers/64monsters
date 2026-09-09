/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
/* ===== 結果の一枚絵（1080×1080）=====
   キャンバスに描いて PNG にし、共有シート（対応端末）か
   ダウンロードで持ち帰れるようにする。外部ライブラリは使わない。

   2026-09 のリデザインに合わせて、結果ページと同じ組みにしてある。
   白地・黒・2pxの罫だけで、グラデーションと影は使わない。 */
(function(){
  "use strict";

  var S = 1080, PAD = 70, BW = 2, R = 24;
  var PAPER = "#FFFFFF";
  var INK = "#111111", INK2 = "#3D4145", INK3 = "#71716D";
  var LINE2 = "#DCDCD8", SURF2 = "#F4F4F2";
  var SITE = "64monsters.wonder-bros.com";
  var STRAP = "6 AXES / 90 QUESTIONS / 64 MONSTERS";
  var FD  = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
  var FM  = '"DM Mono", "Noto Sans Mono", ui-monospace, Menlo, monospace';
  var FEN = '"Montserrat Alternates", "Noto Sans JP", sans-serif';

  function base(){ return window.SITE_BASE || ""; }

  /* Webフォントが載ってから描く（載っていないと別の書体で焼き付いてしまう） */
  function fonts(){
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('900 44px ' + FD),
      document.fonts.load('700 28px ' + FD),
      document.fonts.load('400 24px ' + FD),
      document.fonts.load('900 58px ' + FEN),
      document.fonts.load('500 22px ' + FM)
    ]).catch(function(){});
  }

  function loadImg(src){
    return new Promise(function(res, rej){
      var im = new Image();
      im.onload = function(){ res(im); };
      im.onerror = rej;
      im.src = src;
    });
  }

  /* 字送り。ctx.letterSpacing が使えない環境では1文字ずつ置く */
  function lsWidth(ctx, text, ls){
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + ls;
    return w - (text.length ? ls : 0);
  }
  function lsText(ctx, text, x, y, ls){
    if ("letterSpacing" in ctx){
      var prev = ctx.letterSpacing;
      ctx.letterSpacing = ls + "px";
      var al = ctx.textAlign;
      if (al === "center") ctx.textAlign = "left", x -= (ctx.measureText(text).width - ls) / 2;
      ctx.fillText(text, x, y);
      ctx.textAlign = al;
      ctx.letterSpacing = prev;
      return;
    }
    var al2 = ctx.textAlign; ctx.textAlign = "left";
    if (al2 === "center") x -= lsWidth(ctx, text, ls) / 2;
    else if (al2 === "right") x -= lsWidth(ctx, text, ls);
    for (var i = 0; i < text.length; i++){
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + ls;
    }
    ctx.textAlign = al2;
  }

  function rule(ctx, y, x0, x1){
    ctx.fillStyle = INK;
    ctx.fillRect(x0 === undefined ? PAD : x0, y, (x1 === undefined ? S - PAD : x1) - (x0 === undefined ? PAD : x0), BW);
  }

  /* 日本語は単語境界がないので1文字ずつ measure して折り返す */
  function wrap(ctx, text, maxW, maxLines){
    var lines = [], cur = "";
    for (var i = 0; i < text.length; i++){
      if (ctx.measureText(cur + text[i]).width > maxW && cur){
        lines.push(cur); cur = text[i];
        if (maxLines && lines.length === maxLines){ lines[maxLines-1] = lines[maxLines-1].slice(0,-1) + "…"; return lines; }
      } else {
        cur += text[i];
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* 2行になるときは、語の途中で切れて見えないようできるだけ均等な位置で折る
     （例：場を焚きつける／突破モンスター） */
  function balance(ctx, text, maxW){
    if (ctx.measureText(text).width <= maxW) return [text];
    var best = null, gap = null;
    for (var i = 2; i < text.length - 1; i++){
      var wa = ctx.measureText(text.slice(0, i)).width, wb = ctx.measureText(text.slice(i)).width;
      if (wa > maxW || wb > maxW) continue;
      var g = Math.abs(wa - wb);
      if (gap === null || g < gap){ best = [text.slice(0, i), text.slice(i)]; gap = g; }
    }
    return best || wrap(ctx, text, maxW, 2);
  }

  /* 1行に必ず収める。入らなければ入るところまで字を小さくする（切り詰めはしない） */
  function fitOneLine(ctx, text, maxW, size, min, weight, fam){
    var px = size;
    while (px > min){
      ctx.font = weight + " " + px + "px " + (fam || FD);
      if (ctx.measureText(text).width <= maxW) break;
      px -= 2;
    }
    ctx.font = weight + " " + px + "px " + (fam || FD);
    return px;
  }

  /* 写真は角丸で切り抜いて2pxの枠をつける（結果ページの .thumb と同じ） */
  function photo(ctx, im, x, y, size){
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, size, size, R); ctx.clip();
    ctx.fillStyle = SURF2; ctx.fillRect(x, y, size, size);
    ctx.drawImage(im, x, y, size, size);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = BW;
    ctx.beginPath(); ctx.roundRect(x + BW/2, y + BW/2, size - BW, size - BW, R); ctx.stroke();
  }

  /* ロゴ＋サイト名＋2pxの罫 */
  function header(ctx, logo){
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, S, S);
    /* ロゴの比率は SVG の実寸から取る（差し替えても崩れないように） */
    var lh = 34;
    if (logo){
      var lw = Math.round(lh * (logo.naturalWidth || 234) / (logo.naturalHeight || 30));
      ctx.drawImage(logo, PAD, 62 - lh / 2, lw, lh);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.font = "500 22px " + FM; ctx.fillStyle = INK3;
    ctx.fillText(SITE, S - PAD, 76);
    rule(ctx, 116);
  }

  function footer(ctx){
    ctx.textAlign = "center"; ctx.font = "500 20px " + FM; ctx.fillStyle = INK3;
    lsText(ctx, STRAP, S / 2, S - 44, 2.4);
  }

  /* 6軸のコンパクト表示（2列×3行）。結果ページのゲージと同じ形 */
  function drawAxes(ctx, sc, top){
    var AX = window.AXES;
    var colW = (S - PAD * 2 - 44) / 2;
    AX.forEach(function(a, i){
      var col = i % 2, row = (i / 2) | 0;
      var x = PAD + col * (colW + 44), y = top + row * 62;
      var d = sc[a.key];
      var right = d.pctPos > 50;
      var name = right ? a.pos.name : a.neg.name;

      ctx.textAlign = "left";
      ctx.font = "900 22px " + FEN; ctx.fillStyle = INK;
      ctx.fillText(d.letter, x, y);
      ctx.font = "400 21px " + FD; ctx.fillStyle = INK2;
      ctx.fillText(name, x + 26, y);
      ctx.textAlign = "right";
      ctx.font = "500 20px " + FM; ctx.fillStyle = INK3;
      ctx.fillText(Math.abs(d.sum) + " / 30", x + colW, y);   /* 符号も%も出さない */

      /* 中央を均衡点とする発散バー（枠2px・中心にティック） */
      var by = y + 14, bw = colW, bh = 18;
      ctx.fillStyle = SURF2;
      ctx.beginPath(); ctx.roundRect(x, by, bw, bh, 6); ctx.fill();
      var w = Math.abs(d.pctPos - 50) / 100 * bw;
      ctx.fillStyle = INK;
      ctx.fillRect(right ? x + bw / 2 : x + bw / 2 - Math.max(w, 3), by, Math.max(w, 3), bh);
      ctx.fillStyle = INK3; ctx.fillRect(x + bw / 2 - 1, by, 2, bh);
      ctx.strokeStyle = INK; ctx.lineWidth = BW;
      ctx.beginPath(); ctx.roundRect(x + BW/2, by + BW/2, bw - BW, bh - BW, 6); ctx.stroke();
    });
  }

  /* opts: { code, label, tagline, desc, sc } */
  function render(opts){
    var canvas = document.getElementById("shareCanvas");
    var ctx = canvas.getContext("2d");
    return fonts()
      .then(function(){
        return Promise.all([
          loadImg(base() + "images/thumbs/" + opts.code + ".webp"),
          loadImg(base() + "assets/logo.svg").catch(function(){ return null; })
        ]);
      })
      .then(function(r){
        var im = r[0], logo = r[1];
        ctx.clearRect(0, 0, S, S);
        header(ctx, logo);

        /* キャラクター */
        var cs = 390, cx = (S - cs) / 2, cy = 146;
        photo(ctx, im, cx, cy, cs);

        /* MONSTER TYPE → コード → 名前 → ひとこと */
        ctx.textAlign = "center";
        ctx.font = "500 20px " + FM; ctx.fillStyle = INK3;
        lsText(ctx, "MONSTER TYPE", S / 2, cy + cs + 50, 8);

        fitOneLine(ctx, opts.code, S - PAD * 2, 58, 40, "900", FEN);
        ctx.fillStyle = INK;
        ctx.fillText(opts.code, S / 2, cy + cs + 116);

        fitOneLine(ctx, opts.label, S - PAD * 2, 46, 32, "900");
        ctx.fillStyle = INK;
        ctx.fillText(opts.label, S / 2, cy + cs + 176);

        if (opts.tagline){
          fitOneLine(ctx, opts.tagline, S - PAD * 2, 24, 19, "400");
          ctx.fillStyle = INK2;
          ctx.fillText(opts.tagline, S / 2, cy + cs + 218);
        }

        rule(ctx, cy + cs + 250);

        /* 6軸、なければ説明文 */
        if (opts.sc && window.AXES){
          drawAxes(ctx, opts.sc, cy + cs + 306);
        } else if (opts.desc){
          ctx.font = "400 25px " + FD; ctx.fillStyle = INK2; ctx.textAlign = "center";
          wrap(ctx, opts.desc, S - PAD * 2 - 40, 4).forEach(function(t, i){
            ctx.fillText(t, S / 2, cy + cs + 302 + i * 44);
          });
        }

        footer(ctx);
        return new Promise(function(res){ canvas.toBlob(res, "image/png"); });
      });
  }

  /* 保存する。共有シートが使える端末ではそちらを優先する */
  function save(opts){
    return render(opts).then(function(blob){
      var name = "64monsters-" + opts.code + ".png";
      var file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })){
        return navigator.share({
          files: [file],
          text: opts.code + "　" + opts.label + "　#64モンスターズ",
          url: location.href
        }).then(function(){ return "shared"; })
         .catch(function(e){ if (e && e.name === "AbortError") return "canceled"; return download(blob, name); });
      }
      return download(blob, name);
    });
  }

  function download(blob, name){
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    return "downloaded";
  }


  /* ---------- 相性の一枚絵 ---------- */
  /* opts: { a, b, aLabel, bLabel, scores } */
  function renderPair(opts){
    var canvas = document.getElementById("shareCanvas");
    var ctx = canvas.getContext("2d");
    return fonts()
      .then(function(){
        return Promise.all([
          loadImg(base() + "images/thumbs/" + opts.a + ".webp"),
          loadImg(base() + "images/thumbs/" + opts.b + ".webp"),
          loadImg(base() + "assets/logo.svg").catch(function(){ return null; })
        ]);
      })
      .then(function(r){
        var ims = [r[0], r[1]], logo = r[2];
        ctx.clearRect(0, 0, S, S);
        header(ctx, logo);

        /* 2体を左右に */
        var cs = 400, cy = 162, xs = [PAD, S - PAD - cs];
        [opts.a, opts.b].forEach(function(code, i){
          var x = xs[i];
          photo(ctx, ims[i], x, cy, cs);

          var cxm = x + cs / 2;
          ctx.textAlign = "center";
          ctx.font = "900 26px " + FEN; ctx.fillStyle = INK;
          ctx.fillText(code, cxm, cy + cs + 48);
          ctx.font = "900 26px " + FD; ctx.fillStyle = INK;
          balance(ctx, i === 0 ? opts.aLabel : opts.bLabel, cs).forEach(function(t, k){
            ctx.fillText(t, cxm, cy + cs + 90 + k * 36);
          });
        });

        /* 中央の × */
        ctx.textAlign = "center"; ctx.font = "500 40px " + FM; ctx.fillStyle = INK3;
        ctx.fillText("×", S / 2, cy + cs / 2 + 14);

        rule(ctx, 742);

        /* 関係ごとのスコア */
        ctx.textAlign = "center";
        ctx.font = "500 20px " + FM; ctx.fillStyle = INK3;
        lsText(ctx, "COMPATIBILITY", S / 2, 786, 8);
        (opts.scores || []).slice(0, 3).forEach(function(sc, i){
          var y = 848 + i * 58;
          ctx.textAlign = "left";
          ctx.font = "700 28px " + FD; ctx.fillStyle = INK;
          ctx.fillText(sc.title, PAD + 30, y);
          ctx.textAlign = "right";
          ctx.font = "900 40px " + FEN; ctx.fillStyle = INK;
          ctx.fillText(sc.score + "%", S - PAD - 30, y + 4);
          ctx.fillStyle = LINE2; ctx.fillRect(PAD + 30, y + 20, S - PAD * 2 - 60, 1);
        });

        footer(ctx);
        return new Promise(function(res){ canvas.toBlob(res, "image/png"); });
      });
  }

  function savePair(opts){
    return renderPair(opts).then(function(blob){
      var name = "64monsters-" + opts.a + "_" + opts.b + ".png";
      var file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })){
        return navigator.share({
          files: [file],
          text: opts.a + " × " + opts.b + "　" +
                (opts.scores || []).map(function(sc){ return sc.title + " " + sc.score + "%"; }).join(" / ") +
                "　#64モンスターズ",
          url: location.href
        }).then(function(){ return "shared"; })
         .catch(function(e){ if (e && e.name === "AbortError") return "canceled"; return download(blob, name); });
      }
      return download(blob, name);
    });
  }

  window.SHARE = { render: render, save: save, renderPair: renderPair, savePair: savePair };
})();
