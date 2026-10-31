/* Selecting what to report.
   A leg is picked one at a time; photos within it are picked freely. */
(() => {
  /* Whichever leg is picked is the one the picker then asks about, so the
     chosen row hands its headline and its shots over to the picker's card.
     The headline moves as nodes rather than text — the stop's direction is a
     <small> inside it. */
  const carryOver = (row) => {
    const card = document.querySelector(
      '.view[data-view="report-photos"] .steps__body'
    );
    if (!card || !row.dataset.reportPhotos) return;

    const from = row.querySelector('.steps__title');
    const to = card.querySelector('.steps__title');
    if (from && to) to.replaceChildren(...from.cloneNode(true).childNodes);

    const tiles = card.querySelector('.select__tiles');
    if (!tiles) return;
    const add = tiles.querySelector('.select__tile--add');
    tiles
      .querySelectorAll('.select__tile:not(.select__tile--add)')
      .forEach((tile) => tile.remove());

    row.dataset.reportPhotos.split('|').forEach((entry) => {
      const [file, alt] = entry.split('::').map((part) => part.trim());
      if (!file) return;

      const tile = document.createElement('div');
      tile.className = 'select__tile';
      tile.setAttribute('data-selected', ''); // everything taken, offered up
      const img = document.createElement('img');
      img.src = `assets/photos/${file}`;
      img.alt = alt || '';
      tile.appendChild(img);
      tiles.insertBefore(tile, add);
    });
  };

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

    carryOver(row);
  });
})();
