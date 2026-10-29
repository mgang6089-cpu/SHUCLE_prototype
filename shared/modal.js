/* Modal open/close.
   data-open-modal="<id>" opens, data-close-modal closes, Esc closes. */
(() => {
  const open = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = false;
  };

  const close = (modal) => {
    if (modal) modal.hidden = true;
  };

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-modal]');
    if (opener) {
      open(opener.dataset.openModal);
      return;
    }

    const closer = event.target.closest('[data-close-modal]');
    if (closer) close(closer.closest('.modal'));

    // The prototype runs once through; replaying means starting it over.
    if (event.target.closest('[data-restart]')) location.reload();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal:not([hidden])').forEach(close);
  });

  // Navigating away from a view closes whatever it had open.
  document.addEventListener('viewchange', () => {
    document.querySelectorAll('.modal:not([hidden])').forEach(close);
  });

  /* data-reveal-modal raises a modal once the element has been scrolled up to
     the top of its card — the stand-in for arriving there by GPS. The bottom
     margin keeps it from firing while the element is still further down the
     card, and it only fires once. */
  document.querySelectorAll('[data-reveal-modal]').forEach((el) => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        open(el.dataset.revealModal);
      },
      { root: el.closest('.route'), rootMargin: '0px 0px -70% 0px' }
    );
    observer.observe(el);
  });

  window.openModal = open;
})();
