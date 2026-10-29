/* Selecting what to report.
   A leg is picked one at a time; photos within it are picked freely. */
(() => {
  document.addEventListener('click', (event) => {
    const tile = event.target.closest('.select__tile:not(.select__tile--add)');
    if (tile) {
      tile.toggleAttribute('data-selected');
      return;
    }

    const row = event.target.closest('.select');
    if (!row) return;
    row
      .closest('.route__list')
      .querySelectorAll('.select')
      .forEach((el) => el.toggleAttribute('data-selected', el === row));
  });
})();
