/* The walk advances on its own, the way it will once GPS drives it.

   Any step marked data-auto-step takes part. Their states are derived from one
   pointer rather than being written into the markup, using the Anchor
   component's own vocabulary:

     before the pointer   지나옴      walked already
     at the pointer       이동중      the leg being travelled
     just after           도착예정    the node about to be reached
     further on           이동예정

   Steps outside that set — the boarding point, the ride, the destination —
   keep whatever state they were authored with.

   A step carrying data-open-modal raises it on arrival and the walk pauses
   there, waiting on the rider's answer; data-goto hands over to another view
   instead. Both also work on click, as a way to jump ahead while building. */
(() => {
  const stateFor = (index, pointer) => {
    if (index < pointer) return '지나옴';
    if (index === pointer) return '이동중';
    if (index === pointer + 1) return '도착예정';
    return '이동예정';
  };

  const duration = () =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--route-step-duration'
      )
    ) || 3000;

  let timer = null;

  const stop = () => {
    clearTimeout(timer);
    timer = null;
  };

  /* Nothing advances off-screen: the drawer follows the walk so the viewer
     never has to scroll to see what just changed. The header and ride card are
     pinned over the top of it, so the leg has to clear both of them. */
  const PEEK = 20;
  const stickyDepth = () =>
    ['.head-block', '.ride-block'].reduce((total, selector) => {
      const el = document.querySelector(selector);
      return total + (el ? el.offsetHeight : 0);
    }, 0);

  const follow = (step) => {
    const scroll = document.getElementById('sheetScroll');
    if (!scroll) return;

    const top = step.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    const ceiling = stickyDepth();

    // Already in view below the pinned header — leave the scroll alone rather
    // than dragging the list down on every single leg.
    if (top >= ceiling && top + step.offsetHeight <= scroll.clientHeight) return;

    scroll.scrollTo({
      top: scroll.scrollTop + top - ceiling - PEEK,
      behavior: 'smooth',
    });
  };

  /* A leg can carry its own read on how the timing is going — a long stretch
     puts the rider behind — which the status badge reflects while that leg is
     under way and drops again on the next one. */
  const BADGE_LABELS = {
    여유: '여유로워요',
    바쁨: '약간 바빠요',
    늦음: '서둘러주세요',
  };

  const setBadge = (state) => {
    document.querySelectorAll('.badge').forEach((badge) => {
      badge.dataset.state = state;
      const label = badge.querySelector('.badge__label');
      if (label) label.textContent = BADGE_LABELS[state];
    });
  };

  const paint = (steps, pointer) => {
    steps.forEach((step, index) => {
      const state = stateFor(index, pointer);
      step.dataset.state = state;
      const anchor = step.querySelector('.anchor');
      /* A node that is a place in its own right — the stop, the destination —
         names its color in data-anchor-state and keeps it throughout. The row's
         text still follows the walk, so it reads as the leg under way without
         the marker losing what it is. */
      if (anchor) anchor.dataset.state = step.dataset.anchorState || state;
    });
    setBadge(steps[pointer].dataset.badgeState || '여유');
  };

  // A leg can also ask for more time than the standard pace.
  const stepDuration = (step) =>
    parseFloat(step.dataset.stepDuration) || duration();

  const token = (name, fallback) =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(name)
    ) || fallback;

  /* A push banner gets the screen to itself: the walk waits for it to come and
     go before the first leg lights up. */
  const noticeHold = () => {
    const notice = document.querySelector('.notice:not(.is-view-hidden)');
    if (!notice) return 0;
    const delay =
      parseFloat(notice.dataset.delay) || token('--notice-delay', 2000);
    return delay + token('--notice-hold', 5000) + 600;
  };

  const start = (view) => {
    stop();
    if (!view) return;

    // Some views wait to be released rather than starting the moment they open
    // — the ride only resumes once the rider is done reporting photos.
    if (view.dataset.autoStart === 'held') return;

    const steps = [...view.querySelectorAll('[data-auto-step]')];
    if (steps.length < 2) return;

    let pointer = steps.findIndex((step) => step.dataset.state === '이동중');
    if (pointer < 0) pointer = 0;
    paint(steps, pointer);

    const advance = () => {
      if (pointer >= steps.length - 1) return stop();

      pointer += 1;
      paint(steps, pointer);
      follow(steps[pointer]);

      // Reaching a step can raise a popup or hand over to another view; either
      // way the walk stops here and whatever comes next takes over.
      const { openModal, goto } = steps[pointer].dataset;
      if (openModal || goto) {
        stop();
        if (openModal && window.openModal) window.openModal(openModal);
        else if (goto && window.showView) window.showView(goto);
        return;
      }
      timer = setTimeout(advance, stepDuration(steps[pointer]));
    };

    const hold = noticeHold();
    if (!hold) {
      timer = setTimeout(advance, stepDuration(steps[pointer]));
      return;
    }

    view.classList.add('is-holding');
    timer = setTimeout(() => {
      view.classList.remove('is-holding');
      timer = setTimeout(advance, stepDuration(steps[pointer]));
    }, hold);
  };

  /* data-resume-view lifts that hold on the way out. It runs on capture so the
     hold is already gone by the time the router switches views and asks us to
     start — otherwise the walk checks a lock that is about to be released. */
  document.addEventListener(
    'click',
    (event) => {
      const trigger = event.target.closest('[data-resume-view]');
      if (!trigger) return;
      const view = document.querySelector(
        `.view[data-view="${trigger.dataset.resumeView}"]`
      );
      if (view) delete view.dataset.autoStart;
    },
    true
  );

  document.addEventListener('viewchange', () =>
    start(document.querySelector('.view.is-active'))
  );

  start(document.querySelector('.view.is-active'));
})();
