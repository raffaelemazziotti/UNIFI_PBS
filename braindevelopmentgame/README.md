# Brain Development

A small, self-contained browser game for the course. The player allocates limited developmental resources across six stages, responds to short biological events, and tries to coordinate growth, plasticity, and stability.

## Run locally

Open `index.html` directly in a modern browser. No build step, web server, package installation, or external dependency is required.

If the browser restricts local-file storage, serve the project root with any simple static server and visit `braindevelopmentgame/index.html`.

## Files

- `index.html` — interface and inline schematic SVG
- `game.css` — layout, responsive styles, and visual design
- `game-data.js` — stages, processes, effects, and event content
- `game.js` — state updates, resource allocation, persistence, and outcomes

## Editing the prototype

Most biological content and numerical effects are in `game-data.js`. Stage-specific trade-offs and qualitative outcome rules are deliberately compact and are located in `applyStageTradeoffs()` and `outcome()` in `game.js`.

The model is intentionally educational and qualitative. It does not represent a conscious controller of biological development and is not intended as a quantitatively realistic simulation.

## Future Quarto link

`braindevelopmentgame/index.html`
