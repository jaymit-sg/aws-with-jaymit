(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let playlist = null, videos = [], currentIndex = -1;
  const getDuration = (v) => Number.isFinite(Number(v.durationSeconds)) ? Number(v.durationSeconds) : 0;
  function orderedVideos() {
    const query = $("#videoSearch").value.trim().toLowerCase();
    const sort = $("#videoSort").value;
    const found = videos.filter(v => [v.title,v.description,v.category,v.level,...(v.tags||[])].join(" ").toLowerCase().includes(query));
    found.sort((a,b) => {
      if (sort === "title-asc") return a.title.localeCompare(b.title);
      if (sort === "title-desc") return b.title.localeCompare(a.title);
      if (sort === "newest") return String(b.publishedAt||"").localeCompare(String(a.publishedAt||""));
      if (sort === "oldest") return String(a.publishedAt||"").localeCompare(String(b.publishedAt||""));
      if (sort === "duration") return getDuration(a)-getDuration(b);
      return Number(a.position||0)-Number(b.position||0);
    });
    return found;
  }
  function selectVideo(videoId) {
    currentIndex = videos.findIndex(v => v.videoId === videoId || v.id === videoId);
    const v = videos[currentIndex]; if (!v) return;
    const embedId = v.videoId || (v.youtubeUrl||"").match(/[?&]v=([^&]+)/)?.[1];
    $("#nowPlayingTitle").textContent = v.title;
    $("#openCurrentVideo").href = v.youtubeUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(embedId||"")}`;
    $("#openCurrentVideo").hidden = false;
    $("#singleVideoPlayer").innerHTML = embedId
      ? `<iframe title="${esc(v.title)}" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(embedId)}?rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="eager"></iframe>`
      : `<div class="player-unavailable"><p>This video has no valid YouTube video ID in its JSON record.</p><a class="btn primary" href="${esc(v.youtubeUrl||playlist.youtubeUrl)}" target="_blank" rel="noopener">Open on YouTube ↗</a></div>`;
    $("#playPosition").textContent = `Video ${currentIndex+1} of ${videos.length}`;
    $("#previousVideo").disabled = currentIndex <= 0;
    $("#nextVideo").disabled = currentIndex >= videos.length-1;
    document.querySelectorAll(".native-video-card").forEach(card => card.classList.toggle("active", card.dataset.videoId === String(v.videoId||v.id)));
  }
  function renderVideos() {
    const found = orderedVideos();
    $("#videoResultCount").textContent = `${found.length} of ${videos.length} videos`;
    $("#videoCount").textContent = `${videos.length} videos`;
    $("#videoEmptyState").hidden = found.length > 0;
    if (!videos.length) {
      $("#nativeVideoList").innerHTML = `<div class="json-empty"><span class="empty-icon">▤</span><h3>Playlist video data has not been imported yet</h3><p>This page is ready to list, search, sort and play videos from its JSON file. The JSON file currently contains no verified video records, so no video titles or IDs have been invented.</p><p>Run <code>python sync_playlists.py</code> from the extracted project folder on a computer with internet access to import the playlist's real video metadata into separate JSON files.</p></div>`;
      $("#videoEmptyState").hidden = true;
      $("#videoResultCount").textContent = "0 video records loaded from this playlist JSON";
      return;
    }
    $("#nativeVideoList").innerHTML = found.map((v) => {
      const thumb = v.thumbnail || (v.videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(v.videoId)}/hqdefault.jpg` : "");
      const date = v.publishedAt ? new Date(v.publishedAt).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
      const duration = v.duration || (getDuration(v) ? `${Math.floor(getDuration(v)/60)}:${String(getDuration(v)%60).padStart(2,"0")}` : "");
      const videoId = String(v.videoId || v.id || "");
      return `<article class="native-video-card ${currentIndex>=0 && (videos[currentIndex].videoId||videos[currentIndex].id)===videoId ? "active":""}" data-video-id="${esc(videoId)}">
        <button class="native-thumb" data-play-id="${esc(videoId)}" aria-label="Play ${esc(v.title)}">${thumb ? `<img src="${esc(thumb)}" alt="${esc(v.title)}" loading="lazy">` : `<span class="thumb-placeholder">AWS</span>`}<span class="play-overlay">▶</span>${duration?`<span class="duration-badge">${esc(duration)}</span>`:""}</button>
        <div class="native-video-info"><button class="native-video-title" data-play-id="${esc(videoId)}">${esc(v.title)}</button><p>${esc(v.description || "Watch this lesson from the AWS with Jaymit playlist.")}</p><div class="native-video-meta"><span>${date ? esc(date) : `Video ${Number(v.position||0)||"—"}`}</span>${v.level?`<span>${esc(v.level)}</span>`:""}</div><div class="native-video-actions"><button class="text-link" data-play-id="${esc(videoId)}">▶ Play here</button><a class="text-link" href="${esc(v.youtubeUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId||"")}`)}" target="_blank" rel="noopener">YouTube ↗</a></div></div>
      </article>`;
    }).join("");
    document.querySelectorAll("[data-play-id]").forEach(button => button.addEventListener("click", () => selectVideo(button.dataset.playId)));
  }
  function renderSidebar(p) {
    $("#playlistSidebar").innerHTML = `<div class="sidebar-card"><h2>What you'll learn</h2><div class="topic-list">${(p.topics||[]).map((topic,i)=>`<div><span>${String(i+1).padStart(2,"00")}</span>${esc(topic)}</div>`).join("")}</div></div><div class="sidebar-card"><h2>Playlist tools</h2><p>Search the complete local JSON video list, change sort order, and play any listed video without leaving this page.</p><p><b>${videos.length}</b> video records loaded</p></div><a class="btn secondary full-btn" href="${esc(p.youtubeUrl)}" target="_blank" rel="noopener">Open original YouTube playlist ↗</a><p class="fine-print">The site uses local JSON files only. No database and no runtime API calls are required.</p>`;
  }
  async function init() {
    const id = new URLSearchParams(location.search).get("id");
    try {
      const response = await fetch("data/playlists.json");
      if (!response.ok) throw new Error("Playlist index could not be loaded");
      const playlists = await response.json();
      playlist = playlists.find(item => item.id === id);
      if (!playlist) { $("#playlistHeader").innerHTML='<h1>Playlist not found</h1><p class="lead">Choose a playlist from the directory.</p><a class="btn primary" href="playlists.html">Browse playlists →</a>'; $("#singleVideoPlayer").innerHTML=""; return; }
      document.title = `${playlist.title} | AWS with Jaymit`;
      // Update meta description dynamically
      const _metaDesc = document.querySelector('meta[name="description"]');
      if (_metaDesc) _metaDesc.setAttribute('content', `${playlist.description} Watch and search all videos in the ${playlist.title} playlist on AWS with Jaymit.`);
      // Update canonical
      const _canonical = document.querySelector('link[rel="canonical"]');
      if (_canonical) _canonical.setAttribute('href', `https://awswithjaymit.com/playlist.html?id=${encodeURIComponent(playlist.id)}`);
      // Update OG tags
      [['og:title',`${playlist.title} | AWS with Jaymit`],['og:description',`${playlist.description} Watch and search all videos in the ${playlist.title} playlist on AWS with Jaymit.`],['og:url',`https://awswithjaymit.com/playlist.html?id=${encodeURIComponent(playlist.id)}`]].forEach(([prop,val])=>{ const t=document.querySelector(`meta[property="${prop}"]`); if(t) t.setAttribute('content',val); });
      // Update Twitter tags
      [['twitter:title',`${playlist.title} | AWS with Jaymit`],['twitter:description',`${playlist.description} Watch and search all videos in the ${playlist.title} playlist on AWS with Jaymit.`]].forEach(([name,val])=>{ const t=document.querySelector(`meta[name="${name}"]`); if(t) t.setAttribute('content',val); });
      $("#crumbTitle").textContent = playlist.title;
      $("#playlistHeader").innerHTML = `<div class="playlist-detail-heading"><div><span class="eyebrow">${esc(playlist.icon)} ${esc(playlist.category)} · ${esc(playlist.level)}</span><h1>${esc(playlist.title)}</h1><p class="lead">${esc(playlist.description)}</p><div class="playlist-header-actions"><a class="btn primary" href="${esc(playlist.youtubeUrl)}" target="_blank" rel="noopener">Open full playlist on YouTube ↗</a><a class="btn secondary" href="playlists.html">← All playlists</a></div></div><div class="sequence-card"><span>▤</span><b>JSON-powered video list</b><small>Each playlist has its own editable data file.</small></div></div>`;
      const dataResponse = await fetch(playlist.dataFile);
      if (!dataResponse.ok) throw new Error(`Could not load ${playlist.dataFile}`);
      const data = await dataResponse.json();
      videos = Array.isArray(data.videos) ? data.videos : [];
      renderSidebar(playlist); renderVideos();
      if (videos.length) selectVideo((videos[0].videoId || videos[0].id));
      else { $("#nowPlayingTitle").textContent="Playlist preview"; $("#singleVideoPlayer").innerHTML=`<iframe title="${esc(playlist.title)} YouTube playlist" src="https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlist.youtubePlaylistId)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="eager"></iframe>`; $("#playPosition").textContent="Native video list not synced yet"; }
    } catch (error) {
      $("#playlistHeader").innerHTML = `<h1>Unable to load playlist</h1><p class="lead">${esc(error.message)}. Run the website through a local web server so JSON files can be loaded.</p>`;
      $("#nativeVideoList").innerHTML=""; console.error(error);
    }
    $("#videoSearch")?.addEventListener("input", renderVideos);
    $("#videoSort")?.addEventListener("change", renderVideos);
    $("#clearVideoSearch")?.addEventListener("click",()=>{$("#videoSearch").value="";renderVideos();$("#videoSearch").focus();});
    $("#previousVideo")?.addEventListener("click",()=>{if(currentIndex>0)selectVideo(videos[currentIndex-1].videoId||videos[currentIndex-1].id);});
    $("#nextVideo")?.addEventListener("click",()=>{if(currentIndex<videos.length-1)selectVideo(videos[currentIndex+1].videoId||videos[currentIndex+1].id);});
    $("#menuBtn")?.addEventListener("click",()=>$("#navLinks").classList.toggle("open"));
  }
  document.addEventListener("DOMContentLoaded",init);
})();
