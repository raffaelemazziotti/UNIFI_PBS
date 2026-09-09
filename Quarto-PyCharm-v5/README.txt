QUARTO FOR PYCHARM v5

Two pieces are included:

1) textmate/Quarto-PyCharm-Visual-v5
   Syntax coloring for .qmd. Install it in Settings -> Editor -> TextMate Bundles.

2) folding-plugin
   Small JetBrains plugin that adds:
   - very visible pastel-red + bold ## slide titles
   - folding for ## slides
   - nested ::: folding
   - code chunk folding
   - YAML front-matter folding

The folding plugin is necessary because JetBrains' imported TextMate grammars provide
syntax highlighting but do not provide the structural editor folding we need here.
