let questions = [];
let currentIndex = 0;

/* Load JSON question bank */
function loadQuiz(jsonFile) {
  fetch(jsonFile)
    .then(response => response.json())
    .then(data => {
      questions = shuffleArray(data.questions);
      currentIndex = 0;
      renderQuestion();
    });
}

/* Render one question */
function renderQuestion() {
  const quiz = document.getElementById("quiz");
  const nextBtn = document.getElementById("next-btn");

  nextBtn.disabled = true;
  nextBtn.classList.remove("enabled");

  const q = questions[currentIndex];

  // build option objects ONCE per render
  const optionObjects = q.options.map((opt, i) => ({
    text: opt,
    isCorrect: i === q.correct
  }));

  // shuffle the option objects
  const shuffledOptions = shuffleArray(optionObjects);

  // find new correct index
  const correctIndex = shuffledOptions.findIndex(o => o.isCorrect);

  quiz.innerHTML = `
    <p class="q-text">${q.question}</p>

    <ul class="options">
      ${shuffledOptions.map((opt, i) => `
        <li data-index="${i}">
          <label>
            <input type="checkbox">
            ${opt.text}
          </label>
        </li>
      `).join("")}
    </ul>

    <div class="feedback">${q.feedback}</div>
  `;

  setupInteraction(correctIndex);
}

/* Handle option selection */
function setupInteraction(correctIndex) {
  const options = document.querySelectorAll(".options li");
  const feedback = document.querySelector(".feedback");
  const nextBtn = document.getElementById("next-btn");

  options.forEach((opt, index) => {
    opt.addEventListener("click", () => {

      /* Disable further clicks */
      options.forEach(o => o.style.pointerEvents = "none");

      if (index === correctIndex) {
        opt.classList.add("correct");
      } else {
        opt.classList.add("incorrect");
        options[correctIndex].classList.add("correct");
      }

      feedback.style.display = "block";
      nextBtn.disabled = false;
      nextBtn.classList.add("enabled");
    });
  });
}

/* Next question logic */
document.getElementById("next-btn").addEventListener("click", () => {
  currentIndex++;

  if (currentIndex >= questions.length) {
    // restart from beginning
    currentIndex = 0;
    questions = shuffleArray(questions);
  }

  renderQuestion();
});

/* Utility: shuffle array */
function shuffleArray(array) {
  const arr = array.slice();

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}
