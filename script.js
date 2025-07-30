/* ---------- particles ---------- */
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let particles = [];
function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
window.addEventListener("resize", resize);
class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.radius = Math.random() * 2 + 1;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    this.draw();
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff20";
    ctx.fill();
  }
}
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => p.update());
  requestAnimationFrame(animate);
}
for (let i = 0; i < 80; i++) particles.push(new Particle());
animate();

/* ---------- page flow ---------- */
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
function show(page) {
  [page1, page2, page3].forEach(p => p.classList.add("hidden"));
  page.classList.remove("hidden");
}

/* ---------- plan mapping ---------- */
const planMap = {
  1: { cpu: 30, price: 1000 },
  2: { cpu: 60, price: 2000 },
  3: { cpu: 90, price: 3000 },
  4: { cpu: 120, price: 4000 },
  5: { cpu: 150, price: 5000 },
  6: { cpu: 180, price: 6000 },
  7: { cpu: 210, price: 7000 },
  8: { cpu: 250, price: 8000 },
  9: { cpu: 500, price: 9000 },
  10: { cpu: 0, price: 10000 },
  0: { cpu: 0, price: 12000 } // unlimited
};

/* ---------- order ---------- */
const form = document.getElementById("orderForm");
const apiBase = "https://api.nvidiabotz.xyz";
let orderData = {};

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form);
  const username = fd.get("username").trim();
  const disk = parseInt(fd.get("disk"), 10);
  const plan = planMap[disk];
  if (!plan) return alert("Paket tidak valid");

  const { cpu, price } = plan;
  orderData = { username, disk, cpu, amount: price };

  // create payment
  const payRes = await fetch(
    `${apiBase}/orderkuota/createpayment?amount=${price}&codeqr=00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214737303604511730303UMI51440014ID.CO.QRIS.WWW0215ID20233008497000303UMI5204541153033605802ID5919TOKO LUXZ OK14115406009BENGKALIS61052871162070703A01630497DB`
  ).then(r => r.json());
  if (!payRes.status) return alert(payRes.error);

  // tampilkan page2
  orderData.trxId = payRes.result.idtransaksi;
  document.getElementById("amount").textContent = `Rp ${price.toLocaleString()}`;
  document.getElementById("qris").src = payRes.result.imageqris.url;
  document.getElementById("trxId").textContent = orderData.trxId;
  show(page2);

  // mulai polling
  startPolling();
});

/* ---------- auto-check payment ---------- */
let checkInterval;
function startPolling() {
  checkInterval = setInterval(async () => {
    const res = await fetch(
      `${apiBase}/orderkuota/mutasiqr?username=bangluxz&token=1411540:QEyCKljfu91OcsYd54xWJz7BvPL6VbZp`
    ).then(r => r.json());
    if (!res.status) return;

    const today = new Date().toLocaleDateString("id-ID");
    const paid = res.result.some(tx => {
      const txAmount = parseFloat(tx.kredit.replace(/,/g, ""));
      const txDate = tx.tanggal.split(" ")[0];
      return txAmount === orderData.amount && txDate === today;
    });

    if (!paid) return;

    clearInterval(checkInterval);

    // buat panel
    const { username, disk, cpu } = orderData;
    const panelRes = await fetch(
      `${apiBase}/pterodactyl/addpanel?domain=https://samzmarket.my.id&plta=ptla_emou1lhJTLr3WN7mHYRcZtdxBnmetuueI9h5MLvQaWM&username=${username}&disk=${disk}&cpu=${cpu}`
    ).then(r => r.json());
    if (!panelRes.status) return alert(panelRes.error);

    // tampilkan page3
    orderData.panel = panelRes;
    document.getElementById("pUser").textContent = panelRes.user.attributes.username;
    document.getElementById("pDomain").textContent = "https://samzmarket.my.id";
    document.getElementById("pPass").textContent = panelRes.user.attributes.username;
    show(page3);
  }, 3000);
}

/* ---------- download ---------- */
document.getElementById("downloadBtn").addEventListener("click", () => {
  const { trxId, panel } = orderData;
  const text = `Detail Panel Pterodactyl
Transaksi: ${trxId}
Username: ${panel.user.attributes.username}
Domain: https://samzmarket.my.id
Password: ${panel.user.attributes.username}
`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `panel_${panel.user.attributes.username}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
