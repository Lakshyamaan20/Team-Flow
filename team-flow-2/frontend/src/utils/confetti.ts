const COLORS = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#ec4899", "#06b6d4", "#a855f7"];

export function fireConfetti(count = 60) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * -1,
    w: Math.random() * 8 + 4,
    h: Math.random() * 6 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 10,
    opacity: 1,
  }));

  let frame = 0;
  const maxFrames = 120;

  function draw() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.rot += p.rotV;
      if (frame > maxFrames - 30) p.opacity = Math.max(0, p.opacity - 0.05);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (frame < maxFrames) requestAnimationFrame(draw);
    else canvas.remove();
  }

  draw();
}
