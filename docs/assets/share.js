/* ===== 結果の一枚絵（1080×1080）=====
   キャンバスに描いて PNG にし、共有シート（対応端末）か
   ダウンロードで持ち帰れるようにする。外部ライブラリは使わない。 */
(function(){
  "use strict";

  var S = 1080, PAD = 70;
  var G1 = "#6D4AC8", G2 = "#C22E6C";
  var INK = "#14171A", INK2 = "#4C545B", INK3 = "#8A9299";
  var LINE = "rgba(22,25,28,.12)";
  var SITE = "64monsters.wonder-bros.com";
  var FD = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
  var FM = '"Noto Sans Mono", ui-monospace, Menlo, monospace';

  function base(){ return window.SITE_BASE || ""; }

  /* Webフォントが載ってから描く（載っていないと別の書体で焼き付いてしまう） */
  function fonts(){
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 54px ' + FD),
      document.fonts.load('500 28px ' + FD),
      document.fonts.load('400 24px ' + FD),
      document.fonts.load('500 40px ' + FM),
      document.fonts.load('400 22px ' + FM)
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

  function grad(ctx, x0, x1){
    var g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, G1); g.addColorStop(1, G2);
    return g;
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
  function fitOneLine(ctx, text, maxW, size, min, weight){
    var px = size;
    while (px > min){
      ctx.font = weight + " " + px + "px " + FD;
      if (ctx.measureText(text).width <= maxW) break;
      px -= 2;
    }
    ctx.font = weight + " " + px + "px " + FD;
    return px;
  }

  function center(ctx, text, y, font, color){
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "center";
    ctx.fillText(text, S / 2, y);
  }

  /* 6軸のコンパクト表示（2列×3行） */
  function drawAxes(ctx, sc, top){
    var AX = window.AXES;
    var colW = (S - PAD * 2 - 40) / 2;
    AX.forEach(function(a, i){
      var col = i % 2, row = (i / 2) | 0;
      var x = PAD + col * (colW + 40), y = top + row * 74;
      var d = sc[a.key];
      var right = d.pctPos > 50, pct = right ? d.pctPos : 100 - d.pctPos;
      var letter = d.letter, name = right ? a.pos.name : a.neg.name;

      ctx.textAlign = "left";
      ctx.font = "500 22px " + FM; ctx.fillStyle = right ? G2 : G1;
      ctx.fillText(letter, x, y);
      ctx.font = "400 22px " + FD; ctx.fillStyle = INK2;
      ctx.fillText("　" + name, x + 20, y);
      ctx.textAlign = "right";
      ctx.font = "500 22px " + FM; ctx.fillStyle = INK3;
      ctx.fillText(pct + "%", x + colW, y);

      /* 中央を均衡点とする発散バー */
      var by = y + 16, bw = colW, bh = 8;
      ctx.fillStyle = "rgba(22,25,28,.08)";
      ctx.beginPath(); ctx.roundRect(x, by, bw, bh, 4); ctx.fill();
      var w = Math.abs(d.pctPos - 50) / 100 * bw;
      var bx = right ? x + bw / 2 : x + bw / 2 - w;
      ctx.fillStyle = grad(ctx, x, x + bw);
      ctx.beginPath(); ctx.roundRect(bx, by, Math.max(w, 3), bh, 4); ctx.fill();
    });
  }

  /* opts: { code, label, tagline, desc, sc } */
  function render(opts){
    var canvas = document.getElementById("shareCanvas");
    var ctx = canvas.getContext("2d");
    return fonts()
      .then(function(){ return loadImg(base() + "images/thumbs/" + opts.code + ".webp"); })
      .then(function(im){
        ctx.clearRect(0, 0, S, S);
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, S, S);

        /* 上部のグラデーション帯 */
        ctx.fillStyle = grad(ctx, 0, S); ctx.fillRect(0, 0, S, 10);

        /* ヘッダー */
        ctx.textAlign = "left"; ctx.font = "500 26px " + FD; ctx.fillStyle = INK;
        ctx.fillText("64モンスターズ", PAD, 92);
        ctx.textAlign = "right"; ctx.font = "400 22px " + FM; ctx.fillStyle = INK3;
        ctx.fillText(SITE, S - PAD, 92);
        ctx.fillStyle = LINE; ctx.fillRect(PAD, 118, S - PAD * 2, 1);

        /* キャラクター */
        var cs = 400, cx = (S - cs) / 2, cy = 152;
        ctx.save();
        ctx.beginPath(); ctx.roundRect(cx, cy, cs, cs, 12); ctx.clip();
        ctx.fillStyle = "#F2F2F4"; ctx.fillRect(cx, cy, cs, cs);
        ctx.drawImage(im, cx, cy, cs, cs);
        ctx.restore();

        /* コード・名前・ひとこと */
        var y = cy + cs + 62;
        ctx.textAlign = "center";
        ctx.font = "500 40px " + FM; ctx.fillStyle = grad(ctx, S * 0.3, S * 0.7);
        ctx.fillText(opts.code, S / 2, y);

        fitOneLine(ctx, opts.label, S - PAD * 2, 54, 38, "700");
        ctx.fillStyle = INK;
        ctx.fillText(opts.label, S / 2, y + 68);

        fitOneLine(ctx, opts.tagline || "", S - PAD * 2, 26, 20, "400");
        ctx.fillStyle = INK2;
        ctx.fillText(opts.tagline || "", S / 2, y + 116);

        ctx.fillStyle = LINE; ctx.fillRect(PAD, y + 150, S - PAD * 2, 1);

        /* 6軸、なければ説明文 */
        if (opts.sc && window.AXES){
          drawAxes(ctx, opts.sc, y + 200);
        } else if (opts.desc){
          /* 説明文は最大4行。罫線の下から順に置く（中央ぞろえだと罫線に食い込む） */
          ctx.font = "400 26px " + FD; ctx.fillStyle = INK2; ctx.textAlign = "center";
          wrap(ctx, opts.desc, S - PAD * 2 - 40, 4).forEach(function(t, i){
            ctx.fillText(t, S / 2, y + 196 + i * 46);
          });
        }

        /* フッター */
        ctx.textAlign = "center"; ctx.font = "400 24px " + FD; ctx.fillStyle = INK3;
        ctx.fillText("6軸・全90問でわかる64通りの性格診断", S / 2, S - 54);

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
  /* opts: { a, b, aLabel, bLabel, verdict, same } */
  function renderPair(opts){
    var canvas = document.getElementById("shareCanvas");
    var ctx = canvas.getContext("2d");
    return fonts()
      .then(function(){
        return Promise.all([
          loadImg(base() + "images/thumbs/" + opts.a + ".webp"),
          loadImg(base() + "images/thumbs/" + opts.b + ".webp")
        ]);
      })
      .then(function(ims){
        ctx.clearRect(0, 0, S, S);
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, S, S);
        ctx.fillStyle = grad(ctx, 0, S); ctx.fillRect(0, 0, S, 10);

        ctx.textAlign = "left"; ctx.font = "500 26px " + FD; ctx.fillStyle = INK;
        ctx.fillText("64モンスターズ", PAD, 92);
        ctx.textAlign = "right"; ctx.font = "400 22px " + FM; ctx.fillStyle = INK3;
        ctx.fillText(SITE, S - PAD, 92);
        ctx.fillStyle = LINE; ctx.fillRect(PAD, 118, S - PAD * 2, 1);

        /* 2体を左右に */
        var cs = 400, cy = 168, xs = [PAD, S - PAD - cs];
        [opts.a, opts.b].forEach(function(code, i){
          var x = xs[i];
          ctx.save();
          ctx.beginPath(); ctx.roundRect(x, cy, cs, cs, 12); ctx.clip();
          ctx.fillStyle = "#F2F2F4"; ctx.fillRect(x, cy, cs, cs);
          ctx.drawImage(ims[i], x, cy, cs, cs);
          ctx.restore();

          var cxm = x + cs / 2;
          ctx.textAlign = "center";
          ctx.font = "500 26px " + FM; ctx.fillStyle = i === 0 ? G1 : G2;
          ctx.fillText(code, cxm, cy + cs + 46);
          ctx.font = "700 28px " + FD; ctx.fillStyle = INK;
          balance(ctx, i === 0 ? opts.aLabel : opts.bLabel, cs).forEach(function(t, k){
            ctx.fillText(t, cxm, cy + cs + 88 + k * 38);
          });
        });

        /* 中央の × */
        ctx.textAlign = "center"; ctx.font = "400 44px " + FM; ctx.fillStyle = INK3;
        ctx.fillText("×", S / 2, cy + cs / 2 + 16);

        ctx.fillStyle = LINE; ctx.fillRect(PAD, 748, S - PAD * 2, 1);

        /* 判定 */
        ctx.textAlign = "center";
        ctx.font = "400 24px " + FD; ctx.fillStyle = INK3;
        ctx.fillText("2人の相性", S / 2, 812);
        fitOneLine(ctx, opts.verdict, S - PAD * 2, 62, 40, "700");
        ctx.fillStyle = grad(ctx, S * 0.2, S * 0.8);
        ctx.fillText(opts.verdict, S / 2, 886);
        ctx.font = "400 28px " + FD; ctx.fillStyle = INK2;
        ctx.fillText("6軸のうち " + opts.same + " つが一致", S / 2, 938);

        ctx.font = "400 24px " + FD; ctx.fillStyle = INK3;
        ctx.fillText("コードを2つ入れると、その場で相性が出ます", S / 2, S - 54);

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
          text: opts.a + " × " + opts.b + "　" + opts.verdict + "　#64モンスターズ",
          url: location.href
        }).then(function(){ return "shared"; })
         .catch(function(e){ if (e && e.name === "AbortError") return "canceled"; return download(blob, name); });
      }
      return download(blob, name);
    });
  }

  window.SHARE = { render: render, save: save, renderPair: renderPair, savePair: savePair };
})();
