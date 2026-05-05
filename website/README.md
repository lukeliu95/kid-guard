# KidGuard Landing Page

This is the KidGuard product landing page. It is a single-page static site (vanilla HTML + CSS, zero npm dependencies) deployed to Vercel via the GitHub integration.

## Files

- `index.html` - the landing page (lang=zh-CN, Superhuman-derived dark-first design)
- `style.css` - all styles (ASCII-only comments per pitfall-20260417)
- `vercel.json` - deploy config (no build step; cleanUrls: false to avoid pitfall_vercel_cleanurls_rewrite_root)
- `robots.txt` - allow all crawlers
- `assets/` - hero images (hero-shield / hero-wizard / hero-privacy)

## Deploy

Vercel auto-deploys on every push to `main` of `lukeliu95/kid-guard`. The Vercel project should be wired to the `website/` subdirectory as the project root.

Local preview: any static file server, e.g. `python3 -m http.server 8080`.

## Analytics

Google Analytics gtag.js is injected with the GEI-default Measurement ID `G-NWMQ1ZWXL1`. Do NOT add a second analytics tracker (Vercel Analytics / Plausible / etc.) - this is a project-wide convention.
