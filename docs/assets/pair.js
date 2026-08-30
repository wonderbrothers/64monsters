/* ===== 相性ページ（/pair/）=====
   ?a=ENTP-A-H&b=INFJ-O-C の2つのコードから、6軸の噛み合いを出す。
   計算はすべてブラウザ内。サーバーには何も送らない。 */
(function(){
  "use strict";
  var AXES = window.AXES, BASE = window.BASE_TYPES, SUB = window.SUBTYPES, R = window.RENDER;
  var B = "../";
  var $ = function(id){ return document.getElementById(id); };

  function track(name, props){
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event:name }, props||{})); } catch(e){}
  }

  /* 軸ごとの一言。同じときと違うときで書き分ける */
  var NOTE = {
    EI: { same:"充電の仕方が同じです。会う頻度や一緒にいる時間の長さで、無理が出にくい組み合わせ。",
          diff:"充電の仕方が逆です。片方は人と話して回復し、もう片方はひとりで回復する。解散の時間を先に決めておくと、どちらも削られません。" },
    SN: { same:"話の入り口が同じです。前置きなしで本題に入れます。",
          diff:"話の入り口が違います。片方は事実から、もう片方は意味から入る。結論が同じでも説明の順番が噛み合わないので、先に「いま何の話をしているか」を揃えると早いです。" },
    TF: { same:"決め方の基準が同じです。結論までの筋道が揃うぶん、合意が速い。",
          diff:"決め方の基準が違います。筋道で決める人と、人への影響で決める人。どちらが正しいかを競うのではなく、決める前に必ず両方を通す手順にすると、納得が残ります。" },
    JP: { same:"予定への構えが同じです。段取りの押し引きで揉めにくい。",
          diff:"予定への構えが逆です。決めて片づけたい人と、幅を残したい人。締め切りだけを共有して、そこまでの進め方には互いに口を出さないのが平和です。" },
    AO: { same:"決断のリズムが同じです。待たされる／急かされるが起きにくい。",
          diff:"決断のリズムが違います。即断と熟慮。速いほうがただ待つのではなく、「いつまでに決めるか」を先に置くと、どちらも消耗しません。" },
    HC: { same:"対人の温度が同じです。距離の取り方に説明がいりません。",
          diff:"対人の温度が違います。場をひらく人と、距離を保つ人。冷たいわけでも馴れ馴れしいわけでもなく、既定値が違うだけ。そう言葉にしておくと誤解が減ります。" }
  };

  function letters(code){
    var p = code.split("-");
    return { EI:p[0][0], SN:p[0][1], TF:p[0][2], JP:p[0][3], AO:p[1], HC:p[2] };
  }
  function valid(c){ return !!(c && SUB[c]); }

  /* ---------- 選択UI ---------- */
  var pick = { a:{ base:"INTJ", ao:"A", hc:"H" }, b:{ base:"INFJ", ao:"O", hc:"C" } };
  function codeOf(side){ var p = pick[side]; return p.base + "-" + p.ao + "-" + p.hc; }
  function setSide(side, code){
    var p = code.split("-");
    pick[side] = { base:p[0], ao:p[1], hc:p[2] };
  }

  function buildPicker(side){
    var sel = $(side + "Base");
    sel.innerHTML = Object.keys(BASE).map(function(k){
      return '<option value="' + k + '">' + k + '　' + BASE[k].name + '</option>';
    }).join("");
    sel.addEventListener("change", function(){ pick[side].base = this.value; paint(side); });
    [["AO","ao"],["HC","hc"]].forEach(function(t){
      $(side + t[0]).addEventListener("click", function(e){
        var b = e.target.closest("button"); if (!b) return;
        pick[side][t[1]] = b.dataset.v; paint(side);
      });
    });
  }
  function paint(side){
    var p = pick[side], code = codeOf(side);
    $(side + "Base").value = p.base;
    [["AO", p.ao],["HC", p.hc]].forEach(function(t){
      Array.prototype.forEach.call($(side + t[0]).children, function(b){
        b.classList.toggle("on", b.dataset.v === t[1]);
      });
    });
    $(side + "Now").innerHTML =
      '<span class="thumb"><img src="' + R.thumb(B, code) + '" alt="" loading="lazy"></span>' +
      '<span><span class="mono">' + code + '</span><br>' + SUB[code].label + '</span>';
  }

  /* ---------- 結果 ---------- */
  function duoHTML(code){
    return '<a class="thumb" href="' + R.typeUrl(B, code) + '"><img src="' + R.thumb(B, code) + '" alt="' + SUB[code].label + '" loading="lazy"></a>' +
           '<span class="dc">' + code + '</span>' +
           '<span class="dn">' + SUB[code].label + '</span>';
  }

  function verdictOf(a, b){
    var rel = R.relation(a, b);
    if (rel && rel.exact) return { lab: rel.title, sub: "サブタイプまでぴたりと当てはまる組み合わせ", why: rel.why };
    if (rel) return {
      lab: rel.title + "に近い",
      sub: "基本タイプの相性は当てはまりますが、決断のリズム（A / O）か対人の温度（H / C）が少しずれています",
      why: rel.why
    };
    return {
      lab: "並走する相手",
      sub: "どの相性リストにも入らない、干渉の少ない組み合わせ",
      why: "強く惹かれ合うわけでも、ぶつかるわけでもない関係です。放っておくと距離が縮まらないぶん、共通の目的や作業があるときにいちばん機能します。役割を分けて並んで走るのが、この2人の使い方です。"
    };
  }

  function render(a, b){
    $("duoA").innerHTML = duoHTML(a);
    $("duoB").innerHTML = duoHTML(b);

    var La = letters(a), Lb = letters(b);
    var same = AXES.filter(function(x){ return La[x.key] === Lb[x.key]; }).length;
    var v = verdictOf(a, b);
    var back = R.relation(b, a);
    var backLine = "";
    if (back && back.title !== (R.relation(a, b) || {}).title){
      backLine = '<p class="pv-why">なお、相手から見たあなたは「' + back.title + '」にあたります。見え方が一方向でないのは珍しくありません。</p>';
    }

    $("verdict").innerHTML =
      '<p class="pv-lab">' + v.lab + '</p>' +
      '<p class="pv-sub">' + v.sub + '　／　6軸のうち <span class="mono">' + same + '</span> つが一致</p>' +
      '<p class="pv-why">' + v.why + '</p>' + backLine;

    $("axisCmp").innerHTML = AXES.map(function(x){
      var la = La[x.key], lb = Lb[x.key], eq = la === lb;
      return '<div class="acmp">' +
        '<div class="ac-l">' + (eq
          ? '<span class="eq">' + la + ' = ' + lb + '</span>'
          : '<span class="a">' + la + '</span> / <span class="b">' + lb + '</span>') + '</div>' +
        '<div><div class="ac-t">' + x.title +
          '<span class="tag' + (eq ? '' : ' diff') + '">' + (eq ? "同じ" : "違う") + '</span></div>' +
          '<div class="ac-d">' + NOTE[x.key][eq ? "same" : "diff"] + '</div></div>' +
      '</div>';
    }).join("");

    $("pairResult").classList.remove("hidden");
    track("pair_view", { pair_a: a, pair_b: b, axis_match: same });
  }

  function go(push){
    var a = codeOf("a"), b = codeOf("b");
    if (a === b){
      /* 同じタイプ同士でも成立するので止めない */
    }
    var url = location.pathname + "?a=" + a + "&b=" + b;
    if (push) history.replaceState(null, "", url);
    render(a, b);
    $("pairResult").scrollIntoView({ behavior:"smooth", block:"start" });
  }

  /* ---------- 起動 ---------- */
  buildPicker("a"); buildPicker("b");

  var q = new URLSearchParams(location.search);
  var qa = (q.get("a") || "").toUpperCase(), qb = (q.get("b") || "").toUpperCase();
  var my = null;
  try { my = localStorage.getItem("shindan64.v1.mytype"); } catch(e){}

  if (valid(qa)) setSide("a", qa);
  else if (valid(my)) setSide("a", my);
  if (valid(qb)) setSide("b", qb);

  paint("a"); paint("b");
  if (valid(qa) && valid(qb)) render(qa, qb);

  $("pairGo").addEventListener("click", function(){ go(true); });

  $("pairCopyBtn").addEventListener("click", function(){
    var btn = this;
    var url = location.origin + location.pathname + "?a=" + codeOf("a") + "&b=" + codeOf("b");
    navigator.clipboard.writeText(url).then(function(){
      btn.textContent = "コピーしました";
      setTimeout(function(){ btn.textContent = "この結果のURLをコピー"; }, 1800);
    }).catch(function(){ btn.textContent = "コピーできませんでした"; });
  });

  $("inviteBtn").addEventListener("click", function(){
    var btn = this;
    navigator.clipboard.writeText(location.origin + "/").then(function(){
      btn.textContent = "コピーしました";
      setTimeout(function(){ btn.textContent = "診断リンクをコピー"; }, 1800);
      track("invite_copy", { from: codeOf("a") });
    }).catch(function(){ btn.textContent = "コピーできませんでした"; });
  });

  $("pairShareBtn").addEventListener("click", function(){
    var btn = this, orig = "結果を画像で保存";
    var a = codeOf("a"), b = codeOf("b"), v = verdictOf(a, b);
    var La = letters(a), Lb = letters(b);
    btn.disabled = true; btn.textContent = "画像を作っています…";
    window.SHARE.savePair({
      a:a, b:b,
      aLabel: SUB[a].label, bLabel: SUB[b].label,
      verdict: v.lab,
      same: AXES.filter(function(x){ return La[x.key] === Lb[x.key]; }).length
    }).then(function(how){
      track("share_pair_image", { pair_a:a, pair_b:b, method:how });
      btn.textContent = how === "downloaded" ? "保存しました" : orig;
      setTimeout(function(){ btn.textContent = orig; btn.disabled = false; }, 2000);
    }).catch(function(){
      btn.textContent = "画像を作れませんでした";
      setTimeout(function(){ btn.textContent = orig; btn.disabled = false; }, 2200);
    });
  });
})();
