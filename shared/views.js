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

  /* Every view opens at the top, and several things push back: a smooth scroll
     from the walk following its current leg can still be animating, the browser
     tries to keep whatever was on screen anchored as the views swap, and photos
     finishing their load shift the layout again. A single assignment loses to
     any of those, so the top is held every frame until things settle — long
     enough to outlast an in-flight scroll animation. */
  const SETTLE_MS = 700;
  let pinning = 0;

  const toTop = () => {
    cancelAnimationFrame(pinning);
    const until = performance.now() + SETTLE_MS;
    const pin = () => {
      scroll.scrollTop = 0;
      if (performance.now() < until) pinning = requestAnimationFrame(pin);
    };
    pin();
  };

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

    views().forEach((view) => view.classList.toggle('is-active', view === target));
    applyShell(target);

    document.dispatchEvent(
      new CustomEvent('viewchange', { detail: { view: name } })
    );
    // After the listeners, so nothing they do leaves the view part-scrolled.
    toTop();
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
