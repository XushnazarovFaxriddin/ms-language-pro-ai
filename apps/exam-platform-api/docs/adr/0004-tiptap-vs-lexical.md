# ADR EP-0004 — TipTap for writing editor (vs Lexical)

- **Status**: Accepted
- **Date**: 2026-04-26

## Context
Writing section needs a rich-text editor with:
- Word count (live)
- Paste blocking (anti-cheat)
- Focus loss tracking (anti-cheat)
- Format-stripped output (no rich content needed; just plain text + paragraph breaks)

## Options
- **TipTap** (ProseMirror-based) — popular React editor
- **Lexical** (Meta) — newer, performant, but heavier
- **textarea** + word counter — simplest, no rich features

## Decision
**TipTap** with minimal extensions: StarterKit (paragraphs, basic formatting), CharacterCount, History.

## Why
- Battle-tested, maintained, smaller than Lexical for our needs
- Easy to disable features (no need for full rich text)
- React integration via `@tiptap/react` is clean
- Word count comes from CharacterCount extension (off-the-shelf)

## Anti-cheat hooks
```tsx
const editor = useEditor({
  extensions: [StarterKit, CharacterCount.configure({limit: 500})],
  editorProps: {
    handlePaste: () => true,  // block paste
    handleDrop: () => true,
    attributes: {class: '...'},
  },
  onBlur: () => recordFocusLoss(),
  onFocus: () => recordFocusGain(),
});
```

## Consequences
- ~50KB gz to client bundle (acceptable for writing route)
- Plain text submission: `editor.getText()` (paragraph-aware)
- Paste blocking is best-effort; determined cheaters can use external tools — for thesis, focus-loss telemetry is the main signal
