(function () {
  function mountRedhawk(containerEl, size = 40) {
    const rig = window.REDHAWK_RIG_DATA;
    if (!rig || !containerEl) return null;

    const svgNS = 'http://www.w3.org/2000/svg';
    containerEl.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="160 160 934 934" xmlns="${svgNS}" style="display:block;cursor:pointer;user-select:none;">
        <g data-rh="root">
          <path d="M 619,506 L 804,514 L 839,629 L 669,639 Z" fill="#120306" />
          <g>
            <polygon points="634,510 729,510 809,604 709,604" fill="#2b060e" />
            <g data-rh="pupilGroup">
              <rect data-rh="irisTop" x="697" y="528" width="42" height="16" fill="#ffae00" />
              <rect data-rh="irisBot" x="715" y="544" width="42" height="16" fill="#ffae00" />
              <rect x="709" y="530" width="24" height="24" fill="#ffffff" />
              <rect data-rh="pupilCore" x="718" y="534" width="12" height="14" fill="#00f2fe" />
            </g>
            <g data-rh="happyEye" opacity="0">
              <rect x="694" y="538" width="14" height="14" fill="#10b981" />
              <rect x="708" y="526" width="16" height="14" fill="#ffdf40" />
              <rect x="724" y="538" width="14" height="14" fill="#10b981" />
            </g>
            <polygon data-rh="eyelid" points="634,510 729,510 809,604 709,604" fill="#180307" opacity="0" />
          </g>
          <g data-rh="cheekGroup">
            <path fill="#d40014" stroke="#ff3848" stroke-width="1.5" d="${rig.cheekD}" />
          </g>
          <g>
            <path data-rh="headPath" fill="#d40014" stroke="#ff3848" stroke-width="1.5" d="" />
            <path data-rh="crestPixels" fill="#ff3848" d="${rig.crestPixelsD}" />
          </g>
          <g data-rh="upperBeak">
            <path fill="#d40014" stroke="#ff4858" stroke-width="1.5" d="${rig.upperBeakD}" />
          </g>
          <g data-rh="lowerBeak">
            <path fill="#d40014" stroke="#ff3848" stroke-width="1.5" d="${rig.lowerBeakD}" />
          </g>
        </g>
      </svg>
    `;

    const q = (name) => containerEl.querySelector(`[data-rh="${name}"]`);
    const rootG = q('root');
    const headPath = q('headPath');
    const crestPixels = q('crestPixels');
    const cheekGroup = q('cheekGroup');
    const upperBeak = q('upperBeak');
    const lowerBeak = q('lowerBeak');
    const pupilGroup = q('pupilGroup');
    const irisTop = q('irisTop');
    const irisBot = q('irisBot');
    const pupilCore = q('pupilCore');
    const happyEye = q('happyEye');
    const eyelid = q('eyelid');

    let state = 'idle';
    let lastTime = performance.now();
    let blinkTimer = 0;
    let nextBlinkIn = 2.4;
    let isBlinking = false;
    let pettingBoost = 0;
    let pointer = { x: 0, y: 0, active: false, lastMove: 0 };

    const pose = {
      headX: 0, headY: 0, headRot: 0, headScaleX: 1, headScaleY: 1,
      crestFlare: 0, crestLift: 0, browDrop: 0, gazeX: 0, gazeY: 0,
      blink: 0, happyEye: 0, jawOpen: 0, pulse: 0
    };

    containerEl.addEventListener('click', () => { pettingBoost = 1.0; });
    window.addEventListener('pointermove', (e) => {
      const r = containerEl.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(window.innerWidth * 0.5, 200);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(window.innerHeight * 0.5, 200);
      pointer = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)), active: true, lastMove: performance.now() };
    });

    const [hcx, hcy] = rig.pivots.head;
    const [ubx, uby] = rig.pivots.upperBeak;
    const [lbx, lby] = rig.pivots.lowerBeak;

    function frame(now) {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000.0));
      lastTime = now;
      const t = now / 1000.0;

      if (pettingBoost > 0) pettingBoost = Math.max(0, pettingBoost - dt * 0.65);

      blinkTimer += dt;
      let blinkVal = 0;
      if (!isBlinking && blinkTimer >= nextBlinkIn) { isBlinking = true; blinkTimer = 0; }
      if (isBlinking) {
        if (blinkTimer < 0.16) blinkVal = Math.sin((blinkTimer / 0.16) * Math.PI);
        else { isBlinking = false; blinkTimer = 0; nextBlinkIn = 2.2 + Math.random() * 3.0; }
      }

      const tp = {
        headX: 0,
        headY: Math.sin(t * 2.1) * 6,
        headRot: Math.sin(t * 1.1) * 1.2,
        headScaleX: 1,
        headScaleY: 1 + Math.sin(t * 2.1) * 0.008,
        crestFlare: Math.sin(t * 2.1 - 0.4) * 3.0,
        crestLift: 0,
        browDrop: 0,
        gazeX: Math.sin(t * 0.8) * 0.25,
        gazeY: Math.cos(t * 0.6) * 0.15,
        blink: blinkVal,
        happyEye: 0,
        jawOpen: 0,
        pulse: 0
      };

      if (state === 'active') {
        tp.headY = Math.sin(t * 5.0) * 14 - 8;
        tp.crestFlare = 18 + Math.sin(t * 8.0) * 6;
        tp.jawOpen = 0.25 + Math.abs(Math.sin(t * 4.5)) * 0.2;
        tp.pulse = 0.8;
      }

      if (pointer.active && now - pointer.lastMove < 3500) {
        tp.gazeX = pointer.x * 0.85;
        tp.gazeY = pointer.y * 0.7;
      }

      if (pettingBoost > 0) {
        tp.happyEye = pettingBoost;
        tp.crestFlare += Math.sin(t * 18) * 12 * pettingBoost;
        tp.jawOpen = Math.max(tp.jawOpen, pettingBoost * 0.4);
      }

      const alpha = 1 - Math.exp(-14.0 * dt);
      for (const k of Object.keys(pose)) pose[k] += (tp[k] - pose[k]) * alpha;

      const crestLift = -pose.crestFlare * 1.15;
      const crestSpread = pose.crestFlare * 0.35;
      const waveAmp = 2.5 + pose.pulse * 6.5;
      const segs = rig.headSegs;
      const dParts = new Array(segs.length + 1);
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s[0] === 'M') {
          const x = s[1], y = s[2], cw = s[3], bw = s[4];
          const w = cw > 0.05 ? Math.sin(t * 6.0 - x * 0.018) * waveAmp * cw : 0;
          dParts[i] = `M${(x - crestSpread * cw).toFixed(1)},${(y + crestLift * cw + w + pose.browDrop * bw).toFixed(1)}`;
        } else {
          const x1 = s[1], y1 = s[2], cw1 = s[3], bw1 = s[4];
          const x2 = s[5], y2 = s[6], cw2 = s[7], bw2 = s[8];
          const x3 = s[9], y3 = s[10], cw3 = s[11], bw3 = s[12];
          const w1 = cw1 > 0.05 ? Math.sin(t * 6.0 - x1 * 0.018) * waveAmp * cw1 : 0;
          const w2 = cw2 > 0.05 ? Math.sin(t * 6.0 - x2 * 0.018) * waveAmp * cw2 : 0;
          const w3 = cw3 > 0.05 ? Math.sin(t * 6.0 - x3 * 0.018) * waveAmp * cw3 : 0;
          dParts[i] =
            `C${(x1 - crestSpread * cw1).toFixed(1)},${(y1 + crestLift * cw1 + w1 + pose.browDrop * bw1).toFixed(1)} ` +
            `${(x2 - crestSpread * cw2).toFixed(1)},${(y2 + crestLift * cw2 + w2 + pose.browDrop * bw2).toFixed(1)} ` +
            `${(x3 - crestSpread * cw3).toFixed(1)},${(y3 + crestLift * cw3 + w3 + pose.browDrop * bw3).toFixed(1)}`;
        }
      }
      dParts[segs.length] = 'Z';

      const jaw = Math.max(0, pose.jawOpen);
      rootG.setAttribute('transform',
        `translate(${pose.headX.toFixed(2)}, ${pose.headY.toFixed(2)}) translate(${hcx}, ${hcy}) rotate(${pose.headRot.toFixed(2)}) scale(${pose.headScaleX.toFixed(3)}, ${pose.headScaleY.toFixed(3)}) translate(${-hcx}, ${-hcy})`
      );
      headPath.setAttribute('d', dParts.join(' '));
      crestPixels.setAttribute('transform', `translate(${(-crestSpread * 0.5).toFixed(1)}, ${(crestLift * 0.55 + Math.sin(t * 5.0) * 2.5).toFixed(1)})`);
      cheekGroup.setAttribute('transform', `translate(0, ${(jaw * 3.5).toFixed(1)})`);
      upperBeak.setAttribute('transform', `translate(${ubx}, ${uby}) rotate(${(-jaw * 6.5).toFixed(2)}) translate(${-ubx}, ${-uby})`);
      lowerBeak.setAttribute('transform', `translate(0, ${(jaw * 5.5).toFixed(1)}) translate(${lbx}, ${lby}) rotate(${(jaw * 21.5).toFixed(2)}) translate(${-lbx}, ${-lby})`);
      pupilGroup.setAttribute('transform', `translate(${(pose.gazeX * 15).toFixed(1)}, ${(pose.gazeY * 10).toFixed(1)})`);
      pupilGroup.setAttribute('opacity', (1 - pose.happyEye * 0.95).toFixed(2));
      const irisColor = state === 'active' ? '#00f2fe' : '#ffae00';
      irisTop.setAttribute('fill', irisColor);
      irisBot.setAttribute('fill', irisColor);
      happyEye.setAttribute('opacity', pose.happyEye.toFixed(2));
      eyelid.setAttribute('opacity', Math.min(1, pose.blink).toFixed(2));

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return { setState: (s) => { state = s; } };
  }

  window.mountRedhawk = mountRedhawk;
})();
