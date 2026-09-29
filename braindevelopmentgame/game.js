(function () {
  "use strict";

  const DATA = window.BRAIN_GAME_DATA;
  const STORAGE_KEY = "brain-development-game-v1";

  const elements = {
    stageCounter: document.getElementById("stageCounter"),
    stageName: document.getElementById("stageName"),
    stageDescription: document.getElementById("stageDescription"),
    periodLabel: document.getElementById("periodLabel"),
    visualNote: document.getElementById("visualNote"),
    timeline: document.getElementById("timeline"),
    stateMeters: document.getElementById("stateMeters"),
    balanceNote: document.getElementById("balanceNote"),
    processGrid: document.getElementById("processGrid"),
    resourcesRemaining: document.getElementById("resourcesRemaining"),
    allocationMessage: document.getElementById("allocationMessage"),
    advanceButton: document.getElementById("advanceButton"),
    restartButton: document.getElementById("restartButton"),
    eventCard: document.getElementById("eventCard"),
    eventTitle: document.getElementById("eventTitle"),
    eventDescription: document.getElementById("eventDescription"),
    eventChoices: document.getElementById("eventChoices"),
    decisionCard: document.getElementById("decisionCard"),
    resultCard: document.getElementById("resultCard"),
    resultTitle: document.getElementById("resultTitle"),
    resultSummary: document.getElementById("resultSummary"),
    finalState: document.getElementById("finalState"),
    resultNotes: document.getElementById("resultNotes"),
    playAgainButton: document.getElementById("playAgainButton"),
    brainVisual: document.getElementById("brainVisual")
  };

  let game = loadGame() || createGame();

  function createGame() {
    return {
      version: DATA.version,
      stageIndex: 0,
      state: { ...DATA.initialState },
      allocations: {},
      eventChoices: {},
      history: [],
      seed: Date.now() % 997,
      complete: false
    };
  }

  function loadGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== DATA.version || !saved.state) return null;
      return saved;
    } catch (error) {
      return null;
    }
  }

  function saveGame() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }

  function clamp(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function applyEffects(effects) {
    Object.entries(effects).forEach(([key, amount]) => {
      game.state[key] = clamp(game.state[key] + amount);
    });
  }

  function currentStage() {
    return DATA.stages[game.stageIndex];
  }

  function stageAllocation() {
    const stage = currentStage();
    if (!game.allocations[stage.id]) {
      game.allocations[stage.id] = Object.fromEntries(stage.processes.map(process => [process.id, 0]));
    }
    return game.allocations[stage.id];
  }

  function allocatedTotal() {
    return Object.values(stageAllocation()).reduce((sum, value) => sum + value, 0);
  }

  function selectedEventId(stage) {
    if (!stage.events.length) return null;
    return stage.events[(game.seed + game.stageIndex) % stage.events.length];
  }

  function render() {
    renderTimeline();
    renderState();
    renderBrain();
    if (game.complete) {
      renderResult();
      return;
    }
    elements.resultCard.hidden = true;
    elements.decisionCard.hidden = false;
    renderStage();
  }

  function renderTimeline() {
    elements.timeline.replaceChildren();
    DATA.stages.forEach((stage, index) => {
      const item = document.createElement("li");
      item.className = index < game.stageIndex || game.complete ? "complete" : index === game.stageIndex ? "current" : "";
      item.innerHTML = `<span>${index + 1}</span><small>${stage.shortName}</small>`;
      elements.timeline.appendChild(item);
    });
  }

  function stateStatus(id, value) {
    if (id === "plasticity") {
      if (game.stageIndex < 4) return value >= 45 && value <= 90 ? "healthy" : "warning";
      return value >= 25 && value <= 65 ? "healthy" : "warning";
    }
    if (id === "connectivity") {
      const target = 10 + game.stageIndex * 9;
      return value >= target - 12 && value <= target + 30 ? "healthy" : "warning";
    }
    return value >= 25 && value <= 88 ? "healthy" : "warning";
  }

  function renderState() {
    elements.stateMeters.replaceChildren();
    DATA.variables.forEach(variable => {
      const value = game.state[variable.id];
      const row = document.createElement("div");
      row.className = `state-row ${stateStatus(variable.id, value)}`;
      row.innerHTML = `
        <div class="meter-label"><span>${variable.label}</span><strong>${value}</strong></div>
        <div class="meter-track"><span style="width:${value}%;background:${variable.color}"></span></div>`;
      elements.stateMeters.appendChild(row);
    });
    elements.balanceNote.textContent = game.state.energy < 25
      ? "Energy is low. Further growth will be harder to support."
      : game.state.stability < 30
        ? "The network is becoming unstable. Guidance, pruning, or inhibition may help."
        : "Healthy development depends on coordinated change, not maximizing every variable.";
  }

  function renderBrain() {
    const shownStage = game.complete ? DATA.stages.length - 1 : game.stageIndex;
    elements.brainVisual.querySelectorAll("[data-stage]").forEach(element => {
      const visible = Number(element.dataset.stage) <= shownStage;
      element.classList.toggle("visible", visible);
    });
    const neuronFraction = game.state.neurons / 100;
    const visibleNodes = Array.from(elements.brainVisual.querySelectorAll(".nodes circle.visible"));
    visibleNodes.forEach((node, index) => {
      node.style.opacity = index / Math.max(1, visibleNodes.length) <= Math.max(0.25, neuronFraction) ? "1" : ".18";
    });
    const connectionOpacity = Math.max(0.22, game.state.connectivity / 100);
    elements.brainVisual.style.setProperty("--connection-opacity", connectionOpacity.toFixed(2));
    elements.brainVisual.classList.toggle("unstable", game.state.stability < 35);
  }

  function renderStage() {
    const stage = currentStage();
    elements.stageCounter.textContent = `Stage ${game.stageIndex + 1} / ${DATA.stages.length}`;
    elements.stageName.textContent = stage.name;
    elements.stageDescription.textContent = stage.description;
    elements.periodLabel.textContent = stage.period;
    elements.visualNote.textContent = stage.visualNote;
    renderProcesses();
    renderEvent(stage);
    updateAdvanceState();
  }

  function renderProcesses() {
    const stage = currentStage();
    const allocation = stageAllocation();
    elements.processGrid.replaceChildren();
    stage.processes.forEach(process => {
      const card = document.createElement("article");
      card.className = "process-card";
      card.innerHTML = `
        <div><h4>${process.name}</h4><p>${process.description}</p></div>
        <div class="stepper" aria-label="Allocate resources to ${process.name}">
          <button type="button" data-action="decrease" data-process="${process.id}" aria-label="Decrease ${process.name}">−</button>
          <output aria-live="polite">${allocation[process.id]}</output>
          <button type="button" data-action="increase" data-process="${process.id}" aria-label="Increase ${process.name}">+</button>
        </div>`;
      elements.processGrid.appendChild(card);
    });
    elements.processGrid.querySelectorAll("button").forEach(button => {
      button.addEventListener("click", () => changeAllocation(button.dataset.process, button.dataset.action === "increase" ? 1 : -1));
    });
    updateStepperButtons();
  }

  function changeAllocation(processId, change) {
    const stage = currentStage();
    const allocation = stageAllocation();
    if (change > 0 && allocatedTotal() >= stage.budget) return;
    allocation[processId] = Math.max(0, allocation[processId] + change);
    saveGame();
    renderProcesses();
    updateAdvanceState();
  }

  function updateStepperButtons() {
    const stage = currentStage();
    const allocation = stageAllocation();
    const remaining = stage.budget - allocatedTotal();
    elements.processGrid.querySelectorAll("button").forEach(button => {
      button.disabled = button.dataset.action === "decrease"
        ? allocation[button.dataset.process] === 0
        : remaining === 0;
    });
  }

  function renderEvent(stage) {
    const eventId = selectedEventId(stage);
    if (!eventId) {
      elements.eventCard.hidden = true;
      return;
    }
    const event = DATA.events[eventId];
    const selected = game.eventChoices[stage.id];
    elements.eventCard.hidden = false;
    elements.eventCard.classList.toggle("resolved", selected !== undefined);
    elements.eventTitle.textContent = event.title;
    elements.eventDescription.textContent = event.description;
    elements.eventChoices.replaceChildren();
    event.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = selected === index ? "event-choice selected" : "event-choice";
      button.disabled = selected !== undefined;
      button.innerHTML = `<strong>${choice.label}</strong><span>${choice.note}</span>`;
      button.addEventListener("click", () => resolveEvent(stage.id, eventId, index));
      elements.eventChoices.appendChild(button);
    });
  }

  function resolveEvent(stageId, eventId, choiceIndex) {
    if (game.eventChoices[stageId] !== undefined) return;
    game.eventChoices[stageId] = choiceIndex;
    applyEffects(DATA.events[eventId].choices[choiceIndex].effects);
    saveGame();
    render();
  }

  function updateAdvanceState() {
    const stage = currentStage();
    const remaining = stage.budget - allocatedTotal();
    const eventNeeded = Boolean(selectedEventId(stage)) && game.eventChoices[stage.id] === undefined;
    elements.resourcesRemaining.textContent = remaining;
    elements.advanceButton.disabled = remaining !== 0 || eventNeeded;
    if (remaining > 0) {
      elements.allocationMessage.textContent = `Allocate ${remaining} remaining resource${remaining === 1 ? "" : "s"} to continue.`;
    } else if (eventNeeded) {
      elements.allocationMessage.textContent = "Choose a response to the developmental event.";
    } else {
      elements.allocationMessage.textContent = "The developmental balance is ready.";
    }
  }

  function resolveStage() {
    const stage = currentStage();
    const allocation = stageAllocation();
    const before = { ...game.state };

    stage.processes.forEach(process => {
      const amount = allocation[process.id];
      Object.entries(process.effects).forEach(([key, value]) => {
        game.state[key] = clamp(game.state[key] + value * amount);
      });
    });
    game.state.energy = clamp(game.state.energy - 3);
    applyStageTradeoffs(stage.id, allocation);

    game.history.push({ stageId: stage.id, allocation: { ...allocation }, before, after: { ...game.state } });
    game.stageIndex += 1;
    if (game.stageIndex >= DATA.stages.length) game.complete = true;
    saveGame();
    render();
  }

  function applyStageTradeoffs(stageId, a) {
    if (stageId === "induction") {
      const spread = Math.max(...Object.values(a)) - Math.min(...Object.values(a));
      if (spread <= 1) applyEffects({ stability: 4, neurons: 2 });
      if (a["tissue-shaping"] === 0) applyEffects({ stability: -6 });
    }
    if (stageId === "neurogenesis") {
      if (a.proliferation > a.survival + 1) applyEffects({ neurons: -5, stability: -6 });
      if (a.survival === 0) applyEffects({ neurons: -7 });
      if (a.differentiation === 0) applyEffects({ stability: -4, plasticity: 3 });
    }
    if (stageId === "migration") {
      if (a["radial-scaffold"] === 0) applyEffects({ stability: -7, connectivity: -3 });
      if (Math.min(...Object.values(a)) > 0) applyEffects({ stability: 3, connectivity: 2 });
    }
    if (stageId === "circuit-formation") {
      if (a["axon-growth"] > a.guidance + 1) applyEffects({ connectivity: 2, stability: -8 });
      if (a.guidance >= 2 && a.synaptogenesis >= 1) applyEffects({ stability: 3, connectivity: 2 });
    }
    if (stageId === "refinement") {
      if (a["patterned-activity"] > a.stabilization + 1) applyEffects({ connectivity: 3, stability: -8 });
      if (a.pruning === 0) applyEffects({ connectivity: 2, stability: -5 });
      if (a.stabilization > 0 && a.pruning > 0) applyEffects({ stability: 4 });
    }
    if (stageId === "experience") {
      const sensitivity = game.state.plasticity >= 45 ? 1.5 : 0.75;
      applyEffects({ connectivity: Math.round(a["sensory-input"] * 2 * sensitivity) });
      if (a["sensory-input"] === 0 && game.state.plasticity > 45) applyEffects({ connectivity: -8, stability: -3 });
      if (a.inhibition === 0) applyEffects({ stability: -7, plasticity: 4 });
      if (a.inhibition > 0 && a.myelination > 0) applyEffects({ stability: 4, plasticity: -2 });
    }
    if (game.state.energy < 20) applyEffects({ neurons: -3, connectivity: -4, stability: -4 });
    if (game.state.connectivity > 88 && game.state.stability < 55) applyEffects({ stability: -6 });
  }

  function outcome() {
    const s = game.state;
    if (s.neurons < 42) return { title: "Reduced neuronal survival", summary: "The final network contains fewer retained neurons than this simplified model can readily support." };
    if (s.stability < 45 || (s.connectivity > 86 && s.stability < 62)) return { title: "Unstable network", summary: "Connections developed, but growth and excitation outpaced stabilizing processes." };
    if (s.connectivity < 52) return { title: "Reduced circuit refinement", summary: "The neuronal population survived, but the final network remains relatively sparse or weakly refined." };
    if (s.plasticity > 68 || s.stability < 58) return { title: "Delayed maturation", summary: "The circuit remains highly modifiable and has not fully shifted toward a mature, stable state." };
    if (s.energy < 18) return { title: "Resource-limited maturation", summary: "A functional network formed, but low metabolic reserves constrained late development." };
    return { title: "Healthy coordinated development", summary: "Growth, selective refinement, experience, and stabilization remained well coordinated across the six stages." };
  }

  function resultExplanations() {
    const notes = [];
    const history = Object.fromEntries(game.history.map(item => [item.stageId, item]));
    const neuro = history.neurogenesis;
    const circuit = history["circuit-formation"];
    const refine = history.refinement;
    const experience = history.experience;

    if (neuro) {
      notes.push(neuro.allocation.survival >= 1
        ? "Neuronal survival received support while the progenitor population expanded."
        : "Limited survival support reduced the neuronal population produced during neurogenesis.");
    }
    if (circuit) {
      notes.push(circuit.allocation.guidance >= circuit.allocation["axon-growth"] - 1
        ? "Axon growth remained coordinated with guidance and target selection."
        : "Axonal growth outpaced guidance, producing more connectivity at a cost to stability.");
    }
    if (refine) {
      notes.push(refine.allocation.pruning > 0 && refine.allocation.stabilization > 0
        ? "Activity, contact stabilization, and pruning jointly refined the early circuit."
        : "Refinement favored growth over selective stabilization and elimination.");
    }
    if (experience) {
      notes.push(experience.allocation["sensory-input"] > 0
        ? "Patterned experience acted while the network was plastic, improving circuit refinement."
        : "Limited patterned input during the critical period left connectivity less fully calibrated.");
    }
    return notes.slice(0, 4);
  }

  function renderResult() {
    const finalOutcome = outcome();
    elements.decisionCard.hidden = true;
    elements.resultCard.hidden = false;
    elements.stageCounter.textContent = "Development complete";
    elements.stageName.textContent = finalOutcome.title;
    elements.stageDescription.textContent = finalOutcome.summary;
    elements.periodLabel.textContent = "Mature network";
    elements.visualNote.textContent = "The final diagram reflects the neuronal population, connectivity, and stability reached in this run.";
    elements.resultTitle.textContent = finalOutcome.title;
    elements.resultSummary.textContent = finalOutcome.summary;
    elements.finalState.replaceChildren();
    DATA.variables.forEach(variable => {
      const item = document.createElement("div");
      item.innerHTML = `<span>${variable.label}</span><strong>${game.state[variable.id]}</strong>`;
      elements.finalState.appendChild(item);
    });
    elements.resultNotes.replaceChildren();
    resultExplanations().forEach(note => {
      const item = document.createElement("li");
      item.textContent = note;
      elements.resultNotes.appendChild(item);
    });
  }

  function restart(withConfirmation) {
    if (withConfirmation && !window.confirm("Restart this developmental run?")) return;
    localStorage.removeItem(STORAGE_KEY);
    game = createGame();
    saveGame();
    render();
  }

  elements.advanceButton.addEventListener("click", resolveStage);
  elements.restartButton.addEventListener("click", () => restart(true));
  elements.playAgainButton.addEventListener("click", () => restart(false));

  render();
})();
