const audio = document.querySelector("#audio");
const title = document.querySelector("#chapter-title");
const chapterNumber = document.querySelector("#chapter-number");
const statusLine = document.querySelector("#status");
const captionPanel = document.querySelector("#caption-panel");
const captionContext = document.querySelector("#caption-context");
const captions = document.querySelector("#captions");
const captionToggle = document.querySelector("#caption-toggle");
const transcript = document.querySelector("#script");
const chapterDownload = document.querySelector("#chapter-download");
const previous = document.querySelector("#prev");
const next = document.querySelector("#next");
const playPause = document.querySelector("#play-pause");
const seek = document.querySelector("#seek");
const elapsed = document.querySelector("#elapsed");
const duration = document.querySelector("#duration");
const rate = document.querySelector("#rate");
const theme = document.querySelector("#theme");
const library = document.querySelector("#chapters");
const storageKey = "microeconomics-audiobook";
const audioVersion = "56d9fa4";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

const saved = loadProgress();
let index = 0;
let showCaptions = saved.showCaptions !== false;
let captionsMatchAudio = false;
let captionFrame = 0;

function saveProgress() {
  if (audio.readyState < HTMLMediaElement.HAVE_METADATA) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      index,
      position: audio.currentTime,
      firstChapterEdition: 2,
      rate: rate.value,
      light: theme.getAttribute("aria-pressed") === "true",
      showCaptions,
    }));
  } catch {
    // Playback also works when the browser blocks local storage.
  }
}

