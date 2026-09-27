# Neuroscience Across Development

A fixed, self-contained 19×19 crossword for the UNIFI developmental neuroscience course. The browser app uses only HTML, CSS, and vanilla JavaScript. It does not generate or randomize the puzzle.

## Final puzzle

- 85 answers: 57 Across and 28 Down
- 285 playable cells and 76 black cells (21.1% black)
- 93 crossing cells (32.6% of playable cells)
- 21 three-letter answers (24.7% of entries)
- one connected playable-cell component
- no concatenated multi-word answers
- all eight course chapters represented

The Down entries combine recognized course abbreviations with normal course words such as LEARN, SHAPE, EYES, DEEP, GLIA, DIET, and NMDA. Every Across answer of five or more letters receives at least one crossing, and most receive two or more.

`candidate-vocabulary.json` records the 360-answer construction pool and its source-chapter occurrences. `layout-candidates.json` records the dense layouts compared during development and why the final course-packed layout was selected. `generate-crossword.py` validates the fixed grid, rebuilds `crossword-data.js`, refreshes the candidate inventory, and prints the final statistics and dot/hash grid.

## Persistence

Progress is saved after every edit in `localStorage` under `unifi-neurocrossword-progress`. The saved object contains the crossword version, entered cells, and checked-complete entries. Version `unifi-neuroscience-2026-05` prevents incompatible predecessor state from loading. **Reset crossword** asks for confirmation before removing the saved state.

## Run locally

From the project root:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/neurocrossword/>.

The future Quarto iframe/link path from the project root is:

```text
neurocrossword/index.html
```

Regenerate and validate the fixed data with:

```bash
python3 neurocrossword/generate-crossword.py
```
