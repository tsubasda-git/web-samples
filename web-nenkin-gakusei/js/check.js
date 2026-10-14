/* 学生納付特例 かんたんガイド — 対象かどうかの目安と、お知らせの帯を閉じる処理。
 * この JS が無くても、質問・基準・結果の見方はすべて HTML の文章で読める。 */
(function () {
  'use strict';

  var MENJO_URL = 'https://www.nenkin.go.jp/service/kokunen/menjo/index.html';
  var MENJO_LABEL = '国民年金保険料の免除・猶予・追納（日本年金機構）';

  var RESULTS = {
    pending: {
      title: 'もう1つの質問にも答えてください',
      lines: ['2つとも答えると、ここに目安が出ます。']
    },
    yes: {
      title: '対象の可能性があります',
      lines: ['窓口で確かめてください。申請先と必要な書類は「申請の流れ」にまとめています。']
    },
    no: {
      title: 'この制度の対象ではない可能性があります',
      lines: ['免除・納付猶予は別の制度です。公式ページで確かめてください。'],
      link: true
    }
  };

  function el(tag, text) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  function renderResult(key) {
    var data = RESULTS[key];
    var title = document.getElementById('result-title');
    var body = document.getElementById('result-body');
    if (!data || !title || !body) return;

    var frag = document.createDocumentFragment();
    data.lines.forEach(function (line) { frag.appendChild(el('p', line)); });
    if (data.link) {
      var p = el('p');
      var a = el('a', MENJO_LABEL);
      a.href = MENJO_URL;
      p.appendChild(a);
      frag.appendChild(p);
    }
    title.textContent = data.title;
    body.replaceChildren(frag);
  }

  function readAnswer(form, name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
  }

  function judge(student, income) {
    if (student === 'no' || income === 'no') return 'no';
    if (student === 'yes' && income === 'yes') return 'yes';
    return 'pending';
  }

  function setupCheck() {
    var form = document.getElementById('check');
    if (!form) return;
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    form.addEventListener('change', function () {
      renderResult(judge(readAnswer(form, 'student'), readAnswer(form, 'income')));
    });
  }

  function setupNotice() {
    var notice = document.getElementById('notice');
    var button = document.getElementById('notice-close');
    if (!notice || !button) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    button.addEventListener('click', function () {
      var hide = function () {
        notice.hidden = true;
        var heading = document.getElementById('lead-title');
        if (heading) heading.focus();
      };
      if (reduce) { hide(); return; }
      notice.classList.add('is-closing');
      window.setTimeout(hide, 150);
    });
  }

  setupCheck();
  setupNotice();
})();
