/* 64モンスターズ / 64monsters
   Copyright (c) 2026 WONDER BROTHERS INC. All rights reserved.
   オープンソースではありません。転載・再配布・改変しての公開、
   本診断を用いたサービスの提供、学習データとしての利用を禁じます。
   Not open source. See /LICENSE — https://64monsters.wonder-bros.com/ */
/* ===== 共通ヘッダー・ドロアー・表示設定 =====
   全ページの末尾で読み込む。ヘッダーとメニューをJSで差し込み、
   ダークモードと文字サイズの切り替えを受け持つ。

   PC : ロゴ ／ マイタイプ ／ モンスターギャラリー ／ 各種設定 ／ 診断（グラデーション）
   SP : メニュー ／ ロゴ ／ 診断。ギャラリー・マイタイプ・設定はドロアーの中。

   表示設定のUIは1つだけ作り、開くときに
   モーダル（PC）とドロアー（SP）のあいだで移し替えている（IDの重複を避けるため）。 */
(function(){
  "use strict";
  var KEY   = "shindan64.v1";
  var KEY_THEME = KEY + ".theme";  /* "system"（既定・端末設定に追従） | "light" | "dark" */
  var KEY_FS    = KEY + ".fs";     /* "s" | "m" | "l" */
  var MYKEY = KEY + ".mytype";
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var B = window.SITE_BASE || "";   /* docs/ 直下までの相対プレフィックス */

  function get(k, def){ try { return localStorage.getItem(k) || def; } catch(e){ return def; } }
  function set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  function themePref(){
    var v = get(KEY_THEME, "system");
    return (v === "light" || v === "dark") ? v : "system";
  }
  function resolvedTheme(){
    var p = themePref();
    if (p !== "system") return p;
    return (mq && mq.matches) ? "dark" : "light";
  }
  function applyTheme(){ root.setAttribute("data-theme", resolvedTheme()); }
  function applyFs(v){ root.setAttribute("data-fs", (v === "s" || v === "l") ? v : "m"); }

  var fs = get(KEY_FS, "m");
  applyTheme(); applyFs(fs);

  /* ---------- アイコン ---------- */
  var SVG_MENU =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
  var SVG_CHEV =
    '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9 5l7 7-7 7"></path></svg>';
  var LOGO =
    '<img class="logo logo-light" src="' + B + 'assets/logo.svg?v=5f144fbe" alt="" width="1238" height="280">' +
    '<img class="logo logo-dark" src="' + B + 'assets/logo-dark.svg?v=4ac2348c" alt="" width="1238" height="280">';

  var GALLERY = B + "types.html";
  var HOME = B || "index.html";
  var QUIZ = B + "quiz/";
  var HIST = B + "history/";
  /* いま開いているのがギャラリーなら、リンクに現在地を示す */
  var onGallery = /types\.html$/.test(location.pathname);
  var onQuiz = /\/quiz\/?$/.test(location.pathname);
  var onHist = /\/history\/?$/.test(location.pathname);

  /* ---------- ヘッダー ---------- */
  var wrapCls = document.querySelector(".wrap.wide") ? "wrap wide" : "wrap";
  var head = document.createElement("header");
  head.className = "site-head";
  head.innerHTML =
    '<div class="' + wrapCls + ' sh-inner">' +
      '<button type="button" class="sh-menu" id="shMenu" aria-label="メニューを開く" aria-expanded="false" aria-controls="siteDrawer">' + SVG_MENU + '</button>' +
      '<a class="sh-logo" href="' + HOME + '" aria-label="64モンスターズ ホーム">' + LOGO + '</a>' +
      '<nav class="sh-nav" aria-label="サイト内">' +
        '<a class="sh-my hidden" id="shMy" href="#"><span class="thumb"><img src="" alt=""></span>' +
          '<span class="sm-code mono"></span></a>' +
        '<a class="sh-link" href="' + GALLERY + '"' + (onGallery ? ' aria-current="page"' : '') + '>モンスターギャラリー</a>' +
        '<a class="sh-link" href="' + HIST + '"' + (onHist ? ' aria-current="page"' : '') + '>履歴</a>' +
        '<button type="button" class="sh-link" id="shSet">各種設定</button>' +
      '</nav>' +
      '<a class="btn sh-cta" href="' + QUIZ + '" id="shCta">診断</a>' +
    '</div>';
  document.body.insertBefore(head, document.body.firstChild);

  /* ---------- 表示設定のUI（1つだけ作って使い回す） ---------- */
  var panel = document.createElement("div");
  panel.className = "set-panel";
  panel.innerHTML =
    '<div class="set-row">' +
      '<div class="set-txt"><p class="set-h">ダークモード</p>' +
      '<p class="set-note" id="setThemeNote"></p>' +
      '<button type="button" class="set-link hidden" id="setThemeAuto">端末の設定に合わせる</button></div>' +
      '<button type="button" class="switch" id="setTheme" role="switch" aria-checked="false">' +
      '<span class="knob"></span></button>' +
    '</div>' +
    '<div class="set-row col">' +
      '<div class="set-txt"><p class="set-h">文字サイズ</p>' +
      '<p class="set-note">画面全体の文字の大きさを変えます</p></div>' +
      '<span class="seg-toggle set-fs" id="setFs" role="group" aria-label="文字サイズ">' +
        '<button type="button" data-v="s"><span>小</span></button>' +
        '<button type="button" data-v="m"><span>中</span></button>' +
        '<button type="button" data-v="l"><span>大</span></button>' +
      '</span>' +
    '</div>';

  /* ---------- 設定モーダル（PC） ---------- */
  var modal = document.createElement("div");
  modal.className = "modal hidden";
  modal.id = "settingsModal";
  modal.innerHTML =
    '<div class="modal-back" data-close></div>' +
    '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="setTitle">' +
      '<div class="modal-head">' +
        '<h2 id="setTitle" class="modal-title">表示設定</h2>' +
        '<button type="button" class="modal-x" data-close aria-label="閉じる">×</button>' +
      '</div>' +
      '<div class="modal-body" id="modalBody"></div>' +
    '</div>';
  document.body.appendChild(modal);

  /* ---------- ドロアー（SP） ---------- */
  var drawer = document.createElement("div");
  drawer.className = "drawer hidden";
  drawer.id = "siteDrawer";
  drawer.innerHTML =
    '<div class="drawer-back" data-dclose></div>' +
    '<aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="メニュー">' +
      '<div class="drawer-head">' +
        '<span class="drawer-logo">' + LOGO + '</span>' +
        '<button type="button" class="modal-x" data-dclose aria-label="メニューを閉じる">×</button>' +
      '</div>' +
      '<nav class="drawer-nav" aria-label="サイト内">' +
        '<a href="' + QUIZ + '"' + (onQuiz ? ' aria-current="page"' : '') + '>' +
          '<span>90問の診断を受ける</span>' + SVG_CHEV + '</a>' +
        '<a href="' + GALLERY + '"' + (onGallery ? ' aria-current="page"' : '') + '>' +
          '<span>モンスターギャラリー</span>' + SVG_CHEV + '</a>' +
        '<a href="' + HIST + '"' + (onHist ? ' aria-current="page"' : '') + '>' +
          '<span>鑑定履歴</span>' + SVG_CHEV + '</a>' +
      '</nav>' +
      '<div class="drawer-sec"><p class="drawer-h">My Type</p><div id="drawerMy"></div></div>' +
      '<div class="drawer-sec"><p class="drawer-h">表示設定</p><div id="drawerBody"></div></div>' +
    '</aside>';
  document.body.appendChild(drawer);

  /* ---------- マイタイプ ---------- */
  function renderMy(){
    var box = drawer.querySelector("#drawerMy");
    var code = null;
    try { code = localStorage.getItem(MYKEY); } catch(e){}
    var SUB = window.SUBTYPES;
    if (!code || !SUB || !SUB[code]){
      box.innerHTML =
        '<p class="drawer-empty">まだ登録されていません。診断を受けるか、結果ページで「マイタイプに登録」を押すとここに出ます。</p>';
      return;
    }
    box.innerHTML =
      '<a class="drawer-my" href="' + B + 't/' + code + '/">' +
        '<span class="thumb"><img src="' + B + 'images/thumbs/' + code + '.webp" alt="" loading="lazy"></span>' +
        '<span class="dm-txt"><span class="dm-code mono">' + code + '</span>' +
        '<span class="dm-name">' + SUB[code].label + '</span></span>' +
      '</a>' +
      '<a class="drawer-sub" href="' + B + 'pair/?a=' + code + '">この人との相性を調べる</a>';
  }

  /* ヘッダーのマイタイプ（PCのみ表示。登録がなければ出さない） */
  function renderHeadMy(){
    var chip = document.getElementById("shMy");
    if (!chip) return;
    var code = null;
    try { code = localStorage.getItem(MYKEY); } catch(e){}
    var SUB = window.SUBTYPES;
    if (!code || !SUB || !SUB[code]){ chip.classList.add("hidden"); return; }
    var name = SUB[code].label;
    chip.href = B + "t/" + code + "/";
    chip.title = code + "（" + name + "）";
    chip.setAttribute("aria-label", "マイタイプ " + code + "（" + name + "）");
    chip.querySelector("img").src = B + "images/thumbs/" + code + ".webp";
    chip.querySelector(".sm-code").textContent = code;
    chip.classList.remove("hidden");
  }
  renderHeadMy();

  /* 結果ページで登録／解除したとき、ヘッダーを描き直せるように公開する */
  window.SiteHeader = window.SiteHeader || {};
  window.SiteHeader.refreshMyType = function(){ renderHeadMy(); renderMy(); };

  /* ---------- 設定の同期 ---------- */
  var sw = panel.querySelector("#setTheme");
  var fsWrap = panel.querySelector("#setFs");
  var themeNote = panel.querySelector("#setThemeNote");
  var themeAuto = panel.querySelector("#setThemeAuto");

  function syncUI(){
    var dark = root.getAttribute("data-theme") === "dark";
    sw.setAttribute("aria-checked", dark ? "true" : "false");
    sw.classList.toggle("on", dark);
    var auto = themePref() === "system";
    themeNote.textContent = auto
      ? ("端末の設定に合わせています（現在：" + (dark ? "ダーク" : "ライト") + "）")
      : "暗い背景で表示します";
    themeAuto.classList.toggle("hidden", auto);
    var cur = root.getAttribute("data-fs") || "m";
    Array.prototype.forEach.call(fsWrap.children, function(b){
      b.classList.toggle("on", b.dataset.v === cur);
      b.setAttribute("aria-pressed", b.dataset.v === cur ? "true" : "false");
    });
  }
  syncUI();

  sw.addEventListener("click", function(){
    set(KEY_THEME, resolvedTheme() === "dark" ? "light" : "dark");
    applyTheme(); syncUI();
  });
  themeAuto.addEventListener("click", function(){
    set(KEY_THEME, "system"); applyTheme(); syncUI();
  });
  if (mq){
    var onMq = function(){ if (themePref() === "system"){ applyTheme(); syncUI(); } };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }
  fsWrap.addEventListener("click", function(e){
    var b = e.target.closest("button[data-v]"); if (!b) return;
    fs = b.dataset.v; applyFs(fs); set(KEY_FS, fs); syncUI();
  });

  /* ---------- 開閉 ---------- */
  var lastFocus = null;
  function lock(){ document.body.classList.add("modal-open"); }
  function unlock(){
    if (modal.classList.contains("hidden") && drawer.classList.contains("hidden")){
      document.body.classList.remove("modal-open");
    }
  }
  function openModal(){
    lastFocus = document.activeElement;
    modal.querySelector("#modalBody").appendChild(panel);  /* 設定UIをモーダルへ移す */
    syncUI();
    modal.classList.remove("hidden"); lock();
    sw.focus();
  }
  function closeModal(){
    modal.classList.add("hidden"); unlock();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function openDrawer(){
    lastFocus = document.activeElement;
    drawer.querySelector("#drawerBody").appendChild(panel); /* 設定UIをドロアーへ移す */
    renderMy(); syncUI();
    drawer.classList.remove("hidden"); lock();
    document.getElementById("shMenu").setAttribute("aria-expanded", "true");
    drawer.querySelector(".modal-x").focus();
  }
  function closeDrawer(){
    drawer.classList.add("hidden"); unlock();
    document.getElementById("shMenu").setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.getElementById("shSet").addEventListener("click", openModal);
  document.getElementById("shMenu").addEventListener("click", openDrawer);
  modal.addEventListener("click", function(e){ if (e.target.hasAttribute("data-close")) closeModal(); });
  drawer.addEventListener("click", function(e){ if (e.target.hasAttribute("data-dclose")) closeDrawer(); });
  document.addEventListener("keydown", function(e){
    if (e.key !== "Escape") return;
    if (!modal.classList.contains("hidden")) closeModal();
    else if (!drawer.classList.contains("hidden")) closeDrawer();
  });

  /* ---------- 診断ボタン ---------- */
  /* トップページにいるときは、遷移せずにその場で診断を始める */
  /* 設問ページにいるあいだは「診断」を現在地として示し、押しても何も起きないようにする */
  (function markCurrent(){
    var cta = document.getElementById("shCta");
    if (!/\/quiz\/?$/.test(location.pathname)) return;
    cta.setAttribute("aria-current", "page");
    cta.addEventListener("click", function(e){ e.preventDefault(); });
  })();
})();
