// 場面を切り替える区間: 画面いっぱいの写真を重ね、スクロールに合わせて
// ゆっくり寄る（または引く）。次の写真へは、ぼかしながら入れ替える。
// 各写真の data-span="始まり,終わり"（0〜1）が見えている区間、data-zoom="始め,終わり" が倍率。
(() => {
  // 動きを減らす設定は、開いたあとに切り替えられることがあるので毎回読む
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animated = () => document.documentElement.classList.contains('js') && !motionQuery.matches;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const span = (p, from, to) => clamp01((p - from) / (to - from));
  const FADE = 0.1; // 入れ替えにかけるスクロール量（区間全体を1として）
  const BLUR_MAX = 8; // 入れ替えの途中のぼかし（px）。画面いっぱいのぼかしは重いので控えめに（ひな形は 14）

  function setupSequence(section) {
    const shots = [...section.querySelectorAll('.shot')].map((el) => ({
      el,
      range: el.dataset.span.split(',').map(Number),
      zoom: (el.dataset.zoom ?? '1,1').split(',').map(Number),
    }));
    // スクロールのたびに読み直さないよう、文の区間も最初に数へ直しておく
    const captions = [...section.querySelectorAll('.caption')].map((el) => ({ el, from: Number(el.dataset.from), to: Number(el.dataset.to) }));
    const stage = section.querySelector('.scene__stage');
    let lastKey = '';

    function progress() {
      const rect = section.getBoundingClientRect();
      // 分母は画面に貼り付く板（stage）の高さ。Safari のアドレスバーで innerHeight が変わってもずれない
      const travel = Math.max(1, section.offsetHeight - stage.clientHeight);
      return clamp01(-rect.top / travel);
    }

    function render(force = false) {
      const on = animated();
      const p = on ? progress() : 0;
      // この区間は前の区間の最後の1画面に重ねてある。上端に貼り付くまでは隠し、前の区間の終わりを覆わない
      const waiting = on && section.getBoundingClientRect().top > 0.5;
      // 進み具合と待ちの状態が前と同じなら何も書かない（画面の外・動きを減らす設定では、ここで止まる）
      const key = `${on}|${waiting}|${p.toFixed(4)}`;
      if (!force && key === lastKey) return;
      lastKey = key;
      // 隠すのは見た目だけ（opacity）。visibility で隠すと、この区間の文が読み上げからも消える。
      // opacity は子に何を付けても突き抜けないので、絵が前の区間にかぶることもない
      stage.style.opacity = waiting ? '0' : '';
      stage.style.pointerEvents = waiting ? 'none' : '';

      shots.forEach(({ el, range: [from, to], zoom: [z0, z1] }, i) => {
        // 1枚目は濃さ1から始める（前の区間が終わりに同じ絵へ溶けて終わるので、そのまま引き継ぐ）。最後の絵は終わりまで残す
        const fadeIn = i === 0 ? 1 : span(p, from - FADE / 2, from + FADE / 2);
        const fadeOut = i === shots.length - 1 ? 0 : span(p, to - FADE / 2, to + FADE / 2);
        const visible = fadeIn * (1 - fadeOut);
        // 子に visible を直接付けると、親（stage）の hidden を突き抜けて前の区間にかぶる。待っている間は子も隠す
        const shown = visible > 0 && !waiting;
        const blur = shown ? (1 - fadeIn + fadeOut) * BLUR_MAX : 0;
        const z = z0 + (z1 - z0) * easeInOut(span(p, from - FADE / 2, to + FADE / 2));

        el.style.opacity = visible.toFixed(3);
        el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : 'none';
        el.style.transform = `scale(${z.toFixed(4)})`;
        el.style.visibility = shown ? 'visible' : 'hidden';
      });

      section.style.setProperty('--progress', p.toFixed(3));
      captions.forEach(({ el, from, to }) => el.classList.toggle('is-on', p >= from && p < to));
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; render(); });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => render(true));
    motionQuery.addEventListener('change', () => render(true));
    render(true);
    // 初期化が最後まで済んだ印（index.html の head の保険が見る）
    document.documentElement.dataset.sequence = 'ready';
  }

  document.querySelectorAll('.scene--sequence').forEach(setupSequence);
})();
