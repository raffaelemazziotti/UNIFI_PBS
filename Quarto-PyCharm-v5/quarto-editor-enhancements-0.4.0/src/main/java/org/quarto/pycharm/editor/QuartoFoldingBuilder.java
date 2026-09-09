package org.quarto.pycharm.editor;

import com.intellij.lang.ASTNode;
import com.intellij.lang.folding.FoldingBuilder;
import com.intellij.lang.folding.FoldingDescriptor;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.util.TextRange;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Supplies native IntelliJ fold regions for Quarto files represented by the
 * platform's plain-text PSI. TextMate remains responsible for highlighting.
 */
public final class QuartoFoldingBuilder implements FoldingBuilder, DumbAware {
    private static final String ELLIPSIS = "\u2026";
    private static final Pattern ATX_HEADING =
            Pattern.compile("^[ \\t]{0,3}(#{1,6})(?!#)[ \\t]+\\S.*$");
    private static final Pattern DIV_OPEN =
            Pattern.compile("^\\s*(:{3,})\\s*(\\{.*}|[A-Za-z][A-Za-z0-9_-]*)\\s*$");
    private static final Pattern DIV_CLOSE = Pattern.compile("^\\s*(:{3,})\\s*$");

    @Override
    public FoldingDescriptor @NotNull [] buildFoldRegions(@NotNull ASTNode node,
                                                           @NotNull Document document) {
        PsiFile psiFile = node.getPsi().getContainingFile();
        VirtualFile file = psiFile == null ? null : psiFile.getVirtualFile();
        if (file == null || !"qmd".equalsIgnoreCase(file.getExtension())) {
            return FoldingDescriptor.EMPTY_ARRAY;
        }

        List<FoldSpec> specs = parse(document);
        List<FoldingDescriptor> descriptors = new ArrayList<>(specs.size());
        int documentLength = document.getTextLength();

        for (FoldSpec spec : specs) {
            int start = Math.max(0, Math.min(spec.start, documentLength));
            int end = Math.max(0, Math.min(spec.end, documentLength));
            if (end <= start) continue;
            descriptors.add(new FoldingDescriptor(
                    node,
                    new TextRange(start, end),
                    null,
                    spec.placeholder,
                    false,
                    Collections.emptySet()
            ));
        }

        return descriptors.toArray(FoldingDescriptor.EMPTY_ARRAY);
    }

    @Override
    public @Nullable String getPlaceholderText(@NotNull ASTNode node) {
        return " " + ELLIPSIS + " ";
    }

    @Override
    public boolean isCollapsedByDefault(@NotNull ASTNode node) {
        return false;
    }

