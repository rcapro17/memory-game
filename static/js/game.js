let selectedTheme = sessionStorage.getItem('theme');
let playerName = sessionStorage.getItem('playerName');
let startTime = null;
let timerInterval = null;
let revealed = [];
let matchedPairs = 0;
let cards = [];
const gameDuration = 100; // Game duration in seconds

document.addEventListener('DOMContentLoaded', () => {
  loadRankings(selectedTheme);
  renderCards();
});

function startGame() {
  if (!selectedTheme || !playerName) return;
  startTime = Date.now();
  matchedPairs = 0;
  cards = generateCards(selectedTheme);
  renderCards();
  startTimer();
}

function pauseGame() {
  clearInterval(timerInterval);
}

function backToTheme() {
  window.location.href = '/';
}

function generateCards(theme) {
  const cardImages = [];
  for (let i = 1; i <= 8; i++) {
    cardImages.push({ img: `${theme}/${i}_flag.png`, pair: `${i}_flag` });
    cardImages.push({ img: `${theme}/${i}_name.png`, pair: `${i}_name` });
  }
  return cardImages.sort(() => Math.random() - 0.5);
}

function renderCards() {
  const cardContainer = document.getElementById('cards');
  cardContainer.innerHTML = '';
  cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.dataset.index = index;
    cardElement.onclick = () => revealCard(index);
    cardContainer.appendChild(cardElement);
  });
}

function revealCard(index) {
  if (revealed.length < 2 && !cards[index].revealed) {
    const cardElement = document.querySelector(`.card[data-index='${index}']`);
    cardElement.style.backgroundImage = `url('/static/images/${cards[index].img}')`;
    cards[index].revealed = true;
    revealed.push(index);
    if (revealed.length === 2) {
      setTimeout(checkMatch, 1000);
    }
  }
}

function checkMatch() {
  const [index1, index2] = revealed;
  if (cards[index1].pair.split('_')[0] === cards[index2].pair.split('_')[0]) {
    matchedPairs++;
    if (matchedPairs === 8) {
      endGame(true);
    }
  } else {
    cards[index1].revealed = false;
    cards[index2].revealed = false;
    const cardElement1 = document.querySelector(
      `.card[data-index='${index1}']`
    );
    const cardElement2 = document.querySelector(
      `.card[data-index='${index2}']`
    );
    cardElement1.style.backgroundImage = '';
    cardElement2.style.backgroundImage = '';
  }
  revealed = [];
}

function startTimer() {
  const timerElement = document.getElementById('timer');
  timerElement.innerText = '0';
  timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timerElement.innerText = elapsedSeconds;
    if (elapsedSeconds >= gameDuration) {
      endGame(false);
    }
  }, 1000);
}

function endGame(win) {
  clearInterval(timerInterval);
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  if (win) {
    document.getElementById('modalPlayerName').textContent = playerName;
    document.getElementById('modalTheme').textContent = selectedTheme;
    document.getElementById('modalScore').textContent = elapsedSeconds;
    $('#scoreModal').modal('show');
    showScoreModal('Parabéns, Você Conseguiu!');
    postScore(playerName, selectedTheme, elapsedSeconds);
  } else {
    showScoreModal('Sorry! Game is Over!');
    alert('Game over! Better luck next time.');
  }
}

function showScoreModal(message) {
  document.getElementById('scoreModalLabel').textContent = message;
  $('#scoreModal').modal('show');
}

function postScore(playerName, theme, score) {
  fetch('/save_score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerName, theme, score }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Score submitted:', data);
      loadRankings(theme);
    });
}

function loadRankings(theme) {
  fetch(`/get_rankings?theme=${theme}`)
    .then((response) => response.json())
    .then((data) => {
      const rankingTable = document.getElementById('rankings');
      rankingTable.innerHTML = '';
      data.forEach((rank, index) => {
        const row = rankingTable.insertRow();
        row.insertCell(0).innerText = index + 1;
        row.insertCell(1).innerText = rank.name;
        row.insertCell(2).innerText = rank.time;
      });
    });
}

document.addEventListener('DOMContentLoaded', startGame);
