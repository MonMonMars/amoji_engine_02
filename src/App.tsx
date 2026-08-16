import { useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  type EmojiCategory,
} from "./engine/emojiData";
import {
  addToComposition,
  countByCategory,
  emptyComposition,
  MAX_COMPOSITION_SLOTS,
  removeFromComposition,
  renderComposition,
  searchEmojis,
} from "./engine/engine";

type CategoryFilter = EmojiCategory | "all";

export function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [composition, setComposition] = useState(emptyComposition);
  const [copied, setCopied] = useState(false);

  const results = useMemo(
    () => searchEmojis(query, { category }),
    [query, category],
  );

  const counts = useMemo(() => countByCategory(), []);
  const totalCount = useMemo(
    () => counts.reduce((sum, c) => sum + c.count, 0),
    [counts],
  );

  const rendered = renderComposition(composition);
  const isFull = composition.slots.length >= MAX_COMPOSITION_SLOTS;

  function handleAdd(char: string) {
    setComposition((current) => addToComposition(current, char));
    setCopied(false);
  }

  function handleRemove(index: number) {
    setComposition((current) => removeFromComposition(current, index));
    setCopied(false);
  }

  function handleClear() {
    setComposition(emptyComposition());
    setCopied(false);
  }

  async function handleCopy() {
    if (rendered === "") return;
    try {
      await navigator.clipboard.writeText(rendered);
    } catch {
      // Clipboard API can be unavailable (e.g. non-secure context); the
      // rendered string is still visible for manual copy.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__mark" aria-hidden="true">
          🎨
        </div>
        <div>
          <h1 className="hero__title">Amoji Engine</h1>
          <p className="hero__subtitle">
            Search {totalCount} emoji, compose a creation, and copy it anywhere.
          </p>
        </div>
      </header>

      <section className="composer" aria-label="Composition">
        <div className="composer__stage">
          {composition.slots.length === 0 ? (
            <span className="composer__placeholder">
              Tap emoji below to build your creation…
            </span>
          ) : (
            <div className="composer__slots">
              {composition.slots.map((char, index) => (
                <button
                  key={`${char}-${index}`}
                  className="composer__slot"
                  onClick={() => handleRemove(index)}
                  title="Remove"
                  aria-label={`Remove ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="composer__actions">
          <span className="composer__count">
            {composition.slots.length} / {MAX_COMPOSITION_SLOTS}
          </span>
          <button
            className="btn btn--primary"
            onClick={handleCopy}
            disabled={rendered === ""}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            className="btn"
            onClick={handleClear}
            disabled={rendered === ""}
          >
            Clear
          </button>
        </div>
      </section>

      <div className="controls">
        <input
          className="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji by name or keyword (try “fire”, “love”, “rocket”)"
          aria-label="Search emoji"
        />
      </div>

      <nav className="tabs" aria-label="Categories">
        <button
          className={`tab ${category === "all" ? "tab--active" : ""}`}
          onClick={() => setCategory("all")}
        >
          All
        </button>
        {counts.map(({ category: cat, count }) => (
          <button
            key={cat}
            className={`tab ${category === cat ? "tab--active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
            <span className="tab__count">{count}</span>
          </button>
        ))}
      </nav>

      <main>
        {results.length === 0 ? (
          <p className="empty">
            No emoji match “{query}”. Try a different word.
          </p>
        ) : (
          <ul className="grid" aria-label="Emoji results">
            {results.map((emoji) => (
              <li key={emoji.char}>
                <button
                  className="grid__item"
                  onClick={() => handleAdd(emoji.char)}
                  disabled={isFull}
                  title={emoji.name}
                  aria-label={`Add ${emoji.name}`}
                >
                  <span className="grid__emoji">{emoji.char}</span>
                  <span className="grid__name">{emoji.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="footer">
        <span>
          Showing {results.length} of {totalCount} emoji
        </span>
      </footer>
    </div>
  );
}
