const state = {
  counter: 0,
  scrollRaf: 0,
  parallaxItems: [],
  audioUnlocked: false,
};

const elements = {
  music: document.getElementById("bgMusic"),
  copyAddressBtn: document.getElementById("copyAddressBtn"),
  rsvpForm: document.getElementById("rsvpForm"),
  guestName: document.getElementById("guestName"),
  attendance: document.getElementById("attendance"),
  guestCount: document.getElementById("guestCount"),
  guestMessage: document.getElementById("guestMessage"),
  rsvpCount: document.getElementById("rsvpCount"),
};

const address = "7658 Olive Tree Ln, Highland, CA 92335";
const whatsappPhone = "525532533605";

function openWhatsApp() {
  const name = elements.guestName.value.trim() || "Guest";
  const attendance = elements.attendance.value === "yes" ? "Yes, I will attend" : "I will not be able to attend";
  const guests = Number(elements.guestCount.value || 1);
  const message = elements.guestMessage.value.trim();

  const lines = [
    "Lily's Quinceanera RSVP",
    `Name: ${name}`,
    `Attendance: ${attendance}`,
    `Number of guests: ${guests}`,
  ];

  if (message) {
    lines.push(`Message: ${message}`);
  }

  lines.push("Lilliana Rose Ramirez");

  const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function loadCounter() {
  try {
    const response = await fetch("/api/rsvp");
    if (!response.ok) throw new Error("bad-response");
    const data = await response.json();
    state.counter = Number(data.count || 0);
    elements.rsvpCount.textContent = String(state.counter);
  } catch {
    elements.rsvpCount.textContent = "0";
  }
}

async function saveRsvp() {
  const payload = {
    name: elements.guestName.value.trim(),
    attending: elements.attendance.value,
    guests: Number(elements.guestCount.value || 1),
    message: elements.guestMessage.value.trim(),
  };

  try {
    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      state.counter = Number(data.count || state.counter);
      elements.rsvpCount.textContent = String(state.counter);
    }
  } catch {
    // If the API fails, we still let the guest send the WhatsApp confirmation.
  }
}

function setupRevealAnimations() {
  const items = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  items.forEach((item) => observer.observe(item));
}

function updateScrollState() {
  state.scrollRaf = 0;
  document.documentElement.style.setProperty("--scroll-y", String(window.scrollY || 0));
}

function requestScrollState() {
  if (state.scrollRaf) return;
  state.scrollRaf = window.requestAnimationFrame(updateScrollState);
}

function setupParallax() {
  state.parallaxItems = Array.from(document.querySelectorAll("[data-parallax]"));

  state.parallaxItems.forEach((item) => {
    const speed = Number(item.dataset.parallax || 0);
    item.style.setProperty("--parallax-speed", String(speed));
  });

  updateScrollState();
  window.addEventListener("scroll", requestScrollState, { passive: true });
  window.addEventListener("resize", requestScrollState, { passive: true });
}

async function playMusic() {
  if (!elements.music || state.audioUnlocked) return;

  try {
    elements.music.volume = 0.8;
    elements.music.muted = false;
    await elements.music.play();
    state.audioUnlocked = true;
    removeAudioUnlockListeners();
  } catch {
    state.audioUnlocked = false;
  }
}

function removeAudioUnlockListeners() {
  document.removeEventListener("pointerdown", playMusic);
  document.removeEventListener("touchstart", playMusic);
  document.removeEventListener("keydown", playMusic);
  document.removeEventListener("scroll", playMusic);
  document.removeEventListener("visibilitychange", handleVisibilityAudio);
}

function handleVisibilityAudio() {
  if (!document.hidden) {
    playMusic();
  }
}

function setupAudioAutoplay() {
  if (!elements.music) return;

  elements.music.autoplay = true;
  elements.music.loop = true;
  elements.music.preload = "auto";
  elements.music.load();

  playMusic();
  window.setTimeout(playMusic, 300);
  window.setTimeout(playMusic, 1200);

  document.addEventListener("pointerdown", playMusic, { once: true, passive: true });
  document.addEventListener("touchstart", playMusic, { once: true, passive: true });
  document.addEventListener("keydown", playMusic, { once: true });
  document.addEventListener("scroll", playMusic, { once: true, passive: true });
  document.addEventListener("visibilitychange", handleVisibilityAudio);
}

elements.copyAddressBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(address);
    elements.copyAddressBtn.textContent = "Address copied";
    setTimeout(() => {
      elements.copyAddressBtn.textContent = "Copy address";
    }, 1800);
  } catch {
    window.prompt("Copy the address", address);
  }
});

elements.rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveRsvp();
  openWhatsApp();
});

window.addEventListener("load", async () => {
  setupRevealAnimations();
  setupParallax();
  setupAudioAutoplay();
  loadCounter();
});
