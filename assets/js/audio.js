// ...existing code...
(function () {
  "use strict";

  function start() {
    const widget = document.querySelector("[data-audio-widget]");
    if (!widget) return;

    const playBtn = widget.querySelector("[data-audio-play]");
    const stopBtn = widget.querySelector("[data-audio-stop]");
    const volumeEl = widget.querySelector("[data-audio-volume]");
    const VIDEO_ID = ""; // Barcelona anthem

    let player;

    function initPlayer() {
      if (player || !window.YT || !YT.Player) return;
      player = new YT.Player("yt-audio-player", {
        height: "1",
        width: "1",
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: function () {
            try {
              player.unMute();
              player.setVolume(Number(volumeEl.value) || 25);
            } catch (_) {}
          },
        },
      });
    }

    function onYouTubeIframeAPIReadyLocal() {
      initPlayer();
    }

    // Controls
    playBtn.addEventListener("click", function () {
      if (!player) initPlayer();
      if (player && player.playVideo) {
        player.unMute();
        player.playVideo();
      }
    });

    stopBtn.addEventListener("click", function () {
      if (player && player.stopVideo) {
        player.stopVideo();
      }
    });

    volumeEl.addEventListener("input", function () {
      if (player && player.setVolume) {
        player.setVolume(Number(volumeEl.value));
      }
    });

    // Load YT API
    function attachAPIReady(handler) {
      if (typeof window.onYouTubeIframeAPIReady === "function") {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
          try {
            prev();
          } catch (_) {}
          handler();
        };
      } else {
        window.onYouTubeIframeAPIReady = handler;
      }
    }

    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      attachAPIReady(onYouTubeIframeAPIReadyLocal);
    } else {
      onYouTubeIframeAPIReadyLocal();
    }
  }

  document.addEventListener("cprum:ready", start);
})();
