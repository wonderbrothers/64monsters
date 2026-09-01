/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
/* ===== 64モンスターズ — Myフレンド（/friends/）=====
   受け取った鑑定コードに名前をつけて残す。他人の記録なので
   自分の履歴（.history）とは別の保存先に入れる。混ぜると、
   「自分の変化を時間で追う」という履歴の意味が壊れる。
   相性の計算は /pair/ が持っているので、ここでは行に link するだけにして
   採点のロジックを二重に持たない。 */
(function(){
  "use strict";
  var SUB = window.SUBTYPES, R = window.RENDER, E = window.ENGINE;
  var B = window.SITE_BASE || "";
  var $ = function(id){ return document.getElementById(id); };

  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c];
    });
  }
  function fmtDay(t){
    var d = new Date(t), p = function(n){ return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
  }
  function msg(text, bad){
    var el = $("frMsg");
    el.textContent = text;
    el.classList.toggle("bad", !!bad);
    el.classList.remove("hidden");
  }

  /* ---------- 一覧 ---------- */
  function row(f, my){
    var lab = SUB[f.code] ? SUB[f.code].label : "";
    var pair = my
      ? '<a class="btn ghost fr-btn" href="' + B + 'pair/?a=' + my + '&amp;b=' + f.code + '">相性を見る</a>'
      : '';
    return '<li class="friend" data-id="' + esc(f.id) + '">' +
      '<a class="fr-main" href="' + R.typeUrl(B, f.code) + '">' +
        '<span class="thumb"><img src="' + R.thumb(B, f.code) + '" alt="" loading="lazy"></span>' +
        '<span class="fr-txt">' +
          '<span class="fr-name">' + esc(f.name) + '</span>' +
          '<span class="fr-code mono">' + f.code + '</span>' +
          '<span class="fr-lab">' + esc(lab) + '</span>' +
          '<span class="fr-when">' + (f.t ? fmtDay(f.t) + " に受けた結果" : "タイプのみ登録") + '</span>' +
        '</span>' +
      '</a>' +
      '<span class="fr-acts">' + pair +
        '<button type="button" class="fr-del" data-del="' + esc(f.id) + '">削除</button>' +
      '</span>' +
    '</li>';
  }

  function paint(){
    var list = E.getFriends(), has = list.length > 0;
    var my = E.getMyType();
    $("frEmpty").classList.toggle("hidden", has);
    $("frBody").classList.toggle("hidden", !has);
    $("frFoot").classList.toggle("hidden", !has);
    if (!has) return;
    $("frList").innerHTML = list.map(function(f){ return row(f, my); }).join("");
    /* 自分の鑑定コードは結果ページにあるので、そこへの導線を出す */
    var link = $("frMyLink");
    if (my){ link.href = R.typeUrl(B, my); link.classList.remove("hidden"); }
    else { link.classList.add("hidden"); }
    $("frMineNote").innerHTML = my
      ? 'あなたは <span class="mono">' + my + '</span>（' + esc(SUB[my].label) + '）として相性を出しています。'
      : '<b>あなたのタイプがまだ登録されていません。</b>' +
        '<a href="' + B + 'quiz/">診断を受ける</a>か、' +
        'タイプ紹介ページで「マイタイプに登録」すると、相性を見られるようになります。';
  }

  /* ---------- 登録 ---------- */
  $("frAdd").addEventListener("click", function(){
    var name = $("frName").value.trim();
    var code = $("frCode").value;
    if (!name) return msg("名前を入れてください", true);
    if (!code.trim()) return msg("鑑定コードかタイプコードを入れてください", true);
    var r = E.readCode(code);
    if (!r.ok) return msg(r.reason, true);
    var res = E.addFriend(name, r.record);
    E.track(res.added ? "friend_add" : "friend_update", { monster_type: r.code, code_kind: r.kind });
    /* msg() は textContent に入れるので、ここでのエスケープは不要（二重になる） */
    msg(res.added
      ? name + "（" + r.code + "）を登録しました"
      : name + "（" + r.code + "）に更新しました", false);
    $("frName").value = ""; $("frCode").value = "";
    paint();
  });
  $("frCode").addEventListener("keydown", function(e){
    if (e.key === "Enter"){ e.preventDefault(); $("frAdd").click(); }
  });
  $("frName").addEventListener("keydown", function(e){
    if (e.key === "Enter"){ e.preventDefault(); $("frCode").focus(); }
  });

  /* ---------- 削除（1件・2段階） ---------- */
  $("frList").addEventListener("click", function(e){
    var btn = e.target.closest ? e.target.closest("[data-del]") : null;
    if (!btn) return;
    if (btn.dataset.armed !== "1"){
      btn.dataset.armed = "1";
      btn.textContent = "本当に削除";
      btn.classList.add("armed");
      setTimeout(function(){
        if (btn.dataset.armed !== "1") return;
        btn.dataset.armed = "0"; btn.textContent = "削除"; btn.classList.remove("armed");
      }, 5000);
      return;
    }
    E.removeFriend(btn.getAttribute("data-del"));
    E.track("friend_remove", {});
    paint();
  });

  /* ---------- 全削除（2段階） ---------- */
  $("frClear").addEventListener("click", function(){
    var btn = this;
    if (btn.dataset.armed !== "1"){
      btn.dataset.armed = "1";
      btn.textContent = "本当に削除する（もう一度押す）";
      btn.classList.add("armed");
      setTimeout(function(){
        if (btn.dataset.armed !== "1") return;
        btn.dataset.armed = "0";
        btn.textContent = "登録した人をすべて削除する";
        btn.classList.remove("armed");
      }, 5000);
      return;
    }
    E.clearFriends();
    btn.dataset.armed = "0";
    btn.textContent = "登録した人をすべて削除する";
    btn.classList.remove("armed");
    E.track("friends_clear", {});
    paint();
  });

  /* 履歴からマイタイプが埋め直されたら、相性リンクを作り直す */
  document.addEventListener("mytype:change", paint);

  paint();
  E.track("friends_view", { friends: E.getFriends().length });
})();
