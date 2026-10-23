// Mercurio front end: thermometer, chat, and an offline mode for when no API key is set.

const MIN_C = -30;
const MAX_C = 60;

const ZONES = [
  {
    id: "frozen", max: -5, name: "Frozen solid",
    mood: "Eight words or fewer. Cannot feel bulb.",
    typing: "Thawing a reply…",
    arrive: "Brrr. Entering power-saving mode. Speak briefly.",
    offline: [
      "No.", "Too cold for that.", "Bulb numb. Ask later.", "Request received. Ignored.",
      "Answer frozen. Thaw required.",
    ],
  },
  {
    id: "chilly", max: 12, name: "Chilly",
    mood: "Sarcastic. Mildly offended you asked.",
    typing: "Sighing…",
    arrive: "Ah, a draught. How lovely. I'll get my scarf.",
    offline: [
      "Fascinating question. I've been waiting all day for exactly that. *sigh*",
      "I would answer, but I'm offline and you haven't tipped.",
      "Certainly. Right after I finish ignoring three other customers.",
      "Mm. Have you considered asking someone who cares? Like a radiator.",
    ],
  },
  {
    id: "mild", max: 26, name: "Room temperature",
    mood: "Perfectly calibrated and smug about it.",
    typing: "Calibrating…",
    arrive: "Ahh, perfect. Twenty-ish degrees. This is my natural habitat.",
    offline: [
      "Lovely question! Sadly my brain is unplugged right now, but I'm still perfectly calibrated.",
      "I'm in offline mode, which is like being on holiday at exactly 21 °C. Bliss.",
      "I'd give you a great answer if someone added my API key. Until then: I believe in you.",
    ],
  },
  {
    id: "hot", max: 40, name: "Sweaty",
    mood: "Too much coffee. Everything is HUGE.",
    typing: "WARMING UP…",
    arrive: "OH IT'S GETTING TOASTY! LET'S GOOOO! 🔥",
    offline: [
      "WHAT A QUESTION!!! The crowd is ON ITS FEET! (I'm offline, but the ENERGY is real!) ⚽🔥",
      "UNBELIEVABLE! I can't answer, but HAVE YOU SEEN HOW RED MY MERCURY IS?! 🌡️",
      "Ladies and gentlemen, history is being made — ok I'm offline, BUT STILL! 🎉",
    ],
  },
  {
    id: "meltdown", max: Infinity, name: "Meltdown",
    mood: "Boiling. Questioning reality. Suspicious of pigeons.",
    typing: "Boiling over…",
    arrive: "OH NO. I'M EXPANDING. THIS IS WHAT THERMOMETERS FEAR.",
    offline: [
      "MAMMA MIA. The glass is singing. The pigeons know. They have ALWAYS known. 🐦",
      "I am vapour now. I am the cloud. Your question rains upon me like… like… soup?",
      "Who put the sun in my bulb?? Madonna! Ask me again when I stop evaporating!",
      "Every answer is a degree. Every degree is a scream. Also: watch the pigeons.",
    ],
  },
];

const el = (id) => document.getElementById(id);
const thermo = el("thermo");
const log = el("log");
const input = el("input");
const sendBtn = el("send");
const empty = el("empty");

let celsius = 20;
let currentZone = zoneFor(celsius);
let messages = [];          // conversation sent to the server
let busy = false;
let zoneTimer = null;
let offlineNoticeShown = false;

function zoneFor(c) { return ZONES.find((z) => c <= z.max); }
function fraction(c) { return (c - MIN_C) / (MAX_C - MIN_C); }
// Keep a sliver of mercury above the bulb even at the bottom of the scale.
function level(c) { return 6 + 94 * fraction(c); }

// ---------- Thermometer ----------

function buildTicks() {
  const ticks = el("ticks");
  for (let v = -20; v <= 60; v += 20) {
    const li = document.createElement("li");
    li.textContent = v + "°";
    li.style.setProperty("--at", level(v) + "%");
    ticks.appendChild(li);
  }
}

function setTemperature(c, { announce = true } = {}) {
  c = Math.round(Math.min(MAX_C, Math.max(MIN_C, c)));
  if (c === celsius && thermo.dataset.ready) return;
  celsius = c;
  thermo.dataset.ready = "1";

  const zone = zoneFor(c);
  document.body.dataset.zone = zone.id;
  el("mercury").style.setProperty("--level", level(c) + "%");
  el("celsius").textContent = c + "°";
  el("zoneName").textContent = zone.name;
  el("zoneMood").textContent = zone.mood;
  el("chaos").textContent = fraction(c).toFixed(2);
  thermo.setAttribute("aria-valuenow", c);
  thermo.setAttribute("aria-valuetext", `${c} degrees Celsius, ${zone.name.toLowerCase()}`);

  try { localStorage.setItem("mercurio-celsius", String(c)); } catch {}

  // Mercurio comments once you settle in a new zone.
  if (announce && zone.id !== currentZone.id) {
    clearTimeout(zoneTimer);
    zoneTimer = setTimeout(() => {
      const settled = zoneFor(celsius);
      if (settled.id !== currentZone.id) {
        currentZone = settled;
        addAside(settled.arrive);
      }
    }, 700);
  } else if (!announce) {
    currentZone = zone;
  }
}

