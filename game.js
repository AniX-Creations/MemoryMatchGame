(() => {
  "use strict";

  const ANIMALS = [
    { name: "Lion", emoji: "🦁" }, { name: "Panda", emoji: "🐼" },
    { name: "Fox", emoji: "🦊" }, { name: "Frog", emoji: "🐸" },
    { name: "Monkey", emoji: "🐵" }, { name: "Penguin", emoji: "🐧" },
    { name: "Tiger", emoji: "🐯" }, { name: "Koala", emoji: "🐨" },
    { name: "Elephant", emoji: "🐘" }, { name: "Giraffe", emoji: "🦒" },
    { name: "Rabbit", emoji: "🐰" }, { name: "Bear", emoji: "🐻" }
  ];
  const PAIRS_BY_LEVEL = { easy: 8, medium: 10, hard: 12 };

  const board = document.getElementById("game-board");
  const movesValue = document.getElementById("moves");
  const timerValue = document.getElementById("timer");
  const matchesValue = document.getElementById("matches");
  const message = document.getElementById("message");
  const difficulty = document.getElementById("difficulty");
  const restartButton = document.getElementById("restart");
  const soundButton = document.getElementById("sound-toggle");
  const winDialog = document.getElementById("win-dialog");

  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let moves = 0;
  let matches = 0;
  let seconds = 0;
  let timerId = null;
  let started = false;
  let soundEnabled = true;
  let audioContext = null;

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function formatTime(value) {
    const mins = Math.floor(value / 60).toString().padStart(2, "0");
    const secs = (value % 60).toString().padStart(2, "0");
    return mins + ":" + secs;
  }

  function playTone(frequency, duration = 0.1, type = "sine") {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext ||= new AudioContextClass();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      // Audio is optional; the game remains fully playable if unavailable.
    }
  }

  function updateStats() {
    movesValue.textContent = String(moves);
    timerValue.textContent = formatTime(seconds);
    matchesValue.textContent = matches + " / " + PAIRS_BY_LEVEL[difficulty.value];
  }

  function startTimer() {
    if (started) return;
    started = true;
    timerId = window.setInterval(() => {
      seconds += 1;
      timerValue.textContent = formatTime(seconds);
    }, 1000);
  }

  function createCard(animal, index) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.dataset.name = animal.name;
    card.setAttribute("aria-label", "Hidden card " + (index + 1));
    card.innerHTML = `
      <span class="card-inner">
        <span class="card-face card-back" aria-hidden="true">?</span>
        <span class="card-face card-front" aria-hidden="true">${animal.emoji}</span>
      </span>`;
    card.addEventListener("click", () => revealCard(card, animal));
    return card;
  }

  function revealCard(card, animal) {
    if (lockBoard || card === firstCard || card.classList.contains("matched") || card.classList.contains("flipped")) return;
    startTimer();
    card.classList.add("flipped");
    card.setAttribute("aria-label", animal.name);
    playTone(420, 0.07);

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    moves += 1;
    updateStats();

    if (firstCard.dataset.name === secondCard.dataset.name) {
      firstCard.classList.add("matched");
      secondCard.classList.add("matched");
      firstCard.disabled = true;
      secondCard.disabled = true;
      matches += 1;
      message.textContent = "Lovely match! You found the " + animal.name + "s! 🎉";
      playTone(660, 0.12);
      window.setTimeout(() => playTone(880, 0.16), 90);
      firstCard = null;
      secondCard = null;
      updateStats();

      if (matches === PAIRS_BY_LEVEL[difficulty.value]) finishGame();
      return;
    }

    lockBoard = true;
    message.textContent = "Not a match. Remember those spots and try again!";
    window.setTimeout(() => {
      firstCard.classList.remove("flipped");
      secondCard.classList.remove("flipped");
      firstCard.setAttribute("aria-label", "Hidden card");
      secondCard.setAttribute("aria-label", "Hidden card");
      firstCard = null;
      secondCard = null;
      lockBoard = false;
    }, 850);
  }

  function finishGame() {
    window.clearInterval(timerId);
    timerId = null;
    message.textContent = "You did it! Every animal has a friend! 🏆";
    document.getElementById("final-moves").textContent = String(moves);
    document.getElementById("final-time").textContent = formatTime(seconds);
    window.setTimeout(() => { winDialog.hidden = false; }, 450);
    playTone(523, 0.18);
    window.setTimeout(() => playTone(659, 0.18), 150);
    window.setTimeout(() => playTone(784, 0.28), 300);
  }

  function newGame() {
    window.clearInterval(timerId);
    timerId = null;
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    moves = 0;
    matches = 0;
    seconds = 0;
    started = false;
    winDialog.hidden = true;
    message.textContent = "Ready, set, match! Find two of the same animal.";
    const pairCount = PAIRS_BY_LEVEL[difficulty.value];
    const chosen = ANIMALS.slice(0, pairCount);
    const cards = shuffle([...chosen, ...chosen]);
    board.replaceChildren(...cards.map((animal, index) => createCard(animal, index)));
    updateStats();
  }

  restartButton.addEventListener("click", newGame);
  document.getElementById("play-again").addEventListener("click", newGame);
  difficulty.addEventListener("change", newGame);
  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? "🔊 Sound on" : "🔇 Sound off";
    soundButton.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled) playTone(600, 0.08);
  });

  newGame();
})();