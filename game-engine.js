/* Чистая логика: замкнутое поле, бросок кубика и последовательность карточек. */
(function (root) {
  'use strict';
  const labels = { start: 'Старт', case: 'Кейс', task: 'Задание', creative: 'Креатив', request: 'Запрос', collab: 'Коллаб.', experiment: 'Креатив' };
  const types = ['start', 'case', 'creative', 'task', 'request', 'collab', 'case', 'experiment', 'task', 'request', 'collab', 'case', 'creative', 'task', 'request', 'collab', 'case', 'creative', 'task', 'request', 'collab', 'case'];
  const coordinates = [];
  for (let col = 0; col < 6; col++) coordinates.push({ row: 0, col });
  for (let row = 1; row < 7; row++) coordinates.push({ row, col: 5 });
  for (let col = 4; col >= 0; col--) coordinates.push({ row: 6, col });
  for (let row = 5; row >= 1; row--) coordinates.push({ row, col: 0 });
  const cells = coordinates.map((coord, index) => Object.freeze({ ...coord, index, type: types[index], label: labels[types[index]] }));
  function createGame(decks) {
    let position = 0, turn = 0;
    const cursors = Object.create(null);
    return {
      getState() { return { position, turn, cell: cells[position] }; },
      roll(random = Math.random) { return Math.min(6, Math.max(1, Math.floor(random() * 6) + 1)); },
      advance() { position = (position + 1) % cells.length; return this.getState(); },
      finishTurn() { turn++; return this.getState(); },
      draw(id) {
        const deck = decks.find(item => item.id === id);
        if (!deck || !Array.isArray(deck.cards) || !deck.cards.length) return null;
        const index = (cursors[id] || 0) % deck.cards.length;
        cursors[id] = (index + 1) % deck.cards.length;
        return { deck, card: deck.cards[index], index, total: deck.cards.length };
      },
      reset() { position = 0; turn = 0; Object.keys(cursors).forEach(key => delete cursors[key]); return this.getState(); }
    };
  }
  root.BusinessGame = Object.freeze({ cells: Object.freeze(cells), createGame });
})(typeof window === 'undefined' ? globalThis : window);