    private static List<FoldSpec> parse(Document document) {
        List<FoldSpec> folds = new ArrayList<>();
        List<Heading> headings = new ArrayList<>();
        Deque<DivOpen> divs = new ArrayDeque<>();

        Fence codeFence = null;
        int yamlStart = -1;

        for (int line = 0; line < document.getLineCount(); line++) {
            String text = lineText(document, line);
            String trimmed = text.trim();

            // YAML front matter is recognized only at the beginning of a file.
            if (line == 0 && "---".equals(trimmed)) {
                yamlStart = line;
                continue;
            }
            if (yamlStart >= 0) {
                if (line > yamlStart && ("---".equals(trimmed) || "...".equals(trimmed))) {
                    addDelimitedFold(folds, document, yamlStart, line,
                            placeholder("YAML"));
                    yamlStart = -1;
                }
                continue;
            }

            // Code fences take precedence so headings and div markers inside
            // code are never interpreted as Quarto structure.
            Fence currentFence = Fence.parse(text, line);
            if (currentFence != null) {
                if (codeFence == null) {
                    codeFence = currentFence;
                } else if (currentFence.marker == codeFence.marker
                        && currentFence.length >= codeFence.length
                        && currentFence.rest.isEmpty()) {
                    addDelimitedFold(folds, document, codeFence.line, line,
                            placeholder("code"));
                    codeFence = null;
                }
                continue;
            }
            if (codeFence != null) continue;

            Matcher close = DIV_CLOSE.matcher(text);
            if (close.matches()) {
                // A bare colon fence closes the innermost open div. This LIFO
                // pairing is what makes nested Quarto fenced divs structural.
                if (!divs.isEmpty()) {
                    DivOpen open = divs.pop();
                    addDelimitedFold(folds, document, open.line, line,
                            placeholder(open.label));
                }
                continue;
            }

            Matcher open = DIV_OPEN.matcher(text);
            if (open.matches()) {
                divs.push(new DivOpen(line, friendlyDivLabel(open.group(2))));
                continue;
            }

            Matcher heading = ATX_HEADING.matcher(text);
            if (heading.matches()) {
                headings.add(new Heading(line, heading.group(1).length()));
            }
        }

        // A section includes lower-level subsections and ends at the next
        // heading of the same or a higher level. Thus ## maps naturally to a
        // RevealJS slide while # and ###-###### retain Markdown hierarchy.
        for (int i = 0; i < headings.size(); i++) {
            Heading heading = headings.get(i);
            int endLineExclusive = document.getLineCount();

            for (int j = i + 1; j < headings.size(); j++) {
                Heading next = headings.get(j);
                if (next.level <= heading.level) {
                    endLineExclusive = next.line;
                    break;
                }
            }

            if (endLineExclusive <= heading.line + 1) continue;
            int start = document.getLineEndOffset(heading.line);
            int end = endLineExclusive < document.getLineCount()
                    ? document.getLineStartOffset(endLineExclusive)
                    : document.getTextLength();
            trimTrailingLineBreaks(document, folds, start, end,
                    placeholder(heading.level == 2 ? "slide" : "section"));
        }

        // Native folding expects regions in document order, with an outer
        // region before a nested region when both start at the same offset.
        folds.sort(Comparator.comparingInt(FoldSpec::start)
                .thenComparing(Comparator.comparingInt(FoldSpec::end).reversed()));
        return folds;
    }

    private static void addDelimitedFold(List<FoldSpec> folds, Document document,
                                         int openLine, int closeLine, String placeholder) {
        if (closeLine <= openLine) return;

        // Keep the opener visible but start its range on the opener line. That
        // anchors PyCharm's own folding marker in the opener's gutter.
        int start = document.getLineEndOffset(openLine);
        int end = document.getLineStartOffset(closeLine);
        trimTrailingLineBreaks(document, folds, start, end, placeholder);
    }

    private static void trimTrailingLineBreaks(Document document, List<FoldSpec> folds,
                                               int start, int end, String placeholder) {
        CharSequence chars = document.getCharsSequence();
        while (end > start
                && (chars.charAt(end - 1) == '\n' || chars.charAt(end - 1) == '\r')) {
            end--;
        }
        if (end > start) folds.add(new FoldSpec(start, end, placeholder));
    }

    private static String placeholder(String label) {
        return " " + ELLIPSIS + " " + label + " " + ELLIPSIS + " ";
    }

    private static String friendlyDivLabel(String raw) {
        String value = raw.trim();
        if (value.startsWith("{") && value.endsWith("}")) {
            value = value.substring(1, value.length() - 1).trim();
        }
        if (value.length() > 30) value = value.substring(0, 27) + "...";
        return value.isBlank() ? "div" : value;
    }

    private static String lineText(Document document, int line) {
        int start = document.getLineStartOffset(line);
        int end = document.getLineEndOffset(line);
        return document.getCharsSequence().subSequence(start, end).toString();
    }

    private record FoldSpec(int start, int end, String placeholder) {}
    private record Heading(int line, int level) {}
    private record DivOpen(int line, String label) {}

    private record Fence(char marker, int length, int line, String rest) {
        private static Fence parse(String text, int line) {
            String trimmed = text.stripLeading();
            if (trimmed.length() < 3) return null;
            char marker = trimmed.charAt(0);
            if (marker != '`' && marker != '~') return null;

            int length = 0;
            while (length < trimmed.length() && trimmed.charAt(length) == marker) length++;
            if (length < 3) return null;
            return new Fence(marker, length, line, trimmed.substring(length).trim());
        }
    }
}
