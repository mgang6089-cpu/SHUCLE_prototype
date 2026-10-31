(() => {
  const sheet = document.getElementById('sheet');
  const grab = document.getElementById('sheetGrab');
  const scroll = document.getElementById('sheetScroll');
  const hint = document.getElementById('hint');
  const cancelButton = document.getElementById('cancelButton');

  const readToken = (name) =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));

  const REST = readToken('--sheet-top-rest');
  const RAISED = readToken('--sheet-top-raised');

  let dragStartY = 0;
  let dragStartTop = REST;
  let currentTop = REST;

  const setTop = (top) => {
    currentTop = top;
    sheet.style.top = `${top}px`;
  };

  grab.addEventListener('pointerdown', (event) => {
    grab.setPointerCapture(event.pointerId);
    sheet.classList.remove('is-snapping');
    dragStartY = event.clientY;
    dragStartTop = currentTop;
  });

  grab.addEventListener('pointermove', (event) => {
    if (!grab.hasPointerCapture(event.pointerId)) return;
    const next = dragStartTop + (event.clientY - dragStartY);
    setTop(Math.min(REST, Math.max(RAISED, next)));
  });

  const endDrag = (event) => {
    if (!grab.hasPointerCapture(event.pointerId)) return;
    grab.releasePointerCapture(event.pointerId);
    sheet.classList.add('is-snapping');

    if (Math.abs(currentTop - dragStartTop) < 4) {
      setTop(currentTop === REST ? RAISED : REST);
      return;
    }
    setTop(currentTop < (REST + RAISED) / 2 ? RAISED : REST);
  };

  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);

  /* The hint only exists to say 호출 취소 is further down, so it steps aside once
     that button is actually in view — and comes back when it isn't. Measured on
     scroll rather than observed: an IntersectionObserver reports "intersecting"
     from the first sliver, which left the hint stuck hidden on the way back up.
     The bottom allowance is the strip the hint itself covers. */
  const HINT_CLEARANCE = 100;
  const syncHint = () => {
    if (cancelButton.offsetParent === null) return;
    const button = cancelButton.getBoundingClientRect();
    const view = scroll.getBoundingClientRect();
    const seen =
      button.top >= view.top && button.bottom <= view.bottom - HINT_CLEARANCE;
    hint.classList.toggle('is-hidden', seen);
  };

  scroll.addEventListener('scroll', syncHint, { passive: true });
  document.addEventListener('viewchange', () => requestAnimationFrame(syncHint));
  window.addEventListener('resize', syncHint);
  syncHint();

  /* Open the prototype with ?debug to read out what is actually scrolling.
     Nothing shows without the flag. */
  if (location.search.includes('debug')) {
    const panel = document.createElement('pre');
    panel.style.cssText =
      'position:absolute;left:0;right:0;top:0;z-index:999;margin:0;padding:6px 8px;' +
      'background:rgba(0,0,0,.78);color:#5f5;font:11px/1.45 ui-monospace,monospace;' +
      'pointer-events:none;white-space:pre';
    sheet.closest('.device').appendChild(panel);

    const doc = document.scrollingElement || document.documentElement;
    let entered = performance.now();
    let peak = 0;
    document.addEventListener('viewchange', () => {
      entered = performance.now();
      peak = 0;
    });

    const read = () => {
      const view = document.querySelector('.view.is-active');
      const max = Math.round(scroll.scrollHeight - scroll.clientHeight);
      const since = Math.round(performance.now() - entered);
      const g = window.__scrollGuard || { undone: 0, lastAt: 0 };
      peak = Math.max(peak, Math.round(scroll.scrollTop));
      panel.textContent =
        `view        ${view ? view.dataset.view : '-'}\n` +
        `since open  ${since}ms\n` +
        `steps       ${Math.round(scroll.scrollTop)} / ${max}   (peak ${peak})\n` +
        `undone      ${g.undone}  (last ${g.lastAt})\n` +
        `outer       ${Math.round(doc.scrollTop)} / ` +
        `${Math.round(document.body.scrollTop)} / ` +
        `${Math.round(sheet.closest('.device').scrollTop)}`;
      requestAnimationFrame(read);
    };
    read();
  }

  setTop(REST);

  /* data-goto-after-dip drops the drawer away, swaps the view at the bottom of
     the drop, and brings it back up — so a change of chapter doesn't read as
     the same screen scrolling. */
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-goto-after-dip]');
    if (!trigger) return;

    const style = getComputedStyle(document.documentElement);
    const dip = parseFloat(style.getPropertyValue('--sheet-dip-duration')) || 760;

    sheet.classList.remove('is-dipping');
    void sheet.offsetWidth; // let the animation restart if it is already playing
    sheet.classList.add('is-dipping');
    setTimeout(() => window.showView(trigger.dataset.gotoAfterDip), dip * 0.45);
  });

  sheet.addEventListener('animationend', (event) => {
    if (event.animationName === 'sheet-dip') sheet.classList.remove('is-dipping');
  });

  // The drawer waits just below its place while the opening notice is up, then
  // settles once the viewer starts.
  const intro = document.getElementById('intro');
  if (intro && !intro.hidden) {
    sheet.classList.add('is-entering');
    document.addEventListener(
      'click',
      (event) => {
        if (!event.target.closest('#intro [data-close-modal]')) return;
        sheet.classList.remove('is-entering');
      },
      { once: true }
    );
  }
})();
