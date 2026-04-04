# SEO ops note — 2026-03-26

## Niche selected
- **買取比較.net** article layer (`articles/`) for long-tail resale SEO.
- Focus today: stabilize the freshly generated long-tail article pages so they stop shipping placeholder-looking price copy and have cleaner meta for indexation/social previews.

## What shipped
- Updated `scripts/generate-article-pages.js` to:
  - generate **description text without ugly placeholder dashes** when numeric prices are missing
  - fall back to **`相場確認中`** instead of `—` in article copy/UI
  - add explicit **`meta robots=index,follow`** on article pages
  - add **Twitter meta tags** for article shares
  - add **`dateModified`** + `mainEntityOfPage` to Article JSON-LD
  - include `modifiedAt` in generated article manifest rows
- Rebuilt:
  - `articles/`
  - `data/article-manifest.json`
  - `sitemaps/` + `sitemap.xml`
  - `deploy-dist/`

## Verification
- `node --check scripts/generate-article-pages.js`
- `npm run articles:lite`
- `npm run sitemaps`
- `npm run build:deploy`
- Post-build grep/check: **0 article files** still contain `標準相場 —` / `すぐ売るライン —` / `強気価格 —`

## Deploy status
- Deployment package prepared in `deploy-dist/`.
- **Not deployed in this run**; safe next step is a Wrangler deploy from current tree after quick spot-check.

## Best next improvement
- Add **intent hub pages** (ex: `sell-fast`, `where-to-sell`, `high-price-tips`) so the 2,800 article pages have stronger thematic internal-link structures and additional indexable landing pages.
