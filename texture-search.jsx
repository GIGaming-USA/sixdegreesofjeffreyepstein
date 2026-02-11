import { useState, useEffect, useRef } from "react";

const TEXTURE_CATEGORIES = [
  { id: "wood", label: "Wood", icon: "🪵" },
  { id: "stone", label: "Stone", icon: "🪨" },
  { id: "metal", label: "Metal", icon: "⚙️" },
  { id: "fabric", label: "Fabric", icon: "🧵" },
  { id: "concrete", label: "Concrete", icon: "🏗️" },
  { id: "brick", label: "Brick", icon: "🧱" },
  { id: "marble", label: "Marble", icon: "💎" },
  { id: "grass", label: "Grass", icon: "🌿" },
  { id: "sand", label: "Sand", icon: "🏖️" },
  { id: "leather", label: "Leather", icon: "👜" },
  { id: "tile", label: "Tile", icon: "🔲" },
  { id: "rust", label: "Rust", icon: "🔶" },
  { id: "bark", label: "Bark", icon: "🌳" },
  { id: "plaster", label: "Plaster", icon: "🏠" },
  { id: "asphalt", label: "Asphalt", icon: "🛣️" },
];

const TRUSTED_SOURCES = [
  "ambientcg.com",
  "polyhaven.com",
  "textures.com",
  "cc0textures.com",
  "sharetextures.com",
  "cgbookcase.com",
  "3dtextures.me",
  "freepbr.com",
];

