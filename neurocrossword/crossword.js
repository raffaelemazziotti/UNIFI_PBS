(() => {
  "use strict";

  const data = window.CROSSWORD_DATA;
  if (!data || !Array.isArray(data.entries)) {
    document.body.textContent = "Crossword data could not be loaded.";
    return;
  }

  const STORAGE_KEY = "unifi-neurocrossword-progress";
  const gridEl = document.getElementById("crosswordGrid");
  const scrollerEl = document.getElementById("gridScroller");
  const acrossEl = document.getElementById("acrossClues");
  const downEl = document.getElementById("downClues");
  const checkButton = document.getElementById("checkWord");
  const resetButton = document.getElementById("resetCrossword");
  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");
  const activeNumber = document.getElementById("activeNumber");
  const activeLabel = document.getElementById("activeLabel");
  const statusMessage = document.getElementById("statusMessage");

  const entryKey = entry => `${entry.number}-${entry.direction}`;
  const cellKey = (row, col) => `${row},${col}`;
  const cells = new Map();
  const cellButtons = new Map();
  const clueButtons = new Map();
  const entriesByKey = new Map(data.entries.map(entry => [entryKey(entry), entry]));
  let values = {};
  let completed = new Set();
  let activeEntry = null;
  let activeCell = null;

  data.entries.forEach(entry => {
    entry.cells = [];
    for (let i = 0; i < entry.answer.length; i += 1) {
      const row = entry.row + (entry.direction === "down" ? i : 0);
      const col = entry.col + (entry.direction === "across" ? i : 0);
      const key = cellKey(row, col);
      entry.cells.push(key);
      const cell = cells.get(key) || { row, col, answer: entry.answer[i], entries: [] };
      if (cell.answer !== entry.answer[i]) throw new Error(`Conflicting answers at ${key}`);
      cell.entries.push(entry);
      cells.set(key, cell);
    }
  });

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== data.version) return;
      values = Object.fromEntries(
        Object.entries(saved.cells || {}).filter(([key, value]) => cells.has(key) && /^[A-Z]$/.test(value))
      );
      completed = new Set((saved.completed || []).filter(key => entriesByKey.has(key)));
      // Never trust stale completion state if its cells no longer form the answer.
      completed.forEach(key => {
        const entry = entriesByKey.get(key);
        if (!isCorrect(entry)) completed.delete(key);
      });
    } catch (error) {
      console.warn("Saved crossword progress could not be restored.", error);
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: data.version,
        cells: values,
        completed: [...completed]
      }));
    } catch (error) {
      console.warn("Crossword progress could not be saved.", error);
    }
  }

  function isCorrect(entry) {
    return entry.cells.every((key, index) => values[key] === entry.answer[index]);
  }

  function renderGrid() {
    gridEl.style.setProperty("--grid-width", data.width);
    gridEl.style.setProperty("--grid-height", data.height);
    for (let row = 0; row < data.height; row += 1) {
      for (let col = 0; col < data.width; col += 1) {
        if (data.grid[row][col] !== "#") continue;
        const block = document.createElement("div");
        block.className = "block";
        block.style.gridRow = String(row + 1);
        block.style.gridColumn = String(col + 1);
        block.setAttribute("aria-hidden", "true");
        gridEl.appendChild(block);
      }
    }
    [...cells.values()].sort((a, b) => a.row - b.row || a.col - b.col).forEach(cell => {
      const key = cellKey(cell.row, cell.col);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.style.gridRow = String(cell.row + 1);
      button.style.gridColumn = String(cell.col + 1);
      button.dataset.key = key;
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `Row ${cell.row + 1}, column ${cell.col + 1}${values[key] ? `, ${values[key]}` : ", blank"}`);
      const number = data.entries.find(entry => entry.row === cell.row && entry.col === cell.col)?.number;
      button.innerHTML = `${number ? `<span class="cell-number">${number}</span>` : ""}<span class="cell-letter"></span>`;
      button.addEventListener("click", () => selectCell(key, true));
      gridEl.appendChild(button);
      cellButtons.set(key, button);
    });
  }

  function renderClues() {
    ["across", "down"].forEach(direction => {
      const target = direction === "across" ? acrossEl : downEl;
      data.entries.filter(entry => entry.direction === direction).forEach(entry => {
        const key = entryKey(entry);
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "clue-button";
        button.innerHTML = `<span class="clue-number">${entry.number}</span><span class="clue-text">${entry.clue}<span class="clue-label">${entry.answer.length} letters</span></span>`;
        button.addEventListener("click", () => selectEntry(entry, entry.cells.find(cell => !values[cell]) || entry.cells[0], true));
        item.appendChild(button);
        target.appendChild(item);
        clueButtons.set(key, button);
      });
    });
  }

  function selectCell(key, allowToggle = false) {
    const cell = cells.get(key);
    if (!cell) return;
    let entry = cell.entries[0];
    const activeStillApplies = activeEntry && cell.entries.includes(activeEntry);
    if (activeStillApplies) entry = activeEntry;
    if (allowToggle && activeCell === key && cell.entries.length > 1) {
      entry = cell.entries.find(candidate => candidate !== activeEntry) || entry;
    } else if (!activeStillApplies && cell.entries.length > 1 && activeEntry) {
      entry = cell.entries.find(candidate => candidate.direction === activeEntry.direction) || entry;
    }
    selectEntry(entry, key, false);
  }

  function selectEntry(entry, key, scrollToCell) {
    activeEntry = entry;
    activeCell = key;
    statusMessage.textContent = "";
    statusMessage.className = "status";
    updateSelection();
    const button = cellButtons.get(key);
    button.focus({ preventScroll: true });
    if (scrollToCell) button.scrollIntoView({ block: "center", inline: "center" });
  }

  function updateSelection() {
    const activeKeys = new Set(activeEntry ? activeEntry.cells : []);
    cellButtons.forEach((button, key) => {
      const cell = cells.get(key);
      button.classList.toggle("in-word", activeKeys.has(key));
      button.classList.toggle("active", key === activeCell);
      button.classList.toggle("completed", cell.entries.some(entry => completed.has(entryKey(entry))));
      button.querySelector(".cell-letter").textContent = values[key] || "";
      button.setAttribute("aria-label", `Row ${cell.row + 1}, column ${cell.col + 1}${values[key] ? `, ${values[key]}` : ", blank"}`);
      button.tabIndex = key === activeCell || (!activeCell && key === cells.keys().next().value) ? 0 : -1;
    });
    clueButtons.forEach((button, key) => {
      button.classList.toggle("selected", activeEntry && key === entryKey(activeEntry));
      button.classList.toggle("correct", completed.has(key));
      button.setAttribute("aria-pressed", activeEntry && key === entryKey(activeEntry) ? "true" : "false");
    });
    if (activeEntry) {
      activeNumber.textContent = `${activeEntry.number} ${activeEntry.direction[0].toUpperCase()}${activeEntry.direction.slice(1)}`;
      activeLabel.textContent = `${activeEntry.answer.length} letters`;
      checkButton.disabled = false;
    } else {
      activeNumber.textContent = "Select a clue";
      activeLabel.textContent = "";
      checkButton.disabled = true;
    }
    progressText.textContent = `Completed: ${completed.size} / ${data.entries.length}`;
    progressBar.style.width = `${(completed.size / data.entries.length) * 100}%`;
  }

  function invalidateEntriesAt(key) {
    cells.get(key).entries.forEach(entry => completed.delete(entryKey(entry)));
  }

  function typeLetter(letter) {
    if (!activeEntry || !activeCell) return;
    if (values[activeCell] !== letter) invalidateEntriesAt(activeCell);
    values[activeCell] = letter;
    const index = activeEntry.cells.indexOf(activeCell);
    if (index < activeEntry.cells.length - 1) activeCell = activeEntry.cells[index + 1];
    saveProgress();
    updateSelection();
    cellButtons.get(activeCell).focus({ preventScroll: true });
    cellButtons.get(activeCell).scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function backspace() {
    if (!activeEntry || !activeCell) return;
    let index = activeEntry.cells.indexOf(activeCell);
    if (values[activeCell]) {
      invalidateEntriesAt(activeCell);
      delete values[activeCell];
    } else if (index > 0) {
      index -= 1;
      activeCell = activeEntry.cells[index];
      invalidateEntriesAt(activeCell);
      delete values[activeCell];
    }
    saveProgress();
    updateSelection();
    cellButtons.get(activeCell).focus({ preventScroll: true });
  }

  function moveByArrow(key) {
    if (!activeCell) return;
    const current = cells.get(activeCell);
    const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[key];
    for (let distance = 1; distance <= Math.max(data.width, data.height); distance += 1) {
      const target = cellKey(current.row + delta[0] * distance, current.col + delta[1] * distance);
      if (cells.has(target)) {
        selectCell(target, false);
        return;
      }
    }
  }

  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      typeLetter(event.key.toUpperCase());
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      backspace();
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      moveByArrow(event.key);
    } else if (event.key === " " && document.activeElement?.classList.contains("cell")) {
      event.preventDefault();
      selectCell(activeCell, true);
    }
  });

  checkButton.addEventListener("click", () => {
    if (!activeEntry) return;
    const key = entryKey(activeEntry);
    if (isCorrect(activeEntry)) {
      completed.add(key);
      statusMessage.textContent = `${activeEntry.number} ${activeEntry.direction} is correct.`;
      statusMessage.className = "status correct";
    } else {
      completed.delete(key);
      statusMessage.textContent = `${activeEntry.number} ${activeEntry.direction} is not correct yet.`;
      statusMessage.className = "status incorrect";
    }
    saveProgress();
    updateSelection();
  });

  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset the crossword? This will permanently delete all saved letters and completed words for this puzzle.")) return;
    values = {};
    completed = new Set();
    localStorage.removeItem(STORAGE_KEY);
    statusMessage.textContent = "Crossword progress has been reset.";
    statusMessage.className = "status";
    updateSelection();
  });

  loadProgress();
  renderGrid();
  renderClues();
  updateSelection();
  scrollerEl.scrollLeft = 0;
  scrollerEl.scrollTop = 0;
})();