function formatTime(seconds) {
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function captionIndexAt(cues, position) {
  let low = 0;
  let high = cues.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (cues[middle][0] <= position) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}

function updateCaptions() {
  let text = "";
  let previousText = "";
  let highlight = false;
  if (showCaptions && audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    if (captionsMatchAudio) {
      const cues = chapterCaptions[index].cues;
      const cueIndex = captionIndexAt(cues, audio.currentTime);
      text = cues[cueIndex]?.[2] ?? "";
      previousText = cues[cueIndex - 1]?.[2] ?? "";
      highlight = cueIndex >= 0;
    } else {
      text = "Lydsporet og undertekstene er fra ulike versjoner. Last inn siden på nytt.";
    }
  }
  if (captionContext.textContent !== previousText) captionContext.textContent = previousText;
  if (captions.textContent !== text) {
    captions.textContent = text;
    captions.classList.toggle("is-current", highlight);
  }
}

function tickCaptions() {
  updateCaptions();
  captionFrame = showCaptions && captionsMatchAudio && !audio.paused && !audio.ended
    ? requestAnimationFrame(tickCaptions)
    : 0;
}

function syncCaptions() {
  cancelAnimationFrame(captionFrame);
  tickCaptions();
}

function setCaptions(visible) {
  showCaptions = visible;
  captionToggle.setAttribute("aria-pressed", String(visible));
  captionPanel.hidden = !visible;
  syncCaptions();
}

function updateTimeline() {
  const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
  const position = hasDuration ? audio.currentTime : 0;
  seek.disabled = !hasDuration;
  seek.max = hasDuration ? audio.duration : 0;
  seek.value = position;
  elapsed.textContent = formatTime(position);
  duration.textContent = formatTime(hasDuration ? Math.round(audio.duration) : 0);
  seek.setAttribute("aria-valuetext", `${elapsed.textContent} av ${duration.textContent}`);
}

function updatePlayButton() {
  const playing = !audio.paused && !audio.ended;
  const label = playing ? "Pause" : "Spill av";
  playPause.classList.toggle("is-playing", playing);
  playPause.setAttribute("aria-label", label);
  playPause.title = label;
}

function play() {
  const source = audio.src;
  audio.play().catch((error) => {
    if (source === audio.src && error.name !== "AbortError" && !audio.error) {
      statusLine.textContent = "Trykk på spill av for å fortsette.";
    }
  });
}

const chapterButtons = chapters.map((chapter, chapterIndex) => {
  const item = document.createElement("li");
  const button = document.createElement("button");
  const number = document.createElement("span");
  const info = document.createElement("span");
  const name = document.createElement("span");
  const edition = document.createElement("small");
  const length = document.createElement("span");
  button.className = "track";
  button.type = "button";
  number.className = "track-number";
  number.textContent = String(chapterIndex + 1).padStart(2, "0");
  number.setAttribute("aria-hidden", "true");
  name.className = "track-title";
  name.textContent = chapter.title;
  edition.className = "track-edition";
  edition.textContent = chapterIndex === 0 ? "Fullt kapittel" : "Kort introduksjon";
  length.className = "track-duration";
  length.textContent = formatTime(Math.round(chapterCaptions[chapterIndex].duration));
  info.append(name, document.createElement("br"), edition);
  button.append(number, info, length);
  button.addEventListener("click", () => {
    if (index === chapterIndex) {
      if (audio.paused || audio.ended) play();
      else audio.pause();
      return;
    }
    selectChapter(chapterIndex, { autoplay: true });
  });
  item.append(button);
  library.append(item);
  return button;
});

function selectChapter(chapterIndex, { position = 0, autoplay = false } = {}) {
  if (!chapters[chapterIndex]) return;

  audio.pause();
  index = chapterIndex;
  const chapter = chapters[index];
  const number = String(index + 1).padStart(2, "0");
  const path = `audio/${number}.mp3`;
  const source = location.protocol === "file:" ? path : `${path}?v=${audioVersion}`;

  captionsMatchAudio = false;
  title.textContent = chapter.title;
  title.title = chapter.title;
  chapterNumber.textContent = `Kapittel ${index + 1} av ${chapters.length}`;
  statusLine.textContent = "";
  transcript.replaceChildren(...chapter.text.split("\n\n").map((paragraph) => {
    const isHeading = chapterIndex === 0 && /^(?:Prolog\.|Del \p{L}+\.)/u.test(paragraph);
    const element = document.createElement(isHeading ? "h3" : "p");
    element.textContent = paragraph;
    return element;
  }));
  chapterDownload.href = source;
  chapterDownload.download = `Mikroøkonomi - ${number} - ${chapter.title}.mp3`;
  for (const [buttonIndex, button] of chapterButtons.entries()) {
    button.setAttribute("aria-current", String(buttonIndex === index));
  }
  previous.disabled = index === 0;
  next.disabled = index === chapters.length - 1;

  audio.onloadedmetadata = () => {
    captionsMatchAudio = Math.abs(audio.duration - chapterCaptions[index].duration) < 0.5;
    if (Number.isFinite(position) && position > 0 && position < audio.duration) {
      audio.currentTime = position;
    }
    syncCaptions();
    updateTimeline();
    saveProgress();
  };
  audio.src = source;
  audio.playbackRate = Number(rate.value);
  syncCaptions();
  updateTimeline();
  updatePlayButton();
  if (autoplay) play();
}

function setTheme(light) {
  document.body.classList.toggle("light", light);
  theme.setAttribute("aria-pressed", String(light));
}

playPause.addEventListener("click", () => {
  if (audio.paused || audio.ended) play();
  else audio.pause();
});
previous.addEventListener("click", () => selectChapter(index - 1, { autoplay: !audio.paused }));
next.addEventListener("click", () => selectChapter(index + 1, { autoplay: !audio.paused }));
seek.addEventListener("input", () => {
  if (!seek.disabled) audio.currentTime = Number(seek.value);
});
rate.addEventListener("change", () => {
  audio.playbackRate = Number(rate.value);
  saveProgress();
});
theme.addEventListener("click", () => {
  setTheme(theme.getAttribute("aria-pressed") !== "true");
  saveProgress();
});
captionToggle.addEventListener("click", () => {
  setCaptions(!showCaptions);
  saveProgress();
});
for (const event of ["timeupdate", "seeking", "seeked"]) {
  audio.addEventListener(event, () => {
    updateTimeline();
    updateCaptions();
    saveProgress();
  });
}
audio.addEventListener("play", () => {
  updatePlayButton();
  syncCaptions();
});
audio.addEventListener("pause", () => {
  updatePlayButton();
  syncCaptions();
  saveProgress();
});
audio.addEventListener("playing", () => { statusLine.textContent = ""; });
audio.addEventListener("error", () => {
  captionsMatchAudio = false;
  syncCaptions();
  updateTimeline();
  updatePlayButton();
  statusLine.textContent = "Kunne ikke åpne lydsporet. Prøv nedlastingslenken for kapitlet.";
});
audio.addEventListener("ended", () => {
  syncCaptions();
  updatePlayButton();
  if (index + 1 < chapters.length) {
    selectChapter(index + 1, { autoplay: true });
  } else {
    statusLine.textContent = "Du har lyttet til alle tilgjengelige spor.";
  }
});

if (Array.from(rate.options).some((option) => option.value === saved.rate)) {
  rate.value = saved.rate;
}
setTheme(saved.light === true);
setCaptions(showCaptions);
const startIndex = Number.isInteger(saved.index) && chapters[saved.index] ? saved.index : 0;
const position = startIndex === 0 && saved.firstChapterEdition !== 2 ? 0 : saved.position;
selectChapter(startIndex, { position });
