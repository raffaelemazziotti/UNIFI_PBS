Quarto PyCharm visual v4

Changes requested:
- Heading # markers and heading text share the same color.
- Quarto ::: open/close markers share a strong tag-like color.
- .columns and .column use deliberately different scopes/colors.
- Attribute braces/operators/values are colored separately; attribute keys stay near normal text.
- HTML tags such as <u> have colored tag names and contrasting angle brackets.
- Markdown links and images split punctuation/text/path into different colors.
- Inline code such as `Fast` has colored content distinct from backticks.

Install:
1. Uncheck older custom Quarto bundles.
2. Settings > Editor > TextMate Bundles > +
3. Select this folder (the one containing package.json).
4. Apply and reopen the .qmd file.
