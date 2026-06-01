/* =========================================================
   game.js — Biomas Brasileiros
   ========================================================= */

let selectedTheme = sessionStorage.getItem('theme');
let playerName    = sessionStorage.getItem('playerName');
let startTime     = null;
let timerInterval = null;
let revealed      = [];
let matchedPairs  = 0;
let cards         = [];

const gameDuration = 100; // seconds

// ── Hints ─────────────────────────────────────────────────
const hints = {
  Biomas: 'Associe cada animal ao bioma em que ele vive!',
};

// ── Theme → folder mapping (when folder name ≠ theme name) ─
const themeFolderMap = {
  'Digital Devices': 'Digital',
};

// ── Pairs count per theme (default 8) ─────────────────────
const themePairsMap = {
  Biomas: 6,
};

// ── Labels: shown on animal (_flag) cards + used for matching
// Both 3 and 6 are Caatinga → any flag+name pair with label
// "Caatinga" will match, preventing a number-only mismatch.
const cardLabels = {
  Biomas: {
    '1_flag': 'Pampas e Campos',  '1_name': 'Pampas e Campos',
    '2_flag': 'Mata Atlântica',   '2_name': 'Mata Atlântica',
    '3_flag': 'Pantanal',         '3_name': 'Pantanal',
    '4_flag': 'Amazônia',         '4_name': 'Amazônia',
    '5_flag': 'Cerrado',          '5_name': 'Cerrado',
    '6_flag': 'Caatinga',         '6_name': 'Caatinga',
  },
};

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateHint(selectedTheme);
  startGame();
});

// ── Game lifecycle ────────────────────────────────────────
function startGame() {
  if (!selectedTheme || !playerName) return;
  clearInterval(timerInterval);
  matchedPairs = 0;
  revealed     = [];
  cards        = generateCards(selectedTheme);
  renderCards();
  startTimer();
}

function backToTheme() {
  window.location.href = '/';
}

// ── Card generation ───────────────────────────────────────
function generateCards(theme) {
  const folder     = themeFolderMap[theme] || theme;
  const totalPairs = themePairsMap[theme]  || 8;
  const labels     = cardLabels[theme]     || {};
  const list       = [];

  for (let i = 1; i <= totalPairs; i++) {
    list.push({
      img:   `${folder}/${i}_flag.png`,
      pair:  `${i}_flag`,
      type:  'flag',
      label: labels[`${i}_flag`] || '',
    });
    list.push({
      img:   `${folder}/${i}_name.png`,
      pair:  `${i}_name`,
      type:  'name',
      label: labels[`${i}_name`] || '',
    });
  }
  return list.sort(() => Math.random() - 0.5);
}

// ── Render ────────────────────────────────────────────────
function renderCards() {
  const container = document.getElementById('cards');
  container.innerHTML = '';

  cards.forEach((card, index) => {
    // Outer card (holds perspective)
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    if (card.matched)       cardEl.classList.add('flipped', 'matched');
    else if (card.revealed) cardEl.classList.add('flipped');
    cardEl.dataset.index = index;

    // Inner (rotates)
    const inner = document.createElement('div');
    inner.classList.add('card-inner');

    // Cover (face-down side)
    const cover = document.createElement('div');
    cover.classList.add('card-cover');

    // Image (face-up side)
    const image = document.createElement('div');
    image.classList.add('card-image');
    image.style.backgroundImage = `url('/static/images/${card.img}')`;

    // Title only on animal (flag) cards
    if (card.type === 'flag' && card.label) {
      const title = document.createElement('div');
      title.classList.add('card-title');
      title.textContent = card.label;
      image.appendChild(title);
    }

    inner.appendChild(cover);
    inner.appendChild(image);
    cardEl.appendChild(inner);
    cardEl.addEventListener('click', () => revealCard(index));
    container.appendChild(cardEl);
  });
}

