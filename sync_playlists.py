#!/usr/bin/env python3
"""Export public YouTube playlist video metadata into per-playlist JSON files.

Run before publishing, then commit the updated JSON files. The deployed site
uses only these JSON files and does not call YouTube APIs at runtime.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yt_dlp
except ImportError:
    print("Missing dependency. Run: python -m pip install -r requirements.txt", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "data" / "playlists.json"


def duration_label(seconds):
    if seconds is None:
        return ""
    try:
        seconds = int(seconds)
    except (TypeError, ValueError):
        return ""
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def main():
    playlists = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    ydl_opts = {
        "quiet": False,
        "no_warnings": True,
        "ignoreerrors": True,
        "extract_flat": False,
        "skip_download": True,
        "noplaylist": False,
        "socket_timeout": 25,
        "retries": 2,
    }
    succeeded = 0
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        for playlist in playlists:
            url = playlist.get("youtubeUrl") or f"https://www.youtube.com/playlist?list={playlist['youtubePlaylistId']}"
            target = ROOT / playlist["dataFile"]
            print(f"\nSyncing: {playlist['title']}\n{url}")
            try:
                info = ydl.extract_info(url, download=False)
            except Exception as exc:
                print(f"  ERROR: {exc}", file=sys.stderr)
                continue
            if not info:
                print("  No playlist metadata returned; existing JSON left unchanged.", file=sys.stderr)
                continue
            entries = info.get("entries") or []
            videos = []
            for item in entries:
                if not item:
                    continue
                video_id = item.get("id")
                if not video_id:
                    continue
                position = item.get("playlist_index") or item.get("playlist_autonumber") or len(videos) + 1
                thumbnail = item.get("thumbnail")
                if not thumbnail and item.get("thumbnails"):
                    thumbnail = item["thumbnails"][-1].get("url")
                upload_date = item.get("upload_date") or ""
                published_at = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:8]}" if len(upload_date) == 8 else ""
                videos.append({
                    "id": f"{playlist['id']}-{video_id}",
                    "videoId": video_id,
                    "position": int(position),
                    "title": item.get("title") or f"YouTube video {video_id}",
                    "description": (item.get("description") or "")[:1000],
                    "duration": duration_label(item.get("duration")),
                    "durationSeconds": item.get("duration"),
                    "publishedAt": published_at,
                    "thumbnail": thumbnail or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                    "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}&list={playlist['youtubePlaylistId']}",
                    "category": playlist.get("category", "AWS"),
                    "level": playlist.get("level", "All levels"),
                    "tags": playlist.get("topics", []),
                })
            videos.sort(key=lambda v: v.get("position", 0))
            payload = {
                "playlistId": playlist["id"],
                "title": playlist["title"],
                "youtubePlaylistId": playlist["youtubePlaylistId"],
                "youtubeUrl": url,
                "lastSyncedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "source": "YouTube playlist metadata exported with yt-dlp",
                "videos": videos,
            }
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"  Wrote {len(videos)} video records to {target.relative_to(ROOT)}")
            succeeded += 1
    if succeeded == 0:
        print("No playlists were synced. Check internet access and whether the playlists are public.", file=sys.stderr)
        raise SystemExit(2)
    print(f"\nFinished. Synced {succeeded} playlist file(s). Review and commit the changed JSON files before deployment.")


if __name__ == "__main__":
    main()
