// 予約フォームの入力チェック。作例なので、どこにも送信しない（form は method="dialog" で、送信しても何も起きない）。
// JS が動かないときは、ブラウザ標準の必須チェックだけが働き、文章「どこにも送信されません」はそのまま読める。
(() => {
  const form = document.querySelector('.form');
  if (!form) return;
  form.noValidate = true; // ブラウザ標準の吹き出しの代わりに、欄のすぐ下へ文で出す

  const result = form.querySelector('.form__result');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // 電話番号: 全角の数字・記号を半角にそろえ、区切り（- ( ) 空白）を外したあと、0 から始まる数字だけ 10〜11 桁か
  const toHalf = (v) => v.replace(/[０-９－（）　]/g, (c) => ({ '－': '-', '（': '(', '）': ')', '　': ' ' }[c] ?? String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  const isPhone = (v) => {
    const half = toHalf(v);
    if (!/^[0-9\-()\s]+$/.test(half)) return false;
    return /^0\d{9,10}$/.test(half.replace(/[-()\s]/g, ''));
  };
  const CLOSED_DAY = 3; // 水曜日

  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  form.elements.date.min = todayISO();

  // 欄ごとの決まり。戻り値が空文字なら問題なし、文があればそれがエラー文
  const rules = {
    name: (v) => (v.trim() ? '' : 'お名前を入れてください。'),
    date: (v) => {
      if (!v) return '希望日を選んでください。';
      if (v < todayISO()) return '今日より後の日を選んでください。';
      const day = new Date(`${v}T12:00:00`).getDay();
      return day === CLOSED_DAY ? '水曜日は定休日です。ほかの日を選んでください。' : '';
    },
    time: (v) => (v ? '' : '時間帯を選んでください。'),
    contact: (v) => {
      const t = v.trim();
      if (!t) return '連絡先を入れてください。';
      return EMAIL.test(t) || isPhone(t) ? '' : 'メールアドレスか電話番号（数字10〜11桁）の形で入れてください。';
    },
    purpose: (v) => (v ? '' : '用件を選んでください。'),
  };

  function check(name) {
    const field = form.querySelector(`[data-field="${name}"]`);
    const message = rules[name](form.elements[name].value ?? '');
    field.classList.toggle('is-invalid', Boolean(message));
    field.querySelector('.field__error').textContent = message;
    const inputs = field.querySelectorAll('input, select, textarea');
    inputs.forEach((el) => el.setAttribute('aria-invalid', message ? 'true' : 'false'));
    return message;
  }

  // 一度エラーを出した欄は、直したらすぐ消す
  form.addEventListener('input', (e) => {
    const name = e.target.name;
    if (rules[name] && form.querySelector(`[data-field="${name}"]`).classList.contains('is-invalid')) check(name);
  });
  form.addEventListener('change', (e) => {
    if (rules[e.target.name] && e.target.type === 'radio') check(e.target.name);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const failed = Object.keys(rules).filter((name) => check(name));
    if (failed.length) {
      result.textContent = '';
      const first = form.querySelector(`[data-field="${failed[0]}"] input, [data-field="${failed[0]}"] select`);
      first?.focus();
      return;
    }
    // 入力内容は画面の中で確かめただけで、保存も送信もしない
    result.textContent = '入力を確かめました。作例のため、この内容はどこにも送信されません。';
  });
})();
