/* Drawer view router.
   Any element with data-goto="<view>" switches the drawer's contents to the
   view with that data-view. The shell — map, drawer, handle — stays put.

   A view owns the shell copy that belongs to it (data-title, data-subtitle),
   and anything floating over the drawer names the views it belongs to in
   data-for-view (space separated). */
(() => {
  const scroll = document.getElementById('sheetScroll');
  if (!scroll) return;

  const views = () => scroll.querySelectorAll('.view');
  const floaters = () => document.querySelectorAll('[data-for-view]');

  const belongsTo = (el, name) => el.dataset.forView.split(/\s+/).includes(name);

  /* Every view opens at the top of the step list, and on a phone three things
     fight that reset:

       - inertial scrolling. The viewer flicks the list down, taps through, and
         iOS carries the fling on straight through a scrollTop assignment — as
         far as it is concerned the gesture is still in charge.
       - a smooth scroll from the walk following its current leg, still in
         flight when the view swaps.
       - the browser pulling a newly shown or newly focused element into view.

     So the reset is not one assignment but a short guarded window: the
     scroller is shut (which is the part that actually cancels a fling), held
     at the top every frame, and any scroll that still slips through is undone
     until the window closes. */
  const GUARD_MS = 700;
  let guardUntil = 0;
  let pinning = 0;
  const guard = { undone: 0, lastAt: 0 };

  const topNow = () => {
    if (scroll.scrollTop === 0) return;
    guard.undone += 1;
    guard.lastAt = Math.round(scroll.scrollTop);
    scroll.scrollTop = 0;
  };

  scroll.addEventListener(
    'scroll',
    () => {
      if (performance.now() < guardUntil) topNow();
    },
    { passive: true }
  );

  const toTop = () => {
    guardUntil = performance.now() + GUARD_MS;
    // Taking the overflow away is what stops a fling mid-flight. The viewer
    // cannot scroll for these few frames, which is fine right after a
    // transition they did not scroll into.
    scroll.style.overflowY = 'hidden';
    topNow();

    cancelAnimationFrame(pinning);
    const pin = () => {
      topNow();
      if (performance.now() < guardUntil) {
        pinning = requestAnimationFrame(pin);
        return;
      }
      scroll.style.overflowY = '';
      scroll.scrollTop = 0;
    };
    pinning = requestAnimationFrame(pin);
  };

  // Read out by the ?debug panel, to tell a failed reset from a later scroll.
  window.__scrollGuard = guard;

  const applyShell = (target) => {
    const name = target.dataset.view;

    const title = document.querySelector('.head__title');
    if (title && target.dataset.title) title.textContent = target.dataset.title;

    const subtitle = document.querySelector('.head__subtitle');
    if (subtitle && target.dataset.subtitle) {
      subtitle.textContent = target.dataset.subtitle;
    }

    floaters().forEach((el) =>
      el.classList.toggle('is-view-hidden', !belongsTo(el, name))
    );
  };

  const show = (name) => {
    const target = scroll.querySelector(`.view[data-view="${name}"]`);
    if (!target || target.classList.contains('is-active')) return;

    // A button still holding focus gives the browser a reason to scroll the
    // outgoing view back into view as it disappears.
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.blur) focused.blur();

    views().forEach((view) => view.classList.toggle('is-active', view === target));
    applyShell(target);

    // Before the listeners, so anything that measures the list measures it
    // from the top; the guard goes on holding it there afterwards.
    toTop();
    document.dispatchEvent(
      new CustomEvent('viewchange', { detail: { view: name } })
    );
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-goto]');
    if (!trigger) return;
    event.preventDefault();
    show(trigger.dataset.goto);
  });

  /* data-reveal-view switches views once the element has been scrolled up to
     the top of its card — the stand-in for reaching that point by GPS. */
  document.querySelectorAll('[data-reveal-view]').forEach((el) => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        show(el.dataset.revealView);
      },
      { root: el.closest('.route'), rootMargin: '0px 0px -70% 0px' }
    );
    observer.observe(el);
  });

  const initial = scroll.querySelector('.view.is-active');
  if (initial) applyShell(initial);

  // Let a screen's own script react to or drive navigation.
  window.showView = show;
})();
