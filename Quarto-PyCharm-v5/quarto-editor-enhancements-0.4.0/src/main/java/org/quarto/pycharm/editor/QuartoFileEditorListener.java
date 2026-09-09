package org.quarto.pycharm.editor;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.event.DocumentEvent;
import com.intellij.openapi.editor.event.DocumentListener;
import com.intellij.openapi.editor.markup.HighlighterLayer;
import com.intellij.openapi.editor.markup.HighlighterTargetArea;
import com.intellij.openapi.editor.markup.RangeHighlighter;
import com.intellij.openapi.editor.markup.TextAttributes;
import com.intellij.openapi.fileEditor.FileEditor;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.fileEditor.FileEditorManagerListener;
import com.intellij.openapi.fileEditor.TextEditor;
import com.intellij.openapi.util.Key;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

import java.awt.Color;
import java.awt.Font;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public final class QuartoFileEditorListener implements FileEditorManagerListener {
    private static final Key<List<RangeHighlighter>> TITLE_HIGHLIGHTERS =
            Key.create("quarto.editor.enhancements.titleHighlighters.v5");
    private static final Pattern H2 = Pattern.compile("^[ \\t]{0,3}##(?!#)[ \\t]+\\S.*$");
    private static final Color SLIDE_TITLE_RED = new Color(0xFF7A90);

    @Override
    public void fileOpened(@NotNull FileEditorManager source, @NotNull VirtualFile file) {
        if (!"qmd".equalsIgnoreCase(file.getExtension())) return;

        for (FileEditor fileEditor : source.getAllEditors(file)) {
            if (fileEditor instanceof TextEditor textEditor) {
                Editor editor = textEditor.getEditor();
                source.runWhenLoaded(editor, () -> {
                    refreshTitles(editor);
                    editor.getDocument().addDocumentListener(new DocumentListener() {
                        @Override
                        public void documentChanged(@NotNull DocumentEvent event) {
                            ApplicationManager.getApplication().invokeLater(() -> refreshTitles(editor));
                        }
                    }, textEditor);
                });
            }
        }
    }

    private static void refreshTitles(@NotNull Editor editor) {
        if (editor.isDisposed()) return;

        List<RangeHighlighter> old = editor.getUserData(TITLE_HIGHLIGHTERS);
        if (old != null) {
            for (RangeHighlighter highlighter : old) {
                if (highlighter.isValid()) editor.getMarkupModel().removeHighlighter(highlighter);
            }
        }

        var document = editor.getDocument();
        List<RangeHighlighter> created = new ArrayList<>();
        boolean inYaml = false;
        Fence codeFence = null;

        for (int line = 0; line < document.getLineCount(); line++) {
            int start = document.getLineStartOffset(line);
            int end = document.getLineEndOffset(line);
            String text = document.getCharsSequence().subSequence(start, end).toString();
            String trimmed = text.trim();

            if (line == 0 && "---".equals(trimmed)) {
                inYaml = true;
                continue;
            }
            if (inYaml) {
                if (line > 0 && ("---".equals(trimmed) || "...".equals(trimmed))) inYaml = false;
                continue;
            }

            Fence nextFence = Fence.parse(text);
            if (nextFence != null) {
                if (codeFence == null) {
                    codeFence = nextFence.withLine(line);
                } else if (nextFence.marker == codeFence.marker && nextFence.length >= codeFence.length
                        && nextFence.rest.isEmpty()) {
                    codeFence = null;
                }
                continue;
            }
            if (codeFence != null) continue;

            if (H2.matcher(text).matches()) {
                TextAttributes attrs = new TextAttributes(SLIDE_TITLE_RED, null, null, null, Font.BOLD);
                RangeHighlighter h = editor.getMarkupModel().addRangeHighlighter(
                        start, end,
                        HighlighterLayer.ADDITIONAL_SYNTAX + 100,
                        attrs,
                        HighlighterTargetArea.EXACT_RANGE
                );
                created.add(h);
            }
        }

        editor.putUserData(TITLE_HIGHLIGHTERS, created);
    }

    private record Fence(char marker, int length, int line, String rest) {
        private Fence withLine(int line) { return new Fence(marker, length, line, rest); }

        private static Fence parse(String text) {
            String trimmed = text.stripLeading();
            if (trimmed.length() < 3) return null;
            char marker = trimmed.charAt(0);
            if (marker != '`' && marker != '~') return null;
            int n = 0;
            while (n < trimmed.length() && trimmed.charAt(n) == marker) n++;
            if (n < 3) return null;
            return new Fence(marker, n, -1, trimmed.substring(n).trim());
        }
    }
}
