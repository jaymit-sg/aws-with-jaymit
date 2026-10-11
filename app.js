(() => {
  "use strict";
  const VIDEO_FILE = "data/videos.json";
  const ROADMAP_FILE = "data/roadmaps.json";
  const STORAGE_KEY = "aws-with-jaymit-progress-v1";
  const categories = ["All topics", "Fundamentals", "Serverless", "AI & Agents", "DevOps", "Architecture", "Certification"];
  let videos = [];
  let roadmaps = [];
  let completed = new Set();
  let selectedCategory = "All topics";

  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(parsed)) completed = new Set(parsed.filter((id) => typeof id === "string"));
    } catch (_) { completed = new Set(); }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed])); } catch (_) {}
  }
  function setProgressUI() {
    const knownIds = new Set(videos.map((video) => video.id));
    const count = [...completed].filter((id) => knownIds.has(id)).length;
    const percent = videos.length ? Math.round(count / videos.length * 100) : 0;
    $("#heroPercent").textContent = `${percent}%`;
    $("#heroBar").style.width = `${percent}%`;
    $("#heroDone").textContent = `${count} lessons completed`;
    $("#heroTotal").textContent = `${videos.length} lessons`;
    $("#progressPercent").textContent = percent;
    $("#progressBar").style.width = `${percent}%`;
    $("#progressSummary").textContent = `${count} of ${videos.length} lessons completed`;
  }
  function renderRoadmaps() {
    const byId = new Map(videos.map((video) => [video.id, video]));
    $("#roadmapGrid").innerHTML = roadmaps.map((roadmap) => {
      const roadmapVideos = roadmap.videoIds.map((id) => byId.get(id)).filter(Boolean);
      const done = roadmapVideos.filter((video) => completed.has(video.id)).length;
      const percent = roadmapVideos.length ? Math.round(done / roadmapVideos.length * 100) : 0;
      const steps = roadmap.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("");
      return `<article class="path-card">
        <div class="path-top"><span class="path-icon">${escapeHTML(roadmap.icon)}</span><span class="chip-label">${escapeHTML(roadmap.category)}</span></div>
        <h3>${escapeHTML(roadmap.title)}</h3><p>${escapeHTML(roadmap.description)}</p>
        <details class="roadmap-details"><summary>View learning sequence (${roadmap.steps.length} steps)</summary><ol>${steps}</ol></details>
        <div class="path-meta"><span>${roadmapVideos.length} linked lessons</span><span>${escapeHTML(roadmap.level)}</span></div>
        <div class="mini-bar"><span style="width:${percent}%"></span></div><div class="path-foot"><span>${done} completed</span><b>${percent}% progress</b></div>
        <button class="text-link roadmap-filter" data-category="${escapeHTML(roadmap.category)}">Explore ${escapeHTML(roadmap.category)} videos →</button>
      </article>`;
    }).join("");
    document.querySelectorAll(".roadmap-filter").forEach((button) => button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      $("#searchInput").value = "";
      $("#levelFilter").value = "";
      renderCategoryFilters();
      renderVideos();
      $("#catalog").scrollIntoView({ behavior: "smooth" });
    }));
  }
  function renderCategoryFilters() {
    $("#categoryFilters").innerHTML = categories.map((category) =>
      `<button class="filter-chip ${category === selectedCategory ? "active" : ""}" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`
    ).join("");
    document.querySelectorAll(".filter-chip").forEach((button) => button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      renderCategoryFilters();
      renderVideos();
    }));
  }
  function renderVideos() {
    const query = $("#searchInput").value.toLowerCase().trim();
    const level = $("#levelFilter").value;
    const filtered = videos.filter((video) => {
      const text = [video.title, video.description, video.category, video.level, ...(video.tags || [])].join(" ").toLowerCase();
      return (!query || text.includes(query)) &&
        (selectedCategory === "All topics" || video.category === selectedCategory) &&
        (!level || video.level === level);
    });
    $("#resultCount").textContent = `${filtered.length} ${filtered.length === 1 ? "video" : "videos"} found`;
    $("#emptyState").hidden = filtered.length > 0;
    $("#videoGrid").innerHTML = filtered.map((video) => {
      const isDone = completed.has(video.id);
      const tags = (video.tags || []).slice(0, 4).map((tag) => `<span>#${escapeHTML(tag)}</span>`).join("");
      return `<article class="video-card">
        <div class="video-top"><span class="video-category">${escapeHTML(video.category)}</span><span class="level ${escapeHTML(video.level.toLowerCase())}">${escapeHTML(video.level)}</span></div>
        <h3>${escapeHTML(video.title)}</h3><p>${escapeHTML(video.description)}</p>
        <div class="tags">${tags}</div>
        <div class="video-bottom"><span>◷ ${escapeHTML(video.duration)}</span><span class="${isDone ? "complete" : ""}">${isDone ? "✓ Completed" : "Not completed"}</span></div>
        <div class="card-actions"><a class="text-link" href="${escapeHTML(video.youtubeUrl)}" target="_blank" rel="noopener">Watch video ↗</a>${video.playlistId ? `<a class="text-link" href="playlist.html?id=${encodeURIComponent(video.playlistId)}">${escapeHTML(video.playlistTitle || "Playlist")} →</a>` : ""}<button class="text-link toggle-complete" data-id="${escapeHTML(video.id)}">${isDone ? "Undo completion" : "Mark complete"}</button></div>
      </article>`;
    }).join("");
    document.querySelectorAll(".toggle-complete").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.id;
      if (completed.has(id)) completed.delete(id); else completed.add(id);
      saveProgress(); renderVideos(); renderRoadmaps(); setProgressUI();
    }));
  }
  async function init() {
    loadProgress();
    try {
      const [videoResponse, roadmapResponse, playlistResponse] = await Promise.all([fetch(VIDEO_FILE), fetch(ROADMAP_FILE), fetch("data/playlists.json")]);
      if (!videoResponse.ok || !roadmapResponse.ok || !playlistResponse.ok) throw new Error("Could not load JSON data files.");
      const guides = await videoResponse.json();
      roadmaps = await roadmapResponse.json();
      const playlistIndex = await playlistResponse.json();
      const playlistResults = await Promise.all(playlistIndex.map(async (playlist) => {
        try {
          const response = await fetch(playlist.dataFile);
          if (!response.ok) return [];
          const payload = await response.json();
          return (Array.isArray(payload.videos) ? payload.videos : []).map((video) => ({
            ...video,
            id: video.id || `${playlist.id}-${video.videoId}`,
            title: video.title || "Untitled YouTube video",
            category: video.category || playlist.category,
            level: video.level || playlist.level,
            duration: video.duration || "",
            description: video.description || "",
            tags: video.tags || playlist.topics || [],
            youtubeUrl: video.youtubeUrl || `https://www.youtube.com/watch?v=${video.videoId}`,
            playlistTitle: playlist.title,
            playlistId: playlist.id,
            videoId: video.videoId,
            featured: false
          }));
        } catch (_) { return []; }
      }));
      const playlistVideos = playlistResults.flat();
      const seen = new Set();
      videos = [...playlistVideos, ...guides].filter((video) => {
        const key = video.videoId || video.id;
        if (!key || seen.has(key)) return false;
        seen.add(key); return true;
      });
      renderCategoryFilters();
      renderRoadmaps();
      renderVideos();
      setProgressUI();
    } catch (error) {
      $("#roadmapGrid").innerHTML = '<p class="loading">Could not load learning data. Please run this website through a local web server; opening index.html directly may block JSON fetches.</p>';
      $("#resultCount").textContent = "Video data could not be loaded";
      console.error(error);
    }
    $("#searchInput").addEventListener("input", renderVideos);
    $("#clearSearch").addEventListener("click", () => { $("#searchInput").value = ""; renderVideos(); $("#searchInput").focus(); });
    $("#levelFilter").addEventListener("change", renderVideos);
    $("#resetProgress").addEventListener("click", () => {
      if (window.confirm("Reset all learning progress saved in this browser?")) {
        completed.clear(); saveProgress(); renderVideos(); renderRoadmaps(); setProgressUI();
      }
    });
    $("#menuBtn").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
    document.querySelectorAll("#navLinks a").forEach((link) => link.addEventListener("click", () => $("#navLinks").classList.remove("open")));
  }
  document.addEventListener("DOMContentLoaded", init);
})();