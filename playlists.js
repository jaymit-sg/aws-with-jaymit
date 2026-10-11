(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let all = [];
  async function loadCounts() {
    await Promise.all(all.map(async p => {
      try { const r = await fetch(p.dataFile); if (r.ok) { const d = await r.json(); p.videoCount = Array.isArray(d.videos) ? d.videos.length : 0; } }
      catch (_) { p.videoCount = 0; }
    }));
  }
  function render() {
    const q = $("#playlistSearch").value.trim().toLowerCase();
    const found = all.filter(p => [p.title,p.description,p.category,p.level,...(p.topics||[])].join(" ").toLowerCase().includes(q));
    $("#playlistCount").textContent = `${found.length} playlist${found.length === 1 ? "" : "s"}`;
    $("#playlistGrid").innerHTML = found.map(p => `
      <article class="playlist-card"><div class="playlist-card-top"><span class="playlist-icon">${esc(p.icon)}</span><span class="chip-label">${esc(p.category)}</span></div>
      <h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><div class="playlist-topics">${(p.topics||[]).map(t=>`<span>${esc(t)}</span>`).join("")}</div>
      <div class="playlist-card-foot"><span>${esc(p.level)}</span><span>${Number(p.videoCount||0)} videos listed</span></div>
      <a class="btn primary full-btn" href="playlist.html?id=${encodeURIComponent(p.id)}">View video list →</a>
      <a class="external-playlist" href="${esc(p.youtubeUrl)}" target="_blank" rel="noopener">Open playlist on YouTube ↗</a></article>`).join("");
    if (!found.length) $("#playlistGrid").innerHTML = '<p class="empty">No playlists found. Try another search.</p>';
  }
  async function init() {
    try {
      const response = await fetch("data/playlists.json");
      if (!response.ok) throw new Error("Playlist index could not be loaded");
      all = await response.json(); await loadCounts(); render();
      $("#playlistSearch").addEventListener("input", render);
    } catch (e) {
      $("#playlistGrid").innerHTML = '<p class="loading">Could not load playlist data. Run this site through a local web server.</p>';
      console.error(e);
    }
    $("#menuBtn")?.addEventListener("click", () => $("#navLinks").classList.toggle("open"));
  }
  document.addEventListener("DOMContentLoaded", init);
})();
