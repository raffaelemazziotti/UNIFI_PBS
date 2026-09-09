package org.quarto.pycharm.editor;

import com.intellij.codeInsight.completion.CompletionContributor;
import com.intellij.codeInsight.completion.CompletionParameters;
import com.intellij.codeInsight.completion.CompletionProvider;
import com.intellij.codeInsight.completion.CompletionResultSet;
import com.intellij.codeInsight.completion.CompletionType;
import com.intellij.codeInsight.completion.PrioritizedLookupElement;
import com.intellij.codeInsight.lookup.LookupElementBuilder;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.vfs.VfsUtilCore;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.patterns.PlatformPatterns;
import com.intellij.psi.PsiFile;
import com.intellij.util.ProcessingContext;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Native filesystem completion for paths in TextMate-backed Quarto files.
 * TextMate exposes a coarse PSI tree, therefore syntax recognition is done on
 * the current line while normal IntelliJ lookup/insertion is still used.
 */
public final class QuartoPathCompletionContributor extends CompletionContributor implements DumbAware {
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "svg", "webp");
    private static final Set<String> DOCUMENT_EXTENSIONS = Set.of(
            "qmd", "md", "html", "htm", "pdf", "docx", "pptx", "ipynb", "csv", "json", "xml", "yaml", "yml");
    private static final Pattern MARKDOWN_PATH = Pattern.compile(
            "(?:!?\\[[^]\\r\\n]*]\\(\\s*)([^\\s)\\\"'<>\\r\\n]*)$");
    private static final Pattern HTML_PATH = Pattern.compile(
            "<(iframe|img|script|link|video|source|a)\\b[^>\\r\\n]*?\\b(src|href)\\s*=\\s*([\\\"'])([^\\\"'\\r\\n]*)$",
            Pattern.CASE_INSENSITIVE);
    // Quarto's include/embed shortcodes and resource-like YAML/attribute values.
    private static final Pattern QUARTO_RESOURCE = Pattern.compile(
            "(?:(?:\\{\\{<\\s*(?:include|embed)\\s+)|(?:\\b(?:include|resource|background-image|poster)\\s*[:=]\\s*[\\\"']?))([^\\s\\\"'}>\\r\\n]*)$",
            Pattern.CASE_INSENSITIVE);

    public QuartoPathCompletionContributor() {
        extend(CompletionType.BASIC, PlatformPatterns.psiElement(), new CompletionProvider<>() {
            @Override
            protected void addCompletions(@NotNull CompletionParameters parameters,
                                          @NotNull ProcessingContext context,
                                          @NotNull CompletionResultSet result) {
                addPathCompletions(parameters, result);
            }
        });
    }

    private static void addPathCompletions(CompletionParameters parameters, CompletionResultSet result) {
        PsiFile psiFile = parameters.getOriginalFile();
        VirtualFile currentFile = psiFile.getVirtualFile();
        if (currentFile == null || !"qmd".equalsIgnoreCase(currentFile.getExtension()) || currentFile.getParent() == null) return;

        int caret = parameters.getOffset();
        Document document = parameters.getEditor().getDocument();
        PathContext pathContext = findPathContext(document, caret);
        if (pathContext == null || isExternal(pathContext.typedPath)) return;

        String normalized = pathContext.typedPath.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        String directoryPart = slash < 0 ? "" : normalized.substring(0, slash + 1);
        String namePrefix = slash < 0 ? normalized : normalized.substring(slash + 1);
        VirtualFile directory = directoryPart.isEmpty()
                ? currentFile.getParent()
                : VfsUtilCore.findRelativeFile(directoryPart, currentFile.getParent());
        if (directory == null || !directory.isDirectory()) return;

        List<VirtualFile> children = new ArrayList<>();
        for (VirtualFile child : directory.getChildren()) {
            if (!child.isValid() || !startsWithIgnoreCase(child.getName(), namePrefix)) continue;
            children.add(child);
        }
        children.sort(Comparator.comparing(VirtualFile::isDirectory).reversed()
                .thenComparing(file -> file.getName().toLowerCase(Locale.ROOT)));

        CompletionResultSet matching = result.withPrefixMatcher(namePrefix);
        for (VirtualFile child : children) {
            String insertText = child.getName() + (child.isDirectory() ? "/" : "");
            LookupElementBuilder item = LookupElementBuilder.create(insertText)
                    .withPresentableText(insertText)
                    .withTypeText(child.isDirectory() ? "directory" : child.getExtension(), true)
                    .withInsertHandler((insertion, element) -> {
                        insertion.setAddCompletionChar(false);
                        insertion.getDocument().replaceString(pathContext.segmentStart, insertion.getTailOffset(), insertText);
                    });
            matching.addElement(PrioritizedLookupElement.withPriority(item, priority(child, pathContext.kind)));
        }
    }

    private static PathContext findPathContext(Document document, int caret) {
        if (caret < 0 || caret > document.getTextLength()) return null;
        int line = document.getLineNumber(caret);
        int lineStart = document.getLineStartOffset(line);
        String beforeCaret = document.getCharsSequence().subSequence(lineStart, caret).toString();
        Match match = match(MARKDOWN_PATH, beforeCaret, PathKind.MARKDOWN_LINK);
        if (match == null) match = match(HTML_PATH, beforeCaret, PathKind.HTML_ATTRIBUTE);
        if (match == null) match = match(QUARTO_RESOURCE, beforeCaret, PathKind.QUARTO_RESOURCE);
        if (match == null) return null;

        String typed = match.path;
        int finalSeparator = Math.max(typed.lastIndexOf('/'), typed.lastIndexOf('\\'));
        int segmentStart = lineStart + match.pathStart + finalSeparator + 1;
        return new PathContext(typed, segmentStart, match.kind, match.attribute);
    }

    private static Match match(Pattern pattern, String text, PathKind kind) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) return null;
        if (kind == PathKind.MARKDOWN_LINK && text.charAt(matcher.start()) == '!') {
            kind = PathKind.MARKDOWN_IMAGE;
        }
        if (kind == PathKind.HTML_ATTRIBUTE) {
            String tag = matcher.group(1).toLowerCase(Locale.ROOT);
            kind = "img".equals(tag) ? PathKind.HTML_IMAGE : ("iframe".equals(tag) ? PathKind.HTML_IFRAME : kind);
        }
        int pathGroup = switch (kind) {
            case HTML_ATTRIBUTE, HTML_IMAGE, HTML_IFRAME -> 4;
            default -> 1;
        };
        String attribute = switch (kind) {
            case HTML_ATTRIBUTE, HTML_IMAGE, HTML_IFRAME -> matcher.group(2).toLowerCase(Locale.ROOT);
            default -> "";
        };
        return new Match(matcher.group(pathGroup), matcher.start(pathGroup), kind, attribute);
    }

    private static boolean isExternal(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        return lower.startsWith("http:") || lower.startsWith("https:") || lower.startsWith("mailto:")
                || lower.startsWith("data:") || lower.startsWith("#") || path.startsWith("/") || path.matches("^[A-Za-z]:.*");
    }

    private static boolean startsWithIgnoreCase(String value, String prefix) {
        return value.regionMatches(true, 0, prefix, 0, prefix.length());
    }

    private static double priority(VirtualFile file, PathKind kind) {
        if (file.isDirectory()) return 100.0;
        String extension = file.getExtension().toLowerCase(Locale.ROOT);
        if ((kind == PathKind.MARKDOWN_IMAGE || kind == PathKind.HTML_IMAGE) && IMAGE_EXTENSIONS.contains(extension)) return 30.0;
        if (kind == PathKind.HTML_IFRAME && ("html".equals(extension) || "htm".equals(extension))) return 30.0;
        if (kind == PathKind.MARKDOWN_LINK && DOCUMENT_EXTENSIONS.contains(extension)) return 20.0;
        return 0.0;
    }

    private enum PathKind {
        MARKDOWN_LINK, MARKDOWN_IMAGE, HTML_ATTRIBUTE, HTML_IMAGE, HTML_IFRAME, QUARTO_RESOURCE
    }
    private record Match(String path, int pathStart, PathKind kind, String attribute) {}
    private record PathContext(String typedPath, int segmentStart, PathKind kind, String attribute) {}
}
