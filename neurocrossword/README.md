# Neuroscience Across Development crossword

This folder contains a self-contained static crossword for the UNIFI developmental psychobiology course. The fixed 19×19 blocked grid has 67 single-token answers drawn from all eight course chapters. The browser does not generate or randomize the puzzle.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/neurocrossword/>.

## Persistence

Every letter change is saved in browser `localStorage` under `unifi-neurocrossword-progress`. The record contains the grid version, entered cells, and checked-correct entries. The current version is `unifi-neuroscience-2026-02`, so progress from the earlier incompatible grid is ignored. **Reset crossword** asks for confirmation before deleting saved state.

Progress belongs to the current browser profile and origin; it does not synchronize between devices or browsers.

## Quarto embedding

The relative page URL is:

```text
neurocrossword/index.html
```

Ensure `neurocrossword/` is copied as a project resource when the Quarto site is rendered.

## Fixed data and development utility

`crossword-data.js` stores the explicit blocked grid (`#` means a black square), solutions, clue numbers, clues, directions, coordinates, and source chapters. `generate-crossword.py` validates the selected grid and rewrites that data file. It also records representative candidate-layout statistics from the development comparison.

Run the validator/exporter with:

```bash
python3 neurocrossword/generate-crossword.py
```
