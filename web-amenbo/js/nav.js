/* メニューの開閉（狭い幅だけ）。JS が無いときはリンクがヘッダーの下に並ぶ */
(function () {
  "use strict";
  var toggle = document.querySelector(".site-header__toggle");
  var menu = document.getElementById("site-menu");
  if (!toggle || !menu) return;

  var label = toggle.querySelector(".site-header__toggle-label");
  var narrow = window.matchMedia("(max-width: 959px)");
  var behind = [document.querySelector("main"), document.querySelector(".site-footer")];

  toggle.hidden = false;

  function isOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    if (label) label.textContent = open ? "閉じる" : "メニュー";
    behind.forEach(function (el) {
      if (!el) return;
      if (open) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
    if (open) {
      var first = menu.querySelector("a");
      if (first) first.focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  narrow.addEventListener("change", function (e) {
    if (!e.matches && isOpen()) setOpen(false);
  });
})();
