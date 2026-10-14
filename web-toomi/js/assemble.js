// 動画を使わない組み上げ: 台の絵の上に、透明な部品の SVG を重ね、
// スクロール量に合わせて1つずつ下へ動かしてはめる。最後は組み上がった眼鏡の絵に切り替える。
// 座標はすべて元の写真（data-plate-w × data-plate-h）のピクセルで書く。
(() => {
  // 動きを減らす設定は、開いたあとに切り替えられることがあるので毎回読む
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  // 演出するのは html に js の印があり、動きを減らす設定でないときだけ（8秒の保険で印が外れたときも止める）
  const animated = () => document.documentElement.classList.contains('js') && !motionQuery.matches;
  // 縦長の画面（スマホ・縦に持ったタブレット）。css/site.css のスマホ用の @media と同じ条件
  const NARROW = window.matchMedia('(max-width: 640px), (max-aspect-ratio: 4/5)');
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  // 区間 [from, to] の中で 0→1 になる値
  const span = (p, from, to) => clamp01((p - from) / (to - from));

  function setupAssemble(section) {
    const stage = section.querySelector('.scene__stage');
    const plate = section.querySelector('.plate');
    const group = section.querySelector('.plate__group');
    const cam = section.querySelector('.plate__cam');
    const [camX, camY, camK, camKNarrow = camK] = JSON.parse(section.dataset.cam); // 寄っていく先（写真のピクセル）と倍率（PC・スマホ）
    const finalImg = section.querySelector('.plate__final');
    const ghost = section.querySelector('.plate__ghost');
    const handoff = section.querySelector('.plate__handoff');
    const parts = [...section.querySelectorAll('.part')];
    const captions = [...section.querySelectorAll('.caption')];
    const W = Number(section.dataset.plateW);
    const H = Number(section.dataset.plateH);
    const focusX = Number(section.dataset.focusX ?? 0.5);

    // 部品の置き場所を、写真の座標から % に直して置く
    parts.forEach((el) => {
      const [x0, y0, x1, y1] = el.dataset.box.split(',').map(Number);
      Object.assign(el.style, {
        left: `${(x0 / W) * 100}%`,
        top: `${(y0 / H) * 100}%`,
        width: `${((x1 - x0) / W) * 100}%`,
      });
    });

    // 完成形の写真: 自分の時計の中心 (fx, fy) が、組み上がった部品の中心 (gx, gy) に来るよう、倍率 k で置く
    const [fx, fy, gx, gy, k] = finalImg.dataset.fit.split(',').map(Number);
    const fitStyle = {
      left: `${((gx - fx * k) / W) * 100}%`,
      top: `${((gy - fy * k) / H) * 100}%`,
      width: `${k * 100}%`,
      height: 'auto',
    };
    Object.assign(finalImg.style, fitStyle);
    if (ghost) Object.assign(ghost.style, fitStyle);
    finalImg.style.setProperty('--mask-x', `${(fx / W) * 100}%`);
    finalImg.style.setProperty('--mask-y', `${(fy / H) * 100}%`);
    // 完成写真を台になじませる楕円の大きさ（横%,縦%）。横長の商品は横を広げる。省略時は腕時計に合わせた 34,62
    const [maskW, maskH] = (finalImg.dataset.mask ?? '34,62').split(',').map(Number);
    finalImg.style.setProperty('--mask-w', `${maskW}%`);
    finalImg.style.setProperty('--mask-h', `${maskH}%`);

    // スクロールのたびに読み直さないよう、data 属性は最初に数へ直しておく
    const partData = parts.map((el) => {
      const [from, to] = el.dataset.when.split(',').map(Number);
      return { el, from, to, dy: Number(el.dataset.dy) };
    });
    const captionData = captions.map((el) => ({ el, from: Number(el.dataset.from), to: Number(el.dataset.to) }));
    let scale = 1;
    let lastKey = '';

    // 画面を覆うように写真の板を置く（object-fit: cover と同じ）。主役が画面の中央に来るよう左右を寄せる
    function layout() {
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      scale = Math.max(vw / W, vh / H);
      const pw = W * scale;
      const ph = H * scale;
      const left = Math.min(0, Math.max(vw - pw, vw / 2 - focusX * pw));
      const top = (vh - ph) * 0.15;
      Object.assign(plate.style, { width: `${pw}px`, height: `${ph}px`, left: `${left}px`, top: `${top}px` });
      cam.style.transformOrigin = `${(camX / W) * 100}% ${(camY / H) * 100}%`;
      plate.classList.add('is-ready');
      render(true);
    }

    function progress() {
      const rect = section.getBoundingClientRect();
      // 分母は画面に貼り付く板（stage）の高さ。Safari のアドレスバーで innerHeight が変わってもずれない
      const travel = Math.max(1, section.offsetHeight - stage.clientHeight);
      return clamp01(-rect.top / travel);
    }

    function render(force = false) {
      const on = animated();
      const p = on ? progress() : 1;
      const narrow = NARROW.matches;
      // 進み具合が前と同じなら何も書かない（画面の外では 0 か 1 に張り付くので、ここで止まる。動きを減らす設定でも同じ）
      const key = `${on}|${narrow}|${p.toFixed(4)}`;
      if (!force && key === lastKey) return;
      lastKey = key;

      partData.forEach(({ el, from, to, dy }) => {
        const t = easeInOut(span(p, from, to));
        el.style.transform = `translate3d(0, ${(dy * scale * t).toFixed(2)}px, 0)`;
      });

      // カメラ: 部品が降りるのに合わせて、組み上がる場所へ寄っていく。縦長の画面では寄らない（はみ出すため）
      const camT = easeInOut(span(p, 0.05, 0.8));
      const k = narrow ? camKNarrow : camK;
      cam.style.transform = `scale(${(1 + (k - 1) * camT).toFixed(4)})`;

      // 最後: 部品から組み上がった絵へ、その場で切り替える。間だけ軽くぼかして形の違いを隠す（ぼかしは 3px まで）
      const fade = span(p, 0.84, 0.92);
      const mid = fade > 0 && fade < 1;
      group.style.opacity = String(1 - fade);
      group.style.filter = mid ? `blur(${(fade * 3).toFixed(1)}px)` : 'none';
      finalImg.style.opacity = String(fade);
      finalImg.style.filter = mid ? `blur(${((1 - fade) * 3).toFixed(1)}px)` : 'none';

      // 最初の画面のうすい眼鏡: 部品（フロント）が降りてくるのに合わせて消す
      if (ghost) ghost.style.opacity = on ? (0.14 * (1 - span(p, 0.04, 0.2))).toFixed(3) : '0';
      // 区間の終わり: 暗く落とさず、次の区間の最初の絵（場面A）と同じ絵へ溶かす。
      // 次の区間（sequence.js）は1枚目を濃さ1から始めるので、つなぎ目のどの位置でも眼鏡か場面のどちらかが見えている
      if (handoff) handoff.style.opacity = on ? span(p, 0.93, 1).toFixed(3) : '0';

      section.style.setProperty('--progress', p.toFixed(3));
      captionData.forEach(({ el, from, to }) => el.classList.toggle('is-on', p >= from && p < to));
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; render(); });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', layout);
    motionQuery.addEventListener('change', layout);
    layout();
    // 初期化が最後まで済んだ印。head の保険が、両方の区間（組み上げ・入れ替わり）の印を見て静止画に戻すか決める
    document.documentElement.dataset.assemble = 'ready';
  }

  document.querySelectorAll('.scene--assemble').forEach(setupAssemble);
})();