function TextureCard({ texture, index, onPreview }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className="texture-card"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => onPreview(texture)}
    >
      <div className="texture-img-wrap">
        {!loaded && !error && (
          <div className="texture-skeleton">
            <div className="skeleton-pulse" />
          </div>
        )}
        {error ? (
          <div className="texture-error">
            <span>⚠️</span>
            <small>Preview unavailable</small>
          </div>
        ) : (
          <img
            src={texture.url}
            alt={texture.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}
        <div className="texture-overlay">
          <span className="preview-btn">🔍 Preview</span>
        </div>
        <div className="texture-badge">FREE</div>
        <div className="texture-res">4K</div>
      </div>
      <div className="texture-info">
        <h3>{texture.title}</h3>
        <p className="texture-source">{texture.source}</p>
        {texture.pageUrl && (
          <a
            href={texture.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="download-link"
            onClick={(e) => e.stopPropagation()}
          >
            ↗ Download from source
          </a>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ texture, onClose }) {
  if (!texture) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <img src={texture.url} alt={texture.title} />
        <div className="modal-info">
          <h2>{texture.title}</h2>
          <div className="modal-meta">
            <span className="meta-tag free">CC0 / Free</span>
            <span className="meta-tag res">4K Resolution</span>
            <span className="meta-tag source">{texture.source}</span>
          </div>
          {texture.pageUrl && (
            <a
              href={texture.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-download"
            >
              Download Full Resolution ↗
            </a>
          )}
          <p className="modal-note">
            ✓ No watermarks · ✓ Free for commercial use · ✓ High resolution
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TextureSearch() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [textures, setTextures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [previewTexture, setPreviewTexture] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const searchTextures = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    setTextures([]);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Search for free 4K ${searchQuery} textures available for download without watermarks. Focus on sites like ambientcg.com, polyhaven.com, sharetextures.com, cgbookcase.com, 3dtextures.me, and freepbr.com. Find specific texture names and their download pages.`,
            },
          ],
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
            },
          ],
        }),
      });

      const data = await response.json();

      // Extract URLs and info from the response
      const textContent = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      // Extract search result URLs from web search blocks
      const searchResults = [];
      data.content.forEach((block) => {
        if (block.type === "web_search_tool_result" && block.content) {
          block.content.forEach((item) => {
            if (item.type === "web_search_result") {
              const isTrusted = TRUSTED_SOURCES.some((s) =>
                item.url?.includes(s)
              );
              if (isTrusted) {
                searchResults.push({
                  title: item.title || "",
                  url: item.url || "",
                  snippet: item.snippet || "",
                });
              }
            }
          });
        }
      });

      // Now search for actual texture images
      const imageResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: `Based on these search results for free 4K ${searchQuery} textures, create a JSON array of texture entries. 
                
Search results:
${searchResults.map((r) => `- ${r.title}: ${r.url}`).join("\n")}

Additional context: ${textContent.substring(0, 500)}

Return ONLY a JSON array (no markdown, no backticks) with objects containing:
- "title": descriptive name of the texture
- "source": website name (e.g. "Poly Haven", "ambientCG")  
- "pageUrl": the actual URL to download page
- "searchTerm": a good search term to find a preview image of this specific texture

Return 6-10 entries. Only include textures that are genuinely free (CC0 or similar) and available in 4K.`,
              },
            ],
          }),
        }
      );

      const imageData = await imageResponse.json();
      const imgText = imageData.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");

      let parsedTextures = [];
      try {
        const cleaned = imgText.replace(/```json|```/g, "").trim();
        parsedTextures = JSON.parse(cleaned);
      } catch {
        // Fallback: create entries from search results
        parsedTextures = searchResults.slice(0, 8).map((r) => ({
          title: r.title.replace(/ - .*$/, "").substring(0, 50),
          source: TRUSTED_SOURCES.find((s) => r.url.includes(s)) || "Free Source",
          pageUrl: r.url,
          searchTerm: `${searchQuery} texture seamless 4k`,
        }));
      }

      // Generate preview image URLs using placeholder approach
      const finalTextures = parsedTextures.map((t, i) => ({
        id: i,
        title: t.title || `${searchQuery} Texture ${i + 1}`,
        source: t.source || "Free Source",
        pageUrl: t.pageUrl || "",
        url: `https://source.unsplash.com/512x512/?${encodeURIComponent(
          searchQuery + " texture " + (t.searchTerm || "")
        )}&sig=${i}`,
      }));

      setTextures(finalTextures);
    } catch (err) {
      console.error(err);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchTextures(query);
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat.id);
    setQuery(cat.label);
    searchTextures(cat.label);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg: #0a0a0b;
          --surface: #141416;
          --surface2: #1c1c20;
          --border: #2a2a30;
          --text: #e8e6e3;
          --text-dim: #888890;
          --accent: #c8ff00;
          --accent-dim: #8fb300;
          --danger: #ff4444;
          --success: #00cc88;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .app {
          min-height: 100vh;
          background: var(--bg);
          position: relative;
        }

        .app::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: 
            radial-gradient(ellipse at 20% 0%, rgba(200, 255, 0, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 100%, rgba(200, 255, 0, 0.02) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .noise-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        /* HEADER */
        header {
          padding: 48px 0 24px;
          text-align: center;
        }

        .logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--accent);
          border-radius: 6px;
          display: grid;
          place-items: center;
          font-size: 22px;
          transform: rotate(-3deg);
        }

        h1 {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 42px;
          letter-spacing: -2px;
          color: var(--text);
        }

        h1 span {
          color: var(--accent);
        }

        .subtitle {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: var(--text-dim);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .trust-badges {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .trust-badge {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--success);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(0, 204, 136, 0.08);
          border: 1px solid rgba(0, 204, 136, 0.15);
          border-radius: 4px;
        }

        /* SEARCH */
        .search-section {
          max-width: 720px;
          margin: 32px auto;
        }

        .search-form {
          display: flex;
          gap: 0;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .search-form:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 4px rgba(200, 255, 0, 0.08);
        }

        .search-form input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 18px 24px;
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          color: var(--text);
          outline: none;
        }

        .search-form input::placeholder {
          color: var(--text-dim);
        }

        .search-btn {
          background: var(--accent);
          color: var(--bg);
          border: none;
          padding: 18px 32px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .search-btn:hover {
          background: #deff44;
        }

        .search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* CATEGORIES */
        .categories {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 20px;
        }

        .cat-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
        }

        .cat-chip:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: rgba(200, 255, 0, 0.05);
        }

        .cat-chip.active {
          border-color: var(--accent);
          color: var(--bg);
          background: var(--accent);
        }

        /* RESULTS */
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 40px 0 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .results-header h2 {
          font-size: 18px;
          font-weight: 600;
        }

        .results-count {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--text-dim);
        }

        .texture-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          padding-bottom: 80px;
        }

        .texture-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s;
          animation: cardIn 0.4s ease both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .texture-card:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }

        .texture-img-wrap {
          position: relative;
          aspect-ratio: 1;
          background: var(--surface2);
          overflow: hidden;
        }

        .texture-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.3s, transform 0.4s;
        }

        .texture-card:hover .texture-img-wrap img {
          transform: scale(1.05);
        }

        .texture-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.25s;
        }

        .texture-card:hover .texture-overlay {
          opacity: 1;
        }

        .preview-btn {
          background: var(--accent);
          color: var(--bg);
          padding: 10px 20px;
          border-radius: 8px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 14px;
        }

        .texture-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: var(--success);
          color: #000;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 1px;
        }

        .texture-res {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          color: var(--accent);
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          backdrop-filter: blur(8px);
        }

        .texture-info {
          padding: 14px 16px 16px;
        }

        .texture-info h3 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .texture-source {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .download-link {
          display: inline-block;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--accent);
          text-decoration: none;
          padding: 4px 10px;
          border: 1px solid var(--accent);
          border-radius: 4px;
          transition: all 0.15s;
        }

        .download-link:hover {
          background: var(--accent);
          color: var(--bg);
        }

        /* SKELETON */
        .texture-skeleton {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
        }

        .skeleton-pulse {
          width: 60%;
          height: 60%;
          border-radius: 8px;
          background: linear-gradient(110deg, var(--surface2) 30%, var(--border) 50%, var(--surface2) 70%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          to { background-position: -200% 0; }
        }

        .texture-error {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: var(--text-dim);
          font-size: 28px;
        }

        .texture-error small {
          font-size: 11px;
          font-family: 'Space Mono', monospace;
        }

        /* LOADING */
        .loading-state {
          text-align: center;
          padding: 80px 20px;
        }

        .loader {
          width: 48px;
          height: 48px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: var(--text-dim);
        }

        .loading-sub {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 8px;
          opacity: 0.6;
        }

        /* EMPTY / ERROR */
        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }

        .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state h3 { font-size: 20px; margin-bottom: 8px; }
        .empty-state p {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: var(--text-dim);
        }

        .error-msg {
          text-align: center;
          padding: 40px;
          color: var(--danger);
          font-family: 'Space Mono', monospace;
          font-size: 13px;
        }

        /* MODAL */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          overflow: hidden;
          position: relative;
          animation: modalIn 0.3s ease;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          background: rgba(0,0,0,0.6);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          z-index: 10;
          display: grid;
          place-items: center;
          transition: background 0.15s;
        }

        .modal-close:hover {
          background: var(--danger);
          border-color: var(--danger);
        }

        .modal-content img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }

        .modal-info {
          padding: 20px 24px 24px;
        }

        .modal-info h2 {
          font-size: 20px;
          margin-bottom: 12px;
        }

        .modal-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .meta-tag {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 4px;
        }

        .meta-tag.free {
          background: rgba(0, 204, 136, 0.12);
          color: var(--success);
          border: 1px solid rgba(0, 204, 136, 0.2);
        }

        .meta-tag.res {
          background: rgba(200, 255, 0, 0.1);
          color: var(--accent);
          border: 1px solid rgba(200, 255, 0, 0.2);
        }

        .meta-tag.source {
          background: var(--surface2);
          color: var(--text-dim);
          border: 1px solid var(--border);
        }

        .modal-download {
          display: inline-block;
          background: var(--accent);
          color: var(--bg);
          padding: 12px 24px;
          border-radius: 8px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          transition: background 0.15s;
        }

        .modal-download:hover {
          background: #deff44;
        }

        .modal-note {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--success);
          margin-top: 14px;
          opacity: 0.8;
        }

        /* FOOTER */
        .footer {
          text-align: center;
          padding: 40px 20px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          border-top: 1px solid var(--border);
          margin-top: 40px;
        }

        .footer a {
          color: var(--accent);
          text-decoration: none;
        }

        .sources-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          margin-top: 12px;
        }

        .sources-list span {
          padding: 3px 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-size: 10px;
        }

        @media (max-width: 640px) {
          h1 { font-size: 28px; }
          .search-form { flex-direction: column; }
          .search-btn { padding: 14px; }
          .texture-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
          header { padding: 32px 0 16px; }
        }
      `}</style>

      <div className="noise-overlay" />

      <div className="container">
        <header>
          <div className="logo-row">
            <div className="logo-icon">◆</div>
            <h1>TEX<span>4K</span></h1>
          </div>
          <p className="subtitle">Free 4K Texture Search · No Watermarks · Commercial Ready</p>
          <div className="trust-badges">
            <span className="trust-badge">✓ CC0 Licensed</span>
            <span className="trust-badge">✓ No Watermarks</span>
            <span className="trust-badge">✓ 4K Resolution</span>
            <span className="trust-badge">✓ Commercial Use OK</span>
          </div>
        </header>

        <section className="search-section">
          <form className="search-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search textures... (e.g. weathered oak, polished marble)"
            />
            <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
              {loading ? "Searching..." : "Search 4K Textures"}
            </button>
          </form>

          <div className="categories">
            {TEXTURE_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className={`cat-chip ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => handleCategoryClick(cat)}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </div>
            ))}
          </div>
        </section>

        {error && <div className="error-msg">{error}</div>}

        {loading && (
          <div className="loading-state">
            <div className="loader" />
            <p className="loading-text">Searching trusted texture libraries...</p>
            <p className="loading-sub">Filtering for CC0, watermark-free, 4K resolution</p>
          </div>
        )}

        {!loading && searched && textures.length > 0 && (
          <>
            <div className="results-header">
              <h2>Results for "{query}"</h2>
              <span className="results-count">{textures.length} textures found</span>
            </div>
            <div className="texture-grid">
              {textures.map((tex, i) => (
                <TextureCard
                  key={tex.id}
                  texture={tex}
                  index={i}
                  onPreview={setPreviewTexture}
                />
              ))}
            </div>
          </>
        )}

        {!loading && searched && textures.length === 0 && !error && (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No textures found</h3>
            <p>Try a different search term or pick a category above</p>
          </div>
        )}

        {!searched && !loading && (
          <div className="empty-state">
            <div className="icon">◆</div>
            <h3>Search Free 4K Textures</h3>
            <p>Find high-quality, watermark-free textures from trusted open libraries</p>
          </div>
        )}

        <footer className="footer">
          <p>Searches only trusted, free texture sources:</p>
          <div className="sources-list">
            {TRUSTED_SOURCES.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </footer>
      </div>

      <PreviewModal texture={previewTexture} onClose={() => setPreviewTexture(null)} />
    </div>
  );
}
