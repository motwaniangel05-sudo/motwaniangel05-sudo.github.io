document.documentElement.classList.add("ready");   // tells the page this script is running

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover)").matches;

/* ---------- 1. Scroll progress bar ---------- */
const progress = document.getElementById("progress");
let ticking = false;
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? window.scrollY / max : 0;
  progress.style.transform = "scaleX(" + ratio + ")";
  ticking = false;
}
window.addEventListener("scroll", () => {
  if (!ticking) { requestAnimationFrame(updateProgress); ticking = true; }
}, { passive: true });
updateProgress();

/* ---------- 2. Scroll reveal ---------- */
const revealItems = document.querySelectorAll(".reveal");
revealItems.forEach(el => {
  const siblings = [...el.parentElement.children].filter(c => c.classList.contains("reveal"));
  el.style.setProperty("--d", (siblings.indexOf(el) * 0.1) + "s");
});
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
revealItems.forEach(el => revealObserver.observe(el));

/* ---------- 3. Typing effect in the hero ---------- */
const roleEl = document.getElementById("role");
const roles = ["Data Science student", "machine learning builder", "SQL storyteller", "hackathon regular"];
if (roleEl && !reduceMotion) {
  let r = 0, c = roles[0].length, deleting = true;
  function type() {
    const word = roles[r];
    roleEl.textContent = word.slice(0, c);
    let delay = deleting ? 45 : 85;
    if (!deleting && c === word.length) { deleting = true; delay = 1600; }
    else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; delay = 350; }
    else { c += deleting ? -1 : 1; }
    setTimeout(type, delay);
  }
  setTimeout(type, 2200);
}

/* ---------- 4. Count-up numbers ---------- */
const nums = document.querySelectorAll(".num");
function formatNum(el, value) {
  el.textContent = (el.dataset.prefix || "") + value + (el.dataset.suffix || "");
}
if (!reduceMotion) {
  nums.forEach(el => formatNum(el, 0));
  const countObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const duration = 1500;
      const start = performance.now();
      function step(now) {
        const t = Math.min((now - start) / duration, 1);
        formatNum(el, Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      obs.unobserve(el);
    });
  }, { threshold: 0.6 });
  nums.forEach(el => countObserver.observe(el));
}

/* ---------- 5. Highlight the current section in the nav ---------- */
const navLinks = document.querySelectorAll("nav a");
const sections = [...document.querySelectorAll("main section[id]")]
  .filter(s => document.querySelector('nav a[href="#' + s.id + '"]'));
const spy = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.removeAttribute("aria-current"));
      const link = document.querySelector('nav a[href="#' + entry.target.id + '"]');
      if (link) link.setAttribute("aria-current", "true");
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
sections.forEach(s => spy.observe(s));

/* ---------- 6. Project filter (with a small pop-in) ---------- */
const filterButtons = document.querySelectorAll(".filters button");
const cards = document.querySelectorAll(".card");
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach(b => b.setAttribute("aria-pressed", b === button ? "true" : "false"));
    let shown = 0;
    cards.forEach(card => {
      const categories = card.dataset.cat.split(" ");
      const match = filter === "all" || categories.includes(filter);
      card.hidden = !match;
      card.classList.remove("pop");
      if (match) {
        void card.offsetWidth;                       // restart the animation
        card.style.setProperty("--d", (shown * 0.08) + "s");
        card.classList.add("pop");
        shown++;
      }
    });
  });
});

/* ---------- 7. Cards: spotlight + 3D tilt that follow the mouse ---------- */
if (canHover) {
  cards.forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      if (!reduceMotion) {
        const rx = (0.5 - y / rect.height) * 6;     // tilt up/down
        const ry = (x / rect.width - 0.5) * 8;      // tilt left/right
        card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-6px)";
      }
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* ---------- 8. Hero: glows drift with the mouse ---------- */
const hero = document.getElementById("hero");
const mouse = { x: -9999, y: -9999 };
if (hero && !reduceMotion && canHover) {
  hero.addEventListener("mousemove", e => {
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty("--px", ((e.clientX - rect.left) / rect.width - 0.5).toFixed(3));
    hero.style.setProperty("--py", ((e.clientY - rect.top) / rect.height - 0.5).toFixed(3));
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
}

/* ---------- 9. Hero: neural-network particle background ---------- */
const canvas = document.getElementById("net");
if (canvas && hero) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, nodes = [], running = false, rafId = 0;

  function resize() {
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(28, Math.min(95, Math.floor((w * h) / 15000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.8
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const linkDist = 125, mouseDist = 170;

    for (const n of nodes) {
      if (!reduceMotion) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
    }
    // lines between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.hypot(dx, dy);
        if (d < linkDist) {
          ctx.strokeStyle = "rgba(129,140,248," + (0.32 * (1 - d / linkDist)).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
      // lines from the mouse to nearby nodes
      const md = Math.hypot(nodes[i].x - mouse.x, nodes[i].y - mouse.y);
      if (md < mouseDist) {
        ctx.strokeStyle = "rgba(56,189,248," + (0.65 * (1 - md / mouseDist)).toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    // the nodes themselves
    for (const n of nodes) {
      ctx.fillStyle = "rgba(196,181,253,.85)";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
    if (running) rafId = requestAnimationFrame(draw);
  }

  resize();
  draw();                                           // one frame (also used for reduced motion)

  if (!reduceMotion) {
    // only animate while the hero is on screen
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; rafId = requestAnimationFrame(draw); }
      if (!visible) { running = false; cancelAnimationFrame(rafId); }
    }).observe(hero);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (!running) draw(); }, 200);
  });
}

/* ---------- 10. Soft glow that follows the cursor (desktop) ---------- */
const glow = document.getElementById("glow");
if (glow && !reduceMotion && canHover) {
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2, gx = tx, gy = ty;
  window.addEventListener("mousemove", e => { tx = e.clientX; ty = e.clientY; glow.style.opacity = 1; }, { passive: true });
  (function follow() {
    gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
    glow.style.transform = "translate(" + (gx - 250) + "px," + (gy - 250) + "px)";
    requestAnimationFrame(follow);
  })();
}

/* ---------- 11. Photo fallback ---------- */
// If images/me.jpg is missing, show the "AM" initials instead of a broken image.
const portrait = document.querySelector(".portrait");
const photo = portrait ? portrait.querySelector("img") : null;
if (photo) {
  const showInitials = () => portrait.classList.add("no-photo");
  photo.addEventListener("error", showInitials);
  if (photo.complete && photo.naturalWidth === 0) showInitials();
}