// ── Reveal ────────────────────────────────────────────────
function revealCard(index) {
  if (revealed.length >= 2 || cards[index].revealed || cards[index].matched) return;

  const el = document.querySelector(`.card[data-index='${index}']`);
  el.classList.add('flipped');
  cards[index].revealed = true;
  revealed.push(index);

  if (revealed.length === 2) setTimeout(checkMatch, 1000);
}

// ── Match check ───────────────────────────────────────────
// Matching rule:
//   • If both cards have labels → same label + different types (flag vs name)
//   • Fallback (no labels) → same number prefix
// This makes both Caatinga pairs valid regardless of card number.
function checkMatch() {
  const [i1, i2] = revealed;
  const c1 = cards[i1];
  const c2 = cards[i2];

  // Strict number-based matching: 1_flag only matches 1_name, etc.
  const isMatch = c1.pair.split('_')[0] === c2.pair.split('_')[0];

  if (isMatch) {
    c1.matched = true; c1.revealed = false;
    c2.matched = true; c2.revealed = false;

    const el1 = document.querySelector(`.card[data-index='${i1}']`);
    const el2 = document.querySelector(`.card[data-index='${i2}']`);
    el1.classList.add('matched');
    el2.classList.add('matched');

    matchedPairs++;
    const totalPairs = themePairsMap[selectedTheme] || 8;
    if (matchedPairs === totalPairs) setTimeout(() => endGame(true), 600);

  } else {
    c1.revealed = false;
    c2.revealed = false;
    const el1 = document.querySelector(`.card[data-index='${i1}']`);
    const el2 = document.querySelector(`.card[data-index='${i2}']`);
    // Small delay so player sees both cards before flip-back
    setTimeout(() => {
      el1.classList.remove('flipped');
      el2.classList.remove('flipped');
    }, 300);
  }

  revealed = [];
}

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
  const timerEl = document.getElementById('timer');
  timerEl.textContent = '0';
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = elapsed;
    if (elapsed >= gameDuration) endGame(false);
  }, 1000);
}

// ── End game ──────────────────────────────────────────────
function endGame(win) {
  clearInterval(timerInterval);
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  if (win) {
    document.getElementById('modalPlayerName').textContent = playerName;
    document.getElementById('modalTheme').textContent      = selectedTheme;
    document.getElementById('modalScore').textContent      = elapsed;
    showScoreModal('Parabéns! Você completou o jogo! 🎉');
    postScore(playerName, selectedTheme, elapsed);
  } else {
    document.getElementById('modalPlayerName').textContent = playerName;
    document.getElementById('modalTheme').textContent      = selectedTheme;
    document.getElementById('modalScore').textContent      = elapsed;
    showScoreModal('Tempo esgotado! Tente novamente. ⏱️');
  }
}

function showScoreModal(message) {
  document.getElementById('scoreModalLabel').textContent = message;
  $('#scoreModal').modal('show');
}

// ── Persist score ─────────────────────────────────────────
function postScore(name, theme, score) {
  fetch('/save_score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: name, theme, score }),
  })
    .then((r) => r.json())
    .then((data) => console.log('Score saved:', data))
    .catch((err) => console.error('Error saving score:', err));
}

// ── Rankings (only used if table exists on the page) ───────
function loadRankings(theme) {
  const table = document.getElementById('rankings');
  if (!table) return;
  fetch(`/get_rankings?theme=${encodeURIComponent(theme)}`)
    .then((r) => r.json())
    .then((data) => {
      table.innerHTML = '';
      if (!Array.isArray(data)) return;
      data.forEach((rank, i) => {
        const row = table.insertRow();
        row.insertCell(0).textContent = i + 1;
        row.insertCell(1).textContent = rank.name;
        row.insertCell(2).textContent = rank.time;
      });
    })
    .catch((err) => console.error('Rankings error:', err));
}

// ── Hint ──────────────────────────────────────────────────
function updateHint(theme) {
  const el = document.getElementById('game-hint');
  if (el) el.textContent = hints[theme] || '';
}
