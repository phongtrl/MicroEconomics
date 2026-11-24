const audio = document.querySelector("#audio");
const title = document.querySelector("#chapter-title");
const statusLine = document.querySelector("#status");
const transcript = document.querySelector("#script");
const chapterDownload = document.querySelector("#chapter-download");
const previous = document.querySelector("#prev");
const next = document.querySelector("#next");
const rate = document.querySelector("#rate");
const theme = document.querySelector("#theme");
const library = document.querySelector("#chapters");
const storageKey = "microeconomics-audiobook";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

const saved = loadProgress();
let index = 0;

function saveProgress() {
  if (audio.readyState < HTMLMediaElement.HAVE_METADATA) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      index,
      position: audio.currentTime,
      rate: rate.value,
      light: theme.getAttribute("aria-pressed") === "true",
    }));
  } catch {
    // Playback also works when the browser blocks local storage.
  }
}

const chapterButtons = chapters.map((chapter, chapterIndex) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${chapterIndex + 1}. ${chapter.title}`;
  button.addEventListener("click", () => selectChapter(chapterIndex));
  return button;
});
library.replaceChildren(...chapterButtons);

function selectChapter(chapterIndex, { position = 0, autoplay = false } = {}) {
  if (!chapters[chapterIndex]) return;

  audio.pause();
  index = chapterIndex;
  const chapter = chapters[index];
  const number = String(index + 1).padStart(2, "0");
  const source = `audio/${number}.mp3`;

  title.textContent = `${index + 1}. ${chapter.title}`;
  statusLine.textContent = "";
  transcript.replaceChildren(...chapter.text.split("\n\n").map((paragraph) => {
    const element = document.createElement("p");
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
    if (Number.isFinite(position) && position > 0 && position < audio.duration) {
      audio.currentTime = position;
    }
    saveProgress();
  };
  audio.src = source;
  audio.playbackRate = Number(rate.value);
  if (autoplay) {
    audio.play().catch((error) => {
      if (error.name === "NotAllowedError") {
        statusLine.textContent = "Trykk på spill av for å fortsette.";
      }
    });
  }
}

function setTheme(light) {
  document.body.classList.toggle("light", light);
  theme.setAttribute("aria-pressed", String(light));
}

previous.addEventListener("click", () => selectChapter(index - 1));
next.addEventListener("click", () => selectChapter(index + 1));
rate.addEventListener("change", () => {
  audio.playbackRate = Number(rate.value);
  saveProgress();
});
theme.addEventListener("click", () => {
  setTheme(theme.getAttribute("aria-pressed") !== "true");
  saveProgress();
});
for (const event of ["timeupdate", "pause", "seeked"]) {
  audio.addEventListener(event, saveProgress);
}
audio.addEventListener("playing", () => { statusLine.textContent = ""; });
audio.addEventListener("error", () => {
  statusLine.textContent = "Kunne ikke åpne lydsporet. Prøv nedlastingslenken for kapitlet.";
});
audio.addEventListener("ended", () => {
  if (index + 1 < chapters.length) {
    selectChapter(index + 1, { autoplay: true });
  } else {
    statusLine.textContent = "Du har fullført lydboken.";
  }
});

if (Array.from(rate.options).some((option) => option.value === saved.rate)) {
  rate.value = saved.rate;
}
setTheme(saved.light === true);
const startIndex = Number.isInteger(saved.index) && chapters[saved.index] ? saved.index : 0;
selectChapter(startIndex, { position: saved.position });
