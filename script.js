(function () {
  const config = window.ALBUM_CONFIG;

  if (!config || !Array.isArray(config.pages)) {
    throw new Error("ALBUM_CONFIG.pages nao foi encontrado.");
  }

  const mobileQuery = window.matchMedia("(max-width: 760px)");
  let youtubeApiPromise = null;

  const state = {
    index: 0,
    orientation: mobileQuery.matches ? "portrait" : "landscape",
    isFlipping: false,
    soundStarted: false,
    muted: false,
    audioElement: null,
    ambient: null,
    youtubePlayer: null,
    pageFlip: null
  };

  const els = {
    coverScreen: document.getElementById("coverScreen"),
    albumExperience: document.getElementById("albumExperience"),
    coverImage: document.getElementById("coverImage"),
    coverKicker: document.getElementById("coverKicker"),
    coverTitle: document.getElementById("coverTitle"),
    coverNames: document.getElementById("coverNames"),
    coverDate: document.getElementById("coverDate"),
    startButton: document.getElementById("startButton"),
    albumTitle: document.getElementById("albumTitle"),
    pageCounter: document.getElementById("pageCounter"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    soundButton: document.getElementById("soundButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    shareButton: document.getElementById("shareButton"),
    book: document.getElementById("book"),
    progressDots: document.getElementById("progressDots")
  };

  function init() {
    applyCover();
    bindEvents();
    syncPage(0);
  }

  function applyCover() {
    document.title = config.cover.title;
    els.coverImage.src = config.cover.image;
    els.coverKicker.textContent = config.cover.kicker;
    els.coverTitle.textContent = config.cover.title;
    els.coverNames.textContent = config.cover.names;
    els.coverDate.textContent = config.cover.date;
    els.startButton.textContent = config.cover.buttonLabel;
    els.albumTitle.textContent = config.cover.title;
    document.documentElement.style.setProperty("--blush", config.theme.accent);
    document.documentElement.style.setProperty("--teal", config.theme.deep);
    document.documentElement.style.setProperty("--gold", config.theme.gold);
  }

  function bindEvents() {
    els.startButton.addEventListener("click", startAlbum);
    els.prevButton.addEventListener("click", () => turn(-1));
    els.nextButton.addEventListener("click", () => turn(1));
    els.soundButton.addEventListener("click", toggleSound);
    els.fullscreenButton.addEventListener("click", toggleFullscreen);
    els.shareButton.addEventListener("click", shareAlbum);

    mobileQuery.addEventListener("change", () => {
      window.setTimeout(() => {
        state.pageFlip?.update();
        syncPage(currentPageIndex());
      }, 80);
    });

    document.addEventListener("keydown", (event) => {
      if (els.albumExperience.hidden) return;
      if (event.key === "ArrowRight") turn(1);
      if (event.key === "ArrowLeft") turn(-1);
      if (event.key.toLowerCase() === "m") toggleSound();
    });
  }

  function startAlbum() {
    els.coverScreen.hidden = true;
    els.albumExperience.hidden = false;

    window.requestAnimationFrame(() => {
      initBook();
      els.nextButton.focus({ preventScroll: true });
    });

    startSound().catch(() => {
      state.muted = true;
      updateSoundButton();
    });
  }

  function initBook() {
    if (state.pageFlip) {
      state.pageFlip.update();
      syncPage(currentPageIndex());
      return;
    }

    if (!window.St?.PageFlip) {
      throw new Error("StPageFlip nao foi carregado.");
    }

    const pages = config.pages.map((page, index) => buildPage(page, index));

    state.pageFlip = new window.St.PageFlip(els.book, {
      width: 540,
      height: 730,
      size: "stretch",
      minWidth: 280,
      maxWidth: 540,
      minHeight: 390,
      maxHeight: 730,
      drawShadow: true,
      flippingTime: 1050,
      usePortrait: true,
      startZIndex: 20,
      autoSize: false,
      maxShadowOpacity: 0.82,
      showCover: false,
      mobileScrollSupport: true,
      swipeDistance: 30,
      clickEventForward: true,
      useMouseEvents: true,
      showPageCorners: true,
      disableFlipByClick: false
    });

    state.pageFlip.on("init", (event) => {
      state.orientation = event.data.mode;
      syncPage(event.data.page);
    });

    state.pageFlip.on("flip", (event) => {
      syncPage(event.data);
    });

    state.pageFlip.on("changeOrientation", (event) => {
      state.orientation = event.data;
      syncPage(currentPageIndex());
    });

    state.pageFlip.on("changeState", (event) => {
      state.isFlipping = event.data !== "read" && event.data !== "fold_corner";
      setControlsDisabled(state.isFlipping);
    });

    state.pageFlip.loadFromHTML(pages);
  }

  function currentPageIndex() {
    return state.pageFlip?.getCurrentPageIndex?.() ?? state.index;
  }

  function pageCount() {
    return config.pages.length;
  }

  function pagesPerView() {
    return state.orientation === "portrait" ? 1 : 2;
  }

  function lastReadableStart() {
    const count = pageCount();
    if (pagesPerView() === 1) return Math.max(0, count - 1);
    return Math.max(0, count % 2 === 0 ? count - 2 : count - 1);
  }

  function normalizeIndex(index) {
    const numeric = Number.isFinite(Number(index)) ? Number(index) : 0;
    return Math.min(Math.max(numeric, 0), lastReadableStart());
  }

  function turn(direction) {
    if (!state.pageFlip || state.isFlipping) return;

    const current = normalizeIndex(currentPageIndex());
    if (direction > 0 && current >= lastReadableStart()) return;
    if (direction < 0 && current <= 0) return;

    state.isFlipping = true;
    setControlsDisabled(true);

    if (direction > 0) {
      state.pageFlip.flipNext("bottom");
    } else {
      state.pageFlip.flipPrev("bottom");
    }
  }

  function syncPage(index) {
    state.index = normalizeIndex(index);
    els.book.classList.toggle("is-portrait", state.orientation === "portrait");
    updatePageStatus(state.index);
    renderDotsForIndex(state.index);
    setControlsDisabled(state.isFlipping);
  }

  function updatePageStatus(index) {
    const count = pageCount();
    const visibleStart = index + 1;
    const visibleEnd = Math.min(index + pagesPerView(), count);
    els.pageCounter.textContent = visibleStart === visibleEnd
      ? `${visibleStart}/${count}`
      : `${visibleStart}-${visibleEnd}/${count}`;
  }

  function setControlsDisabled(disabled) {
    const atStart = state.index <= 0;
    const atEnd = state.index >= lastReadableStart();
    els.prevButton.disabled = disabled || atStart;
    els.nextButton.disabled = disabled || atEnd;
  }

  function renderDotsForIndex(index) {
    const perView = pagesPerView();
    const groupCount = perView === 1 ? pageCount() : Math.ceil(pageCount() / 2);
    const active = perView === 1 ? index : Math.floor(index / 2);
    els.progressDots.replaceChildren();

    for (let dotIndex = 0; dotIndex < groupCount; dotIndex += 1) {
      const dot = document.createElement("span");
      if (dotIndex === active) dot.classList.add("is-active");
      els.progressDots.append(dot);
    }
  }

  function buildPage(page, index) {
    const article = document.createElement("article");
    article.className = `book-page book-page-${page.type}`;
    article.dataset.pageIndex = String(index);
    article.style.setProperty("--page-accent", page.accent || config.theme.accent);

    const inner = document.createElement("div");
    inner.className = "page-inner";
    article.append(inner);

    addText(inner, "p", "kicker", page.kicker);

    if (page.type === "quote") {
      addText(inner, "blockquote", "quote-text", page.quote);
      addText(inner, "p", "", page.body);
      return article;
    }

    if (page.type === "photo" || page.type === "photoFinal") {
      addText(inner, "h2", "", page.title);
      inner.append(mediaFrame(page));
      addText(inner, "p", "paired-note", pairedArtBody(index));
      addText(inner, "p", "photo-caption", page.caption);
      addText(inner, "p", "signature", page.signature);
      if (page.type === "photoFinal") {
        inner.append(restartButton());
      }
      return article;
    }

    if (page.type === "art") {
      addText(inner, "h2", "", page.title);
      inner.append(artImage(page.image, page.title));
      if (page.secret) addSecret(inner, page.secret);
      return article;
    }

    if (page.type === "timeline") {
      addText(inner, "h2", "", page.title);
      const list = document.createElement("ol");
      list.className = "timeline-list";
      page.items.forEach((item) => {
        const li = document.createElement("li");
        const time = document.createElement("time");
        time.textContent = item.date;
        const text = document.createElement("p");
        text.textContent = item.text;
        li.append(time, text);
        list.append(li);
      });
      inner.append(list);
      return article;
    }

    if (page.type === "collage") {
      addText(inner, "h2", "", page.title);
      const grid = document.createElement("div");
      grid.className = "collage-grid";
      page.images.forEach((source, imageIndex) => {
        const figure = document.createElement("figure");
        const img = document.createElement("img");
        img.src = source;
        img.alt = `${page.title} ${imageIndex + 1}`;
        figure.append(img);
        grid.append(figure);
      });
      inner.append(grid);
      addText(inner, "p", "collage-caption", page.caption);
      return article;
    }

    addText(inner, "h2", "", page.title);
    addText(inner, "p", "", page.body);
    addText(inner, "p", "signature", page.signature);
    addText(inner, "p", "final-date", page.date);

    if (page.type === "final") {
      inner.append(restartButton());
    }

    return article;
  }

  function pairedArtBody(index) {
    const previous = config.pages[index - 1];
    return previous?.type === "art" ? previous.body : "";
  }

  function restartButton() {
    const button = document.createElement("button");
    button.className = "restart-button";
    button.type = "button";
    button.textContent = "Rever desde o começo";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.pageFlip?.turnToPage(0);
      syncPage(0);
    });
    return button;
  }

  function addText(parent, tag, className, text) {
    if (!text) return null;
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function mediaFrame(page) {
    const frame = document.createElement("figure");
    frame.className = "media-frame";
    frame.dataset.fit = page.fit || "contain";
    const backdrop = document.createElement("span");
    backdrop.className = "media-backdrop";
    setMediaBackdrop(backdrop, page.image, page.position);
    const image = document.createElement("img");
    image.src = page.image;
    image.alt = page.title;
    image.style.objectPosition = page.position || "center center";
    image.onerror = () => {
      image.onerror = null;
      setMediaBackdrop(backdrop, "assets/photos/photo-placeholder.svg", "center center");
      image.src = "assets/photos/photo-placeholder.svg";
    };
    frame.append(backdrop, image);
    return frame;
  }

  function setMediaBackdrop(element, source, position = "center center") {
    element.style.backgroundImage = `url(${JSON.stringify(source)})`;
    element.style.backgroundPosition = position || "center center";
  }

  function artImage(source, alt) {
    const wrapper = document.createElement("div");
    wrapper.className = "art-image";
    const image = document.createElement("img");
    image.src = source;
    image.alt = alt;
    wrapper.append(image);
    return wrapper;
  }

  function addSecret(parent, text) {
    const button = document.createElement("button");
    button.className = "secret-button";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.textContent = "\u2665";

    const message = document.createElement("p");
    message.className = "secret-message";
    message.textContent = text;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const visible = message.classList.toggle("is-visible");
      button.setAttribute("aria-expanded", String(visible));
    });

    parent.append(button, message);
  }

  async function startSound() {
    if (state.soundStarted) return;
    state.soundStarted = true;

    const audioSource = resolveAudioSource();

    if (audioSource) {
      await startAudioElement(audioSource);
    } else if (config.audio.youtubeId) {
      state.youtubePlayer = createYouTubeSound(config.audio.youtubeId, config.audio.youtubeUrl);
      const youtubeStarted = await state.youtubePlayer.start().catch(() => false);
      if (!youtubeStarted && config.audio.youtubeFallbackGenerated !== false) {
        await startGeneratedSound();
      }
    }

    state.muted = false;
    updateSoundButton();
  }

  async function startAudioElement(source) {
    state.audioElement = new Audio(source);
    state.audioElement.loop = true;
    state.audioElement.volume = config.audio.volume;

    try {
      await state.audioElement.play();
    } catch (error) {
      if (config.audio.youtubeFallbackGenerated !== false) {
        await startGeneratedSound();
        return;
      }

      throw error;
    }
  }

  async function startGeneratedSound() {
    state.ambient = createAmbientSound(config.audio.volume);
    await state.ambient.start();
  }

  function resolveAudioSource() {
    if (config.audio.src) return config.audio.src;
    if (config.audio.dataUri) return config.audio.dataUri;
    if (!config.audio.base64) return "";

    const mimeType = config.audio.mimeType || "audio/mpeg";
    const cleanBase64 = config.audio.base64.replace(/\s/g, "");
    return `data:${mimeType};base64,${cleanBase64}`;
  }

  async function toggleSound() {
    if (!state.soundStarted) {
      await startSound();
      return;
    }

    state.muted = !state.muted;

    if (state.audioElement) {
      state.audioElement.muted = state.muted;
    }

    if (state.ambient) {
      state.ambient.setMuted(state.muted);
    }

    if (state.youtubePlayer) {
      state.youtubePlayer.setMuted(state.muted);
    }

    updateSoundButton();
  }

  function updateSoundButton() {
    els.soundButton.classList.toggle("is-muted", state.muted);
    els.soundButton.setAttribute("aria-pressed", String(!state.muted));
    els.soundButton.setAttribute("aria-label", state.muted ? "Ativar música" : "Pausar música");
  }

  function createAmbientSound(volume) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const master = context.createGain();
    const oscillators = [];
    const notes = [196, 246.94, 293.66, 392, 493.88];
    master.gain.value = 0;
    master.connect(context.destination);

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.05 + index * 0.006;
      oscillator.connect(gain).connect(master);
      oscillators.push(oscillator);
    });

    return {
      async start() {
        if (context.state === "suspended") await context.resume();
        oscillators.forEach((oscillator) => oscillator.start());
        master.gain.setTargetAtTime(volume, context.currentTime, 0.8);
      },
      setMuted(muted) {
        master.gain.setTargetAtTime(muted ? 0 : volume, context.currentTime, 0.25);
      }
    };
  }

  function createYouTubeSound(videoId, url) {
    let player = null;
    let playing = false;

    return {
      async start() {
        const YT = await loadYouTubeIframeApi();
        const wrapper = document.createElement("div");
        const host = document.createElement("div");
        wrapper.className = "youtube-audio";
        wrapper.dataset.fallbackUrl = url || `https://youtu.be/${videoId}`;
        document.body.append(wrapper);
        wrapper.append(host);

        return new Promise((resolve) => {
          let settled = false;
          const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
          };

          const timeout = window.setTimeout(() => finish(false), 4200);

          player = new YT.Player(host, {
            width: 200,
            height: 112,
            videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              loop: 1,
              modestbranding: 1,
              playsinline: 1,
              playlist: videoId,
              rel: 0,
              origin: window.location.origin
            },
            events: {
              onReady(event) {
                event.target.setVolume(100);
                event.target.playVideo();
              },
              onStateChange(event) {
                if (event.data === YT.PlayerState.PLAYING) {
                  playing = true;
                  window.clearTimeout(timeout);
                  finish(true);
                }
              },
              onError() {
                window.clearTimeout(timeout);
                finish(false);
              }
            }
          });
        });
      },
      setMuted(muted) {
        if (!player) return;
        if (muted) {
          player.pauseVideo();
          return;
        }

        player.playVideo();
      },
      isPlaying() {
        return playing;
      }
    };
  }

  function loadYouTubeIframeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => reject(new Error("YouTube API timeout")), 5000);

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        window.clearTimeout(timeout);
        resolve(window.YT);
      };

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("YouTube API failed"));
      };
      document.head.append(script);
    });

    return youtubeApiPromise;
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }

  async function shareAlbum() {
    const shareData = {
      title: config.cover.title,
      text: `${config.cover.title} - ${config.cover.names}`,
      url: window.location.href
    };

    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
      return;
    }

    await navigator.clipboard?.writeText(window.location.href).catch(() => {});
  }

  init();
}());