function celsiusFromPointer(e) {
  const tube = thermo.querySelector(".tube").getBoundingClientRect();
  const horizontal = tube.width > tube.height;
  let f = horizontal
    ? (e.clientX - tube.left) / tube.width
    : (tube.bottom - e.clientY) / tube.height;
  // Undo the 6% sliver used for drawing
  f = (f * 100 - 6) / 94;
  return MIN_C + Math.min(1, Math.max(0, f)) * (MAX_C - MIN_C);
}

thermo.addEventListener("pointerdown", (e) => {
  thermo.setPointerCapture(e.pointerId);
  setTemperature(celsiusFromPointer(e));
  const move = (ev) => setTemperature(celsiusFromPointer(ev));
  const up = () => {
    thermo.removeEventListener("pointermove", move);
    thermo.removeEventListener("pointerup", up);
    thermo.removeEventListener("pointercancel", up);
  };
  thermo.addEventListener("pointermove", move);
  thermo.addEventListener("pointerup", up);
  thermo.addEventListener("pointercancel", up);
});

thermo.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 10 : 1;
  const keys = {
    ArrowUp: celsius + step, ArrowRight: celsius + step,
    ArrowDown: celsius - step, ArrowLeft: celsius - step,
    PageUp: celsius + 10, PageDown: celsius - 10,
    Home: MIN_C, End: MAX_C,
  };
  if (e.key in keys) {
    e.preventDefault();
    setTemperature(keys[e.key]);
  }
});

// ---------- Chat log ----------

function scrollDown() { log.scrollTop = log.scrollHeight; }

function addMessage(role, text, extraClass = "") {
  if (empty) empty.remove();
  const div = document.createElement("div");
  div.className = `msg ${role} ${extraClass}`.trim();
  div.textContent = text;
  if (role === "bot") {
    const stamp = document.createElement("span");
    stamp.className = "stamp";
    stamp.textContent = `at ${celsius}°`;
    div.appendChild(stamp);
  }
  log.appendChild(div);
  scrollDown();
  return div;
}

function addAside(text) {
  if (!log.querySelector(".msg")) return; // stay quiet until the chat has started
  const p = document.createElement("p");
  p.className = "aside";
  p.textContent = "Mercurio: " + text;
  log.appendChild(p);
  scrollDown();
}

function offlineReply(zone) {
  const lines = zone.offline;
  let reply = lines[Math.floor(Math.random() * lines.length)];
  if (!offlineNoticeShown) {
    offlineNoticeShown = true;
    reply += "\n\n(Offline mode: add ANTHROPIC_API_KEY in Vercel to give me a real brain.)";
  }
  return reply;
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  sendBtn.disabled = true;

  addMessage("user", text);
  messages.push({ role: "user", content: text });
  input.value = "";
  autosize();

  const zone = zoneFor(celsius);
  const typing = addMessage("bot", zone.typing, "typing");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, celsius }),
    });
    const data = await res.json().catch(() => ({}));
    typing.remove();

    if (!res.ok) {
      addMessage("bot", data.error || `Something went wrong (status ${res.status}).`, "error");
      messages.pop(); // let the user retry the same message
    } else {
      const reply = data.offline ? offlineReply(zone) : data.reply;
      addMessage("bot", reply);
      messages.push({ role: "assistant", content: reply });
    }
  } catch {
    // No server at all, e.g. index.html opened straight from your computer.
    typing.remove();
    const reply = offlineReply(zone);
    addMessage("bot", reply);
    messages.push({ role: "assistant", content: reply });
  } finally {
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

// ---------- Composer ----------

function autosize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}

el("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  send(input.value);
});

input.addEventListener("input", autosize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send(input.value);
  }
});

document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => send(chip.textContent))
);

// ---------- Start ----------

buildTicks();
let saved = 20;
try {
  const v = Number(localStorage.getItem("mercurio-celsius"));
  if (Number.isFinite(v) && localStorage.getItem("mercurio-celsius") !== null) saved = v;
} catch {}
setTemperature(saved, { announce: false });
