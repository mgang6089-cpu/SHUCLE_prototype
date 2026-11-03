(() => {
  const sheet = document.getElementById('sheet');
  const grab = document.getElementById('sheetGrab');
  const scroll = document.getElementById('sheetScroll');
  const hint = document.getElementById('hint');
  const cancelButton = document.getElementById('cancelButton');

  const readToken = (name) =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));

  const REST = readToken('--layout-sheet-rest');
  const RAISED = readToken('--layout-sheet-raised');

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

  setTop(REST);

  /* data-goto-after-dip drops the drawer away, swaps the view at the bottom of
     the drop, and brings it back up — so a change of chapter doesn't read as
     the same screen scrolling. */
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-goto-after-dip]');
    if (!trigger) return;

    const style = getComputedStyle(document.documentElement);
    const dip = parseFloat(style.getPropertyValue('--dur-sheet-dip')) || 760;

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
