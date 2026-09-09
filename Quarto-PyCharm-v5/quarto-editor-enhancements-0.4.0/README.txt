Quarto Editor Enhancements 0.5.0
=================================

WHAT CHANGED
------------
This version removes the fake/manual gutter folding approach.
It registers a native IntelliJ FoldingBuilder for PyCharm's TextMate language and for
the platform TEXT fallback, returning folding descriptors only for *.qmd files.
TextMate continues to provide the syntax coloring.

Native folding targets:
- Markdown heading sections (# through ######), respecting heading hierarchy
- ## RevealJS slide bodies (until the next heading of level # or ##)
- nested ::: fenced div contents
- fenced code blocks (``` / ~~~)
- YAML front matter

The ## title remains visible when the slide body is folded.
The opening and closing ::: lines remain visible when a div is folded.
All folds use PyCharm's native folding infrastructure and gutter markers.

Version 0.5.0 additionally restores native Ctrl+Space local-path completion
in TextMate-backed .qmd files. It recognizes Markdown images and links, the
src/href attributes of iframe, img, script, link, video, source and a, plus
Quarto include/embed and resource-style values. Paths are resolved from the
current .qmd file, can traverse ../ and nested folders, and insert forward
slashes.

BUILD TARGET
------------
The plugin compiles against PyCharm Community 2025.1.2 (platform build 251) and
declares compatibility from build 251 onward. The build script uses a valid existing
JAVA_HOME first; otherwise it prefers:

  C:\Program Files\JetBrains\PyCharm 2025.1.2\jbr

INSTALL / BUILD
---------------
1. Keep your Quarto TextMate bundle enabled.
2. Build by double-clicking build-plugin.bat.
3. Install build\distributions\quarto-editor-enhancements-0.5.0.zip via
   Settings > Plugins > gear > Install Plugin from Disk.
4. Restart PyCharm.

If an older local version is already installed with plugin ID
org.quarto.pycharm.editor.enhancements, uninstall it before installing 0.4.0.
Version 0.4.0 uses the verifier-compliant ID org.quarto.editor.enhancements.

If Java cannot be found, open PyCharm > Help > About and copy its Runtime path (the jbr folder).
Then run in Command Prompt:

  set "JAVA_HOME=PASTE_THE_JBR_PATH_HERE"
  build-plugin.bat

IMPORTANT
---------
The previous 0.2/0.3 manual FoldRegion approach was the wrong mechanism for persistent
native folding. IntelliJ's folding pass owns those regions and can remove them. This
version uses the official FoldingBuilder mechanism instead.
