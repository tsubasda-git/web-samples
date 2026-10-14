// 読み込み中の表示: 最初の場面の絵（台・部品の SVG）がそろうまで、小さな輪を出す。
// 印（.is-loading）は index.html の head で付けている。JS が動かない環境では輪は出ない。
(() => {
  const root = document.documentElement;
  const first = document.querySelector('.scene--assemble');
  if (!first || !root.classList.contains('js')) return;
  const MAX_WAIT_MS = 6000; // 回線が遅くても、これ以上は待たせない

  // 最初に見える背景と部品だけを待つ。完成写真は後で見せるので待たない（動きを減らす設定のときだけ完成写真を待つ）
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const images = [...first.querySelectorAll(reduce ? '.plate__bg, .plate__final' : 'img:not(.plate__final)')];
  // 輪が出ている間は、裏のリンクへキーボードで移れないようにする
  const behind = [...document.body.children].filter((el) => !el.classList.contains('loader') && el.tagName !== 'SCRIPT');
  behind.forEach((el) => { el.inert = true; });
  const ready = images.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {})));
  const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS));

  Promise.race([Promise.all(ready), timeout]).then(() => {
    root.classList.remove('is-loading');
    behind.forEach((el) => { el.inert = false; });
  });
})();
