# AWS with Jaymit — GitHub Pages static website

A plain HTML, CSS and JavaScript learning website. It uses **separate JSON files for each YouTube playlist**, has no database, and makes no YouTube API calls at runtime. GitHub Pages serves the HTML, CSS, JavaScript and JSON files over HTTPS, so the site's `fetch()` calls work normally.

## Features

- Homepage, learning paths, video library, progress tracking and playlist directory.
- Search and filter the learning catalog.
- Playlist directory search and per-playlist video counts.
- Dedicated playlist pages with individual video cards, thumbnails, duration/date when available, local search, sorting, previous/next controls and embedded player.
- Website-wide video search combines per-playlist JSON data with the hand-curated learning guides in `data/videos.json`.
- Browser-only learning progress saved to `localStorage`; no account or database.
- No API key is required. Video playback requires internet access and depends on YouTube embedding availability.

## Important: populate the video lists before publishing

The included per-playlist JSON files are initialized with empty `videos` arrays. The site and search features are wired up, but native video cards and global search results for playlist videos will not appear until these files contain real video records. Do not skip this step if you want full video listings.

On a computer with Python 3.10+ and internet access:

1. Open a terminal in the project folder.
2. Run `python -m pip install -r requirements.txt`.
3. Run `python sync_playlists.py` (or double-click `sync-playlists.bat` on Windows).
4. Review the updated JSON files under `data/playlists/` and commit them to GitHub.

The sync script uses `yt-dlp` to retrieve metadata from public YouTube playlists. Private, deleted, restricted or otherwise unavailable videos may not be retrievable. Run it again when you add or reorder videos on YouTube. **The sync is done before publishing; the deployed website itself needs no Python, server, database, API key or build step.**

## Deploy to GitHub Pages (automatic)

This repository includes `.github/workflows/deploy-pages.yml`. It deploys the static site to GitHub Pages whenever you push to the `main` branch.

1. Create a GitHub repository, for example `aws-with-jaymit`.
2. Extract this ZIP and upload/commit the **contents of this folder** to the repository root. Ensure `index.html`, `playlists.html`, `playlist.html`, `styles.css`, `app.js`, `playlist.js`, `playlists.js`, `data/`, `.nojekyll`, and `.github/` are at the repository root (not inside an extra nested project folder).
3. In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
4. Push the files to the `main` branch. Open the repository's **Actions** tab and wait for “Deploy static site to GitHub Pages” to succeed.
5. Open the published URL shown in **Settings → Pages**. For a project repository it is typically `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

After the first setup, each push to `main` redeploys the site automatically. No Python server is needed for visitors. If the workflow cannot deploy, confirm that Pages is set to **GitHub Actions** and that the repository allows Actions to run.

## Local preview

GitHub Pages is the intended hosting target. For local testing, `file://` may block JSON `fetch()` calls, so run `python -m http.server 8000` and visit `http://localhost:8000`.

## Data files

- `data/playlists.json` — playlist directory and JSON path for each playlist.
- `data/playlists/aws-beginners.json`
- `data/playlists/aws-beginners-continued.json`
- `data/playlists/aws-serverless.json`
- `data/playlists/aws-generative-ai.json`
- `data/playlists/aws-certifications.json`
- `data/playlists/aws-community.json`
- `data/videos.json` — additional manually curated video/topic records.
- `data/roadmaps.json` — learning roadmaps.

## Video JSON record example

```json
{
  "id": "aws-serverless-VIDEO_ID",
  "videoId": "VIDEO_ID",
  "position": 1,
  "title": "Exact YouTube title",
  "description": "Video description when available",
  "duration": "18:24",
  "durationSeconds": 1104,
  "publishedAt": "2026-01-15",
  "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "category": "Serverless",
  "level": "Beginner",
  "tags": ["lambda", "serverless"]
}
```

The website is an independent learning resource and is not an official AWS website.
