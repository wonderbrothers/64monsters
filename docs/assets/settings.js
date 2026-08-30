/* ===== 表示設定（ダークモード／文字サイズ）===== */
(function(){
  "use strict";
  var KEY_THEME = "shindan64.v1.theme";  /* "system"（既定・端末設定に追従） | "light" | "dark" */
  var KEY_FS    = "shindan64.v1.fs";     /* "s" | "m" | "l"  */
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function get(k, def){ try { return localStorage.getItem(k) || def; } catch(e){ return def; } }
  function set(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  /* 保存されている選択。未設定・不正値は "system"（端末の設定に合わせる） */
  function themePref(){
    var v = get(KEY_THEME, "system");
    return (v === "light" || v === "dark") ? v : "system";
  }
  /* 実際に適用するテーマ */
  function resolvedTheme(){
    var p = themePref();
    if (p !== "system") return p;
    return (mq && mq.matches) ? "dark" : "light";
  }
  function applyTheme(){ root.setAttribute("data-theme", resolvedTheme()); }
  function applyFs(v){ root.setAttribute("data-fs", (v === "s" || v === "l") ? v : "m"); }

  var fs = get(KEY_FS, "m");
  applyTheme(); applyFs(fs);

  /* ---------- UI を差し込む ---------- */
  /* ---------- 共通ヘッダー（左：予備／中央：ロゴ／右：設定） ---------- */
  var LOGO =
    '<img class="logo logo-light" src="assets/logo.svg?v=5f144fbe" alt="" width="1238" height="280">' +
    '<img class="logo logo-dark" src="assets/logo-dark.svg?v=4ac2348c" alt="" width="1238" height="280">';
  var head = document.createElement("header");
  head.className = "site-head";
  head.innerHTML =
    '<div class="' + (document.querySelector(".wrap.wide") ? "wrap wide" : "wrap") + ' sh-inner">' +
      '<span class="sh-side"></span>' +
      '<a class="sh-logo" href="index.html" aria-label="64モンスターズ ホーム">' + LOGO + '</a>' +
      '<span class="sh-side sh-right"></span>' +
    '</div>';
  document.body.insertBefore(head, document.body.firstChild);
  var slotInner = head.querySelector(".sh-right");

  var btn = document.createElement("button");
  btn.className = "settings-fab";
  btn.type = "button";
  btn.setAttribute("aria-label", "表示設定を開く");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3.2"></circle>' +
    '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1A1.7 1.7 0 0 0 10.13 3V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z"></path>' +
    '</svg>';

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
      '</div>' +
    '</div>';

  slotInner.appendChild(btn);
  document.body.appendChild(modal);

  var sw = modal.querySelector("#setTheme");
  var fsWrap = modal.querySelector("#setFs");
  var themeNote = modal.querySelector("#setThemeNote");
  var themeAuto = modal.querySelector("#setThemeAuto");

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

  /* トグルを触ったら明示的な指定として保存する */
  sw.addEventListener("click", function(){
    set(KEY_THEME, resolvedTheme() === "dark" ? "light" : "dark");
    applyTheme(); syncUI();
  });
  /* 端末の設定に戻す */
  themeAuto.addEventListener("click", function(){
    set(KEY_THEME, "system"); applyTheme(); syncUI();
  });
  /* 端末側の設定が変わったら（追従中のみ）即座に反映 */
  if (mq){
    var onMq = function(){ if (themePref() === "system"){ applyTheme(); syncUI(); } };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }
  fsWrap.addEventListener("click", function(e){
    var b = e.target.closest("button[data-v]"); if (!b) return;
    fs = b.dataset.v; applyFs(fs); set(KEY_FS, fs); syncUI();
  });

  var lastFocus = null;
  function open(){
    lastFocus = document.activeElement;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    sw.focus();
  }
  function close(){
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  btn.addEventListener("click", open);
  modal.addEventListener("click", function(e){ if (e.target.hasAttribute("data-close")) close(); });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });
})();
