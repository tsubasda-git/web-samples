/* 体験予約の3段フォーム（入力 → 確認 → 完了）。
 * 作例のため、どこにも送信しない。fetch / XMLHttpRequest / sendBeacon は使わない。
 * 入力値は textContent で表示する（innerHTML に入れない）。 */
(function () {
  "use strict";
  var form = document.getElementById("trial-form");
  if (!form) return;

  var panels = {
    input: document.getElementById("panel-input"),
    confirm: document.getElementById("panel-confirm"),
    done: document.getElementById("panel-done")
  };
  var stepItems = document.querySelectorAll("[data-step]");
  var summary = document.getElementById("form-summary");
  var summaryList = document.getElementById("form-summary-list");
  var confirmList = document.getElementById("confirm-list");
  var status = document.getElementById("form-status");
  var submitRow = document.getElementById("submit-row");
  var submitButton = document.getElementById("submit-button");
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* 電話番号: 全角数字を半角にそろえ、区切り（ハイフン・空白）を除いて、数字だけで10〜11桁か */
  function phoneError(v) {
    var half = v.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    if (/[^0-9\-－‐−ー\s]/.test(half)) return "電話番号は数字とハイフンだけで入力してください。";
    var digits = half.replace(/[\-－‐−ー\s]/g, "");
    return /^[0-9]{10,11}$/.test(digits) ? "" : "電話番号は数字で10〜11桁を入力してください（ハイフンはあってもなくてもかまいません）。";
  }

  var FIELDS = [
    { name: "guardian-name", label: "保護者のお名前", kind: "text", required: "保護者のお名前を入力してください。" },
    { name: "child-grade", label: "お子さんの学年", kind: "select", required: "お子さんの学年を選んでください。" },
    { name: "course", label: "希望のコース", kind: "radio", required: "希望のコースを1つ選んでください。" },
    { name: "day", label: "希望の曜日", kind: "radio", required: "希望の曜日を1つ選んでください。" },
    { name: "time", label: "希望の時間帯", kind: "radio", required: "希望の時間帯を1つ選んでください。" },
    {
      name: "email", label: "メールアドレス", kind: "text", required: "メールアドレスを入力してください。",
      check: function (v) { return EMAIL.test(v) ? "" : "メールアドレスの形を確かめてください（例: name@example.com）。"; }
    },
    {
      name: "phone", label: "電話番号", kind: "text",
      check: phoneError
    },
    { name: "question", label: "質問・伝えておきたいこと", kind: "text" }
  ];

  form.setAttribute("novalidate", "");
  /* 送信ボタンは JS が動いているときだけ出す（HTML では hidden・disabled。JS なしでは送れない） */
  submitRow.hidden = false;
  submitButton.disabled = false;

  function valueOf(field) {
    if (field.kind === "radio") {
      var checked = form.querySelector('input[name="' + field.name + '"]:checked');
      return checked ? checked.value : "";
    }
    return form.elements[field.name].value.trim();
  }

  function errorFor(field) {
    var v = valueOf(field);
    if (!v) return field.required || "";
    return field.check ? field.check(v) : "";
  }

  function targetOf(field) {
    return field.kind === "radio" ? document.getElementById("group-" + field.name) : form.elements[field.name];
  }

  function show(field, message, options) {
    var box = document.getElementById(field.name + "-error");
    var target = targetOf(field);
    box.textContent = message;
    box.hidden = !message;
    if (message) target.setAttribute("aria-invalid", "true");
    else target.removeAttribute("aria-invalid");
    if (!message) announced[field.name] = "";
    else if (options && options.announce && announced[field.name] !== message) {
      announced[field.name] = message;
      announce(field.label + ": " + message);
    } else if (options && options.inSummary) announced[field.name] = message;
    if (!summary.hidden) syncSummary();
  }

  /* 欄ごとに最後に読み上げた文（同じ文を何度も読まない・打っている間に変わった文は離れたときに読む） */
  var announced = {};

  /* 欄ごとのエラーを読み上げる（まとめの枠は role="alert" で送信時に読まれる） */
  function announce(text) {
    status.textContent = "";
    window.setTimeout(function () { status.textContent = text; }, 50);
  }

  /* まとめの枠を、いま出ている欄のエラーに合わせる（直した欄は消え、全部直ると枠も消える） */
  function syncSummary() {
    var current = [];
    FIELDS.forEach(function (field) {
      var box = document.getElementById(field.name + "-error");
      if (!box.hidden) current.push({ field: field, message: box.textContent });
    });
    renderSummary(current);
  }

  function firstFocusable(field) {
    return field.kind === "radio" ? form.querySelector('input[name="' + field.name + '"]') : form.elements[field.name];
  }

  function setStep(name) {
    Object.keys(panels).forEach(function (key) { panels[key].hidden = key !== name; });
    var order = ["input", "confirm", "done"];
    stepItems.forEach(function (li) {
      var s = li.getAttribute("data-step");
      if (s === name) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
      li.classList.toggle("is-done", order.indexOf(s) < order.indexOf(name));
    });
    var heading = panels[name].querySelector("h2");
    heading.setAttribute("tabindex", "-1");
    heading.focus();
    window.scrollTo(0, panels[name].getBoundingClientRect().top + window.scrollY - 96);
  }

  var lastSummaryKey = "";
  function renderSummary(errors, force) {
    var key = errors.map(function (item) { return item.field.name + ":" + item.message; }).join("|");
    if (!force && key === lastSummaryKey && !summary.hidden === errors.length > 0) return;
    lastSummaryKey = key;
    summaryList.textContent = "";
    errors.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + firstFocusable(item.field).id;
      a.textContent = item.message;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        firstFocusable(item.field).focus();
      });
      li.appendChild(a);
      summaryList.appendChild(li);
    });
    summary.hidden = errors.length === 0;
  }

  function renderConfirm() {
    confirmList.textContent = "";
    FIELDS.forEach(function (field) {
      var row = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = field.label;
      dd.textContent = valueOf(field) || "（なし）";
      row.appendChild(dt);
      row.appendChild(dd);
      confirmList.appendChild(row);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var errors = [];
    summary.hidden = true;
    FIELDS.forEach(function (field) {
      var message = errorFor(field);
      show(field, message, { inSummary: true });
      if (message) errors.push({ field: field, message: message });
    });
    renderSummary(errors, true);
    if (errors.length) {
      summary.focus();
      return;
    }
    renderConfirm();
    setStep("confirm");
  });

  /* 確かめ直すタイミング:
   * - 出ているエラーは、打っている間（input）・選び直したとき（change）に消す
   * - 離れたとき（blur）は、何か入っていて形が違うときだけ新しく出す
   * 離れたときにエラーを「消す」と、次の欄を押した瞬間に画面が詰まってクリックが外れる（失敗した方法に記録） */
  FIELDS.forEach(function (field) {
    var box = document.getElementById(field.name + "-error");
    var inputs = field.kind === "radio"
      ? form.querySelectorAll('input[name="' + field.name + '"]')
      : [form.elements[field.name]];
    Array.prototype.forEach.call(inputs, function (input) {
      if (field.kind === "text") {
        input.addEventListener("input", function () {
          if (!box.hidden) show(field, errorFor(field), { announce: false });
        });
        input.addEventListener("blur", function () {
          if (input.value.trim()) show(field, errorFor(field), { announce: true });
        });
      } else {
        input.addEventListener("change", function () {
          show(field, errorFor(field), { announce: true });
        });
      }
    });
  });

  document.getElementById("back-to-input").addEventListener("click", function () {
    setStep("input");
  });

  document.getElementById("confirm-send").addEventListener("click", function () {
    /* 作例: ここで送信しない。完了画面を出して、入力欄・確認欄・まとめ・通知の文をすべて空にする */
    form.reset();
    confirmList.textContent = "";
    summaryList.textContent = "";
    summary.hidden = true;
    status.textContent = "";
    lastSummaryKey = "";
    announced = {};
    setStep("done");
  });

  document.getElementById("start-over").addEventListener("click", function () {
    setStep("input");
  });
})();
