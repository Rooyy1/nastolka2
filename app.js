/* Интерфейс демо. Все тексты игровых карточек находятся в cards.js. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const decks = window.GAME_DECKS;
  const { cells, createGame } = window.BusinessGame;
  const game = createGame(decks);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false, generation = 0, currentDeck = null, returnFocus = null;
  const cardDialog = $('card-dialog');
  const rulesDialog = $('rules-dialog');
  const players = [
    { color: 'red', name: 'Ваша фишка', position: 0 },
    { color: 'blue', name: 'Игрок 2 — демонстрационная фишка', position: 5 },
    { color: 'green', name: 'Игрок 3 — демонстрационная фишка', position: 11 },
    { color: 'yellow', name: 'Игрок 4 — демонстрационная фишка', position: 16 }
  ];
  // Простые пиктограммы категорий служат навигацией по полю и стопкам.
  const shapes = {
    start: '<path d="M5 20V4m0 1h12l-3 4 3 4H5"/>',
    case: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M4 12c5 3 11 3 16 0M10 13h4"/>',
    task: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 14l2 2 4-5"/>',
    creative: '<path d="M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/>',
    request: '<path d="M20 11a8 8 0 0 1-8 8H4l2-4a8 8 0 1 1 14-4Z"/><path d="M8 10h8m-8 4h5"/>',
    collab: '<rect x="3" y="6" width="11" height="11" rx="4"/><rect x="10" y="9" width="11" height="11" rx="4"/>',
    experiment: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>'
  };
  function icon(type) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + shapes[type] + '</svg>'; }
  function renderBoard() {
    const list = $('board-cells');
    cells.forEach(cell => {
      const li = document.createElement('li');
      li.className = 'cell ' + (cell.type === 'start' ? 'start-cell ' : '') + 'type-' + cell.type;
      li.style.gridArea = `${cell.row + 1} / ${cell.col + 1}`;
      li.dataset.index = cell.index;
      li.setAttribute('aria-label', (cell.index === 0 ? '' : 'Клетка ' + cell.index + ': ') + (cell.type === 'collab' ? 'Коллаборация' : cell.label));
      li.innerHTML = '<span class="cell-number">' + (cell.index ? String(cell.index).padStart(2, '0') : '↗') + '</span><span class="cell-icon">' + icon(cell.type) + '</span><span class="cell-label">' + cell.label + '</span>';
      list.appendChild(li);
    });
    players.forEach((player, index) => {
      const token = document.createElement('div');
      token.className = 'token ' + player.color;
      token.id = 'token-' + index;
      token.innerHTML = '<span aria-hidden="true">' + (index + 1) + '</span>';
      token.setAttribute('role', 'img');
      $('tokens-layer').appendChild(token);
    });
    updatePositions();
  }
  function updatePositions() {
    const groups = new Map();
    players.forEach((player, index) => {
      if (!groups.has(player.position)) groups.set(player.position, []);
      groups.get(player.position).push(index);
    });
    groups.forEach((indices, position) => {
      const cell = cells[position];
      indices.forEach((index, offset) => {
        const token = $('token-' + index);
        const spread = (offset - (indices.length - 1) / 2) * 17;
        const anchor = indices.length > 1 ? 0.55 : 0.77;
        token.style.left = `calc(${(cell.col + anchor) / 6 * 100}% + ${spread}px)`;
        token.style.top = ((cell.row + 0.25) / 7 * 100) + '%';
        token.setAttribute('aria-label', players[index].name + ': ' + (position === 0 ? 'старт' : 'клетка ' + position + ', ' + cell.label));
      });
    });
    document.querySelectorAll('.cell').forEach((cell, index) => {
      const active = index === players[0].position;
      cell.classList.toggle('current-cell', active);
      if (active) cell.setAttribute('aria-current', 'step'); else cell.removeAttribute('aria-current');
    });
  }
  function renderDecks() {
    decks.forEach((deck, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'deck deck-' + deck.id;
      button.dataset.deck = deck.id;
      button.style.setProperty('--deck-color', deck.color);
      button.setAttribute('aria-label', 'Открыть стопку «' + deck.title + ' — ' + deck.subtitle + '»');
      button.innerHTML = '<span class="deck-top"><span>' + String(index + 1).padStart(2, '0') + '</span><span class="deck-arrow" aria-hidden="true">↗</span></span><span class="deck-icon">' + icon(deck.icon) + '</span><span class="deck-title"></span><span class="deck-subtitle"></span><span class="deck-bottom"><span>Карточек: ' + deck.cards.length + '</span><span class="deck-small-mark" aria-hidden="true">Б / И</span></span>';
      button.querySelector('.deck-title').textContent = deck.title;
      button.querySelector('.deck-subtitle').textContent = deck.subtitle;
      button.addEventListener('click', () => openCard(deck.id, false, button));
      $('decks-grid').appendChild(button);
    });
  }
  const pipMaps = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function setDie(value) {
    $('die-pips').replaceChildren();
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip' + (pipMaps[value].includes(i) ? ' filled' : '');
      $('die-pips').appendChild(pip);
    }
    $('die').setAttribute('aria-label', 'Кубик: ' + value);
    $('die').dataset.value = value;
  }
  function setBusy(value) {
    busy = value;
    $('roll-button').disabled = value;
    $('rules-button').disabled = value;
    document.querySelectorAll('.deck').forEach(button => { button.disabled = value; });
    $('board').setAttribute('aria-busy', String(value));
  }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  function stepWord(count) { return count === 1 ? 'клетку' : count < 5 ? 'клетки' : 'клеток'; }
  async function rollDice() {
    if (busy || cardDialog.open || rulesDialog.open) return;
    const run = ++generation;
    setBusy(true);
    $('roll-button-text').textContent = 'Бросаем…';
    $('roll-status').textContent = 'Кубик в игре…';
    $('die').classList.add('rolling');
    const value = game.roll();
    const frames = reducedMotion.matches ? 1 : 9;
    for (let i = 0; i < frames; i++) {
      setDie(game.roll());
      await pause(reducedMotion.matches ? 40 : 65 + i * 5);
      if (run !== generation) return;
    }
    $('die').classList.remove('rolling');
    setDie(value);
    $('center-title').textContent = 'Выпало ' + value;
    $('center-subtitle').textContent = 'Вперёд на ' + value + ' ' + stepWord(value);
    $('roll-button-text').textContent = 'Фишка в пути…';
    $('roll-status').textContent = 'Выпало ' + value + '. Перемещаем фишку.';
    for (let step = 0; step < value; step++) {
      await pause(reducedMotion.matches ? 60 : 240);
      if (run !== generation) return;
      players[0].position = game.advance().position;
      updatePositions();
    }
    const state = game.finishTurn();
    $('turn-counter').textContent = String(state.turn + 1).padStart(2, '0');
    $('position-label').textContent = state.position ? 'Клетка ' + String(state.position).padStart(2, '0') + ' / 21' : 'На старте';
    $('roll-button-text').textContent = 'Бросить ещё';
    const deck = decks.find(item => item.id === state.cell.type);
    $('center-subtitle').textContent = deck ? 'Ваша клетка — «' + deck.title + '»' : 'Полный круг! Продолжаем игру.';
    $('roll-status').textContent = deck ? 'Открываем карточку «' + deck.title + '»' : 'Вы на старте. Бросьте кубик ещё раз.';
    await pause(reducedMotion.matches ? 60 : 450);
    if (run !== generation) return;
    setBusy(false);
    if (deck) openCard(deck.id, true, $('roll-button'));
  }
  function openCard(id, fromBoard = false, trigger = null) {
    if (busy || rulesDialog.open) return false;
    const drawn = game.draw(id);
    if (!drawn) return false;
    const { deck, card, index, total } = drawn;
    currentDeck = id;
    cardDialog.style.setProperty('--card-color', deck.color);
    $('card-deck-label').textContent = deck.title + ' / ' + deck.subtitle;
    $('card-counter').textContent = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    $('card-type-icon').innerHTML = icon(deck.icon);
    $('card-origin').textContent = fromBoard ? 'ВАША КЛЕТКА — ' + deck.title.toUpperCase() : 'КАРТОЧКА ИЗ СТОПКИ';
    $('card-title').textContent = card.title;
    $('card-body').textContent = card.text;
    $('card-question').textContent = card.question;
    if (!cardDialog.open) {
      returnFocus = trigger || document.activeElement;
      cardDialog.showModal();
      syncDialogLock();
      $('continue-button').focus();
    }
    return true;
  }
  function syncDialogLock() { document.body.classList.toggle('dialog-open', cardDialog.open || rulesDialog.open); }
  function closeCard() { if (cardDialog.open) cardDialog.close(); }
  cardDialog.addEventListener('close', () => {
    syncDialogLock();
    $('roll-status').textContent = game.getState().turn ? 'Готовы к следующему ходу?' : 'Нажмите, чтобы начать';
    if (returnFocus?.isConnected && !returnFocus.disabled) returnFocus.focus();
    returnFocus = null;
  });
  rulesDialog.addEventListener('close', syncDialogLock);
  // Нативный dialog обеспечивает Escape, удержание фокуса и блокировку фона.
  [cardDialog, rulesDialog].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  function resetGame() {
    generation++;
    closeCard();
    if (rulesDialog.open) rulesDialog.close();
    game.reset();
    currentDeck = null;
    players[0].position = 0;
    updatePositions();
    setBusy(false);
    setDie(3);
    $('die').classList.remove('rolling');
    $('turn-counter').textContent = '01';
    $('position-label').textContent = 'На старте';
    $('center-title').textContent = 'Сделайте первый ход';
    $('center-subtitle').textContent = 'Ваша фишка — красная. Посмотрим, что выпадет?';
    $('roll-button-text').textContent = 'Бросить кубик';
    $('roll-status').textContent = 'Игра начата заново. Бросьте кубик.';
    $('roll-button').focus();
  }
  $('roll-button').addEventListener('click', rollDice);
  $('reset-button').addEventListener('click', resetGame);
  $('close-card').addEventListener('click', closeCard);
  $('continue-button').addEventListener('click', closeCard);
  $('next-card').addEventListener('click', () => openCard(currentDeck));
  $('rules-button').addEventListener('click', () => { if (!busy) { rulesDialog.showModal(); syncDialogLock(); } });
  $('close-rules').addEventListener('click', () => rulesDialog.close());
  $('start-playing').addEventListener('click', () => { rulesDialog.close(); $('roll-button').focus(); });
  renderBoard();
  renderDecks();
  setDie(3);
  // Минимальный интерфейс для поддерживающих WebMCP браузеров, без внешних сервисов.
  const modelContext = document.modelContext;
  if (modelContext && typeof modelContext.registerTool === 'function') {
    const lifecycle = new AbortController();
    const register = tool => {
      try { Promise.resolve(modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {}
    };
    window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); }, { once: true });
    const result = data => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
    try {
      register({ name: 'get_game_state', description: 'Текущее положение красной фишки, номер хода и состояние карточки бизнес-игры.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async () => result({ ...game.getState(), busy, openDeck: cardDialog.open ? currentDeck : null, availableDecks: decks.map(deck => ({ id: deck.id, title: deck.title, subtitle: deck.subtitle })) }) });
      register({ name: 'roll_dice', description: 'Бросить кубик, переместить красную фишку и открыть карточку. Перед броском открытые правила или карточку нужно закрыть.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async () => { if (busy || cardDialog.open || rulesDialog.open) return result({ error: 'Сначала завершите текущее действие и закройте карточку или правила.' }); await rollDice(); return result(game.getState()); } });
      register({ name: 'open_game_card', description: 'Открыть следующую карточку выбранной стопки бизнес-игры.', inputSchema: { type: 'object', properties: { deck: { type: 'string', enum: decks.map(deck => deck.id) } }, required: ['deck'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async input => { if (!input || typeof input !== 'object' || !decks.some(deck => deck.id === input.deck)) return result({ error: 'Неизвестная стопка карточек.' }); return result({ opened: openCard(input.deck) }); } });
      register({ name: 'close_game_card', description: 'Закрыть открытую карточку и вернуться на поле бизнес-игры.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async () => { closeCard(); return result({ closed: true }); } });
    } catch (error) { /* Необязательный API не влияет на игровую механику. */ }
  }
})();
