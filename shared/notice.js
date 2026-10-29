/* Push banners behave like the real thing: a beat after the screen settles they
   drop in, hold long enough to be read, then leave. Re-entering the view shows
   them again. */
(() => {
  const token = (name, fallback) =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(name)
    ) || fallback;

  // A banner can come in sooner than the house default with data-delay.
  const delayFor = (notice) =>
    parseFloat(notice.dataset.delay) || token('--notice-delay', 2000);

  let timers = [];

  /* When the drawer is mid-transition there is already plenty to watch, so the
     banner waits its turn rather than competing with it. */
  const afterDrawer = (fn) => {
    const sheet = document.getElementById('sheet');
    if (!sheet || !sheet.classList.contains('is-dipping')) return fn();

    sheet.addEventListener('animationend', function settled(event) {
      if (event.animationName !== 'sheet-dip') return;
      sheet.removeEventListener('animationend', settled);
      fn();
    });
  };

  const run = () => {
    timers.forEach(clearTimeout);
    timers = [];

    document.querySelectorAll('.notice').forEach((notice) => {
      notice.classList.add('is-dismissed');
      if (notice.classList.contains('is-view-hidden')) return;

      afterDrawer(() => {
        timers.push(
          setTimeout(() => {
            // Two frames so the dismissed state lands before it is taken away,
            // otherwise there is nothing to transition from.
            requestAnimationFrame(() =>
              requestAnimationFrame(() =>
                notice.classList.remove('is-dismissed')
              )
            );

            // Android can actually buzz; iOS has no vibration API and desktop
            // has no hardware, so this is simply skipped there.
            navigator.vibrate?.([30, 60, 30]);

            timers.push(
              setTimeout(
                () => notice.classList.add('is-dismissed'),
                token('--notice-hold', 5000)
              )
            );
          }, delayFor(notice))
        );
      });
    });
  };

  /* A control can rewrite the banner of the view it hands over to — submitting
     photos turns the "you have shots to upload" nudge into a thank-you. On
     capture, so the new copy is in place before the router switches views. */
  document.addEventListener(
    'click',
    (event) => {
      const trigger = event.target.closest('[data-notice-title]');
      if (!trigger) return;

      const notice = document.querySelector(
        `.notice[data-for-view~="${trigger.dataset.goto}"]`
      );
      if (!notice) return;

      const { noticeTitle, noticeBody } = trigger.dataset;
      notice.querySelector('.notice__title').textContent = noticeTitle;
      if (noticeBody) {
        notice.querySelector('.notice__body').textContent = noticeBody;
      }
    },
    true
  );

  document.addEventListener('viewchange', run);
  run();
})();
