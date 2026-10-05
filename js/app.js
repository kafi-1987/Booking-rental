// APP.JS — SPA Rental Mobil (vanilla JS, fetch ke GAS, cache + optimistic UI)
const $ = s => document.querySelector(s), app = $('#app');
const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hariDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const S = { cars: ls.get('rm_cars', []), q: ls.get('rm_q', { mulai: '', selesai: '', driver: false }), f: { tr: '', sort: 'asc' }, last: null, adm: ls.get('rm_adm', null), tab: 'Menunggu' };

// ---------- API ----------
async function api(action, data, token) {
  try {
    const r = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, data, token }) });
    return await r.json();
  } catch { return { success: false, message: 'Koneksi bermasalah, coba lagi' }; }
}
async function get(params) {
  try { return await (await fetch(GAS_URL + '?' + new URLSearchParams(params))).json(); }
  catch { return { success: false, message: 'Koneksi bermasalah, coba lagi' }; }
}
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 3000); }

// ---------- ROUTER (SPA, 0ms) ----------
function route() {
  const [, p, a] = location.hash.split('/');
  window.scrollTo(0, 0);
  ({ car: viewCar, done: viewDone, status: viewStatus, print: viewPrint, admin: viewAdmin }[p] || viewHome)(a);
}
addEventListener('hashchange', route);

// ---------- KATALOG ----------
function carCard(c) {
  const hari = S.q.mulai && S.q.selesai ? hariDiff(S.q.mulai, S.q.selesai) : 0;
  return `<div class="card"><div class="ph">${c.foto ? `<img loading="lazy" src="${esc(c.foto)}" alt="">` : '🚗'}<span class="badge ok">Tersedia</span></div>
  <h3 style="margin:12px 0 4px">${esc(c.merek)} ${esc(c.tipe)}</h3><div class="mut">${esc(c.tahun)} • ${esc(c.transmisi)} • ${esc(c.kapasitas)} kursi</div>
  <div class="pr" style="margin:12px 0"><b class="amber">${rp(c.harga)}</b> <span class="mut">/ hari</span>${hari > 0 ? `<div class="mut">Total ${hari} hari: ${rp(hari * c.harga)}</div>` : ''}</div>
  <a class="btn" href="#/car/${esc(c.id)}">Lihat Detail & Booking →</a></div>`;
}
function renderCars() {
  let L = S.cars.filter(c => !S.f.tr || c.transmisi === S.f.tr).sort((a, b) => S.f.sort === 'asc' ? a.harga - b.harga : b.harga - a.harga);
  const per = S.q.mulai && S.q.selesai ? `untuk ${S.q.mulai} s/d ${S.q.selesai}` : '';
  $('#res').innerHTML = `<p><b>${L.length} mobil tersedia</b> ${per}</p>` + (L.length ? `<div class="grid">${L.map(carCard).join('')}</div>` :
    `<div class="card empty"><h3>Tidak ada mobil tersedia di tanggal ini</h3><p>Coba tanggal lain atau ubah filter.</p></div>`);
}
function viewHome() {
  const today = new Date().toISOString().slice(0, 10);
  app.innerHTML = `<section class="hero"><h1>Sewa Mobil <em>Mudah & Cepat</em></h1><p>Cek ketersediaan, harga, dan booking tanpa perlu login.</p>
  <div class="card search"><label>Tanggal Mulai<input type="date" id="m" min="${today}" value="${esc(S.q.mulai)}"></label>
  <label>Tanggal Selesai<input type="date" id="s" min="${today}" value="${esc(S.q.selesai)}"></label><button class="btn" id="cari">Cari Mobil Tersedia</button></div>
  <p class="mut" id="lama"></p></section>
  <div class="filters"><select id="tr"><option value="">Transmisi: Semua</option><option>Manual</option><option>Matic</option></select>
  <select id="so"><option value="asc">Harga Terendah</option><option value="desc">Harga Tertinggi</option></select></div><div id="res"></div>`;
  $('#tr').value = S.f.tr; $('#so').value = S.f.sort;
  const lama = () => { const m = $('#m').value, s = $('#s').value; $('#lama').textContent = m && s && s > m ? 'Lama sewa: ' + hariDiff(m, s) + ' hari' : ''; };
  lama();
  $('#m').onchange = () => { if ($('#s').value <= $('#m').value) $('#s').value = ''; lama(); };
  $('#s').onchange = lama;
  $('#tr').onchange = e => { S.f.tr = e.target.value; renderCars(); };      // filter lokal = instan
  $('#so').onchange = e => { S.f.sort = e.target.value; renderCars(); };
  $('#cari').onclick = async () => {
    const m = $('#m').value, s = $('#s').value;
    if (!m || !s || s <= m) return toast('Pilih tanggal mulai & selesai yang valid', true);
    S.q = { ...S.q, mulai: m, selesai: s }; ls.set('rm_q', S.q);
    $('#res').innerHTML = '<div class="grid"><div class="card skel"></div><div class="card skel"></div><div class="card skel"></div></div>';
    const r = await get({ action: 'cars', mulai: m, selesai: s });
    if (!r.success) return toast(r.message, true);
    S.cars = r.data; renderCars();
  };
  if (S.cars.length) renderCars(); else $('#res').innerHTML = '<div class="grid"><div class="card skel"></div><div class="card skel"></div><div class="card skel"></div></div>';
  // stale-while-revalidate: tampil cache dulu, segarkan di latar belakang
  if (!S.q.mulai) get({ action: 'cars' }).then(r => { if (r.success) { S.cars = r.data; ls.set('rm_cars', r.data); if ($('#res')) renderCars(); } });
}

// ---------- DETAIL & FORM BOOKING ----------
function viewCar(id) {
  const c = S.cars.find(x => x.id == id);
  if (!c) return location.hash = '#/';
  const d = ls.get('rm_draft', {});
  app.innerHTML = `<a class="back" href="#/">← Kembali ke Katalog</a><div class="two"><div class="card"><div class="ph big">${c.foto ? `<img src="${esc(c.foto)}" alt="">` : '🚗'}</div>
  <h2>${esc(c.merek)} ${esc(c.tipe)}</h2><table><tr><td class="mut">Tahun</td><td>${esc(c.tahun)}</td></tr><tr><td class="mut">Transmisi</td><td>${esc(c.transmisi)}</td></tr>
  <tr><td class="mut">Kapasitas</td><td>${esc(c.kapasitas)} kursi</td></tr><tr><td class="mut">Plat</td><td>${esc(c.plat).slice(0, 4)}*** ${esc(c.plat).slice(-3)}</td></tr><tr><td class="mut">Harga/hari</td><td><b>${rp(c.harga)}</b></td></tr></table></div>
  <div><div class="card"><div class="steps"><span>1 Pilih Mobil</span><span class="on">2 Detail & Driver</span><span>3 Bayar DP</span><span>4 Konfirmasi</span></div>
  <form id="f"><div class="row"><label>Tanggal Mulai<input type="date" name="mulai" required value="${esc(S.q.mulai)}"></label><label>Tanggal Selesai<input type="date" name="selesai" required value="${esc(S.q.selesai)}"></label></div>
  <label>Nama Lengkap<input name="nama" required value="${esc(d.nama)}"></label><label>No. HP / WhatsApp<input name="hp" type="tel" required value="${esc(d.hp)}"></label>
  <label>Email<input name="email" type="email" required value="${esc(d.email)}"></label>
  <label class="chk"><input type="checkbox" name="driver" ${d.driver ? 'checked' : ''}> Dengan Driver (+${rp(TARIF_DRIVER)}/hari)</label>
  <label>Catatan<textarea name="catatan" rows="2">${esc(d.catatan)}</textarea></label><div class="sum" id="sum"></div><div id="msg"></div>
  <label class="chk"><input type="checkbox" required> Saya menyetujui syarat & ketentuan sewa</label><button class="btn" id="go">Booking Sekarang →</button></form></div></div></div>`;
  const f = $('#f'), hit = () => {
    const m = f.mulai.value, s = f.selesai.value, h = m && s && s > m ? hariDiff(m, s) : 0, dr = f.driver.checked ? h * TARIF_DRIVER : 0, tot = h * c.harga + dr;
    $('#sum').innerHTML = h ? `${h} hari × ${rp(c.harga)} = ${rp(h * c.harga)}<br>${dr ? 'Driver: ' + rp(dr) + '<br>' : ''}<b style="font-size:20px;color:var(--a)">TOTAL ${rp(tot)}</b><br><small>DP minimal 30%: ${rp(Math.round(tot * .3))}</small>` : 'Pilih tanggal sewa untuk melihat biaya';
    ls.set('rm_draft', { nama: f.nama.value, hp: f.hp.value, email: f.email.value, driver: f.driver.checked, catatan: f.catatan.value }); // autosave draft
  };
  f.oninput = f.onchange = hit; hit();   // biaya dihitung lokal, 0ms
  f.onsubmit = async e => {
    e.preventDefault();
    const m = f.mulai.value, s = f.selesai.value;
    if (s <= m) return toast('Tanggal selesai harus setelah tanggal mulai', true);
    $('#go').disabled = true; $('#go').textContent = 'Memproses…';
    const r = await api('book', { id_mobil: c.id, mulai: m, selesai: s, nama: f.nama.value, hp: f.hp.value, email: f.email.value, driver: f.driver.checked, catatan: f.catatan.value });
    $('#go').disabled = false; $('#go').textContent = 'Booking Sekarang →';
    if (r.success) {
      S.last = { kode: r.kode, total: r.total, dp: r.dp, mobil: c.merek + ' ' + c.tipe, mulai: m, selesai: s, email: f.email.value, kontak: f.email.value };
      sessionStorage.setItem('rm_last', JSON.stringify(S.last)); localStorage.removeItem('rm_draft'); location.hash = '#/done/' + r.kode;
    } else if (r.conflict) {
      $('#msg').innerHTML = `<div class="alert"><b>${esc(r.message)}</b><p>Alternatif mobil tersedia:</p>${(r.alt || []).map(a => `<p><a href="#/car/${esc(a.id)}">${esc(a.merek)} ${esc(a.tipe)} — ${rp(a.harga)}/hari</a></p>`).join('') || '<p>Belum ada alternatif, coba ubah tanggal.</p>'}</div>`;
      S.cars = [...new Map([...S.cars, ...(r.alt || [])].map(x => [x.id, x])).values()];
    } else toast(r.message, true);
  };
}

// ---------- KONFIRMASI ----------
function viewDone() {
  const l = S.last || JSON.parse(sessionStorage.getItem('rm_last') || 'null');
  if (!l) return location.hash = '#/status';
  app.innerHTML = `<div class="card narrow"><h2>✅ Booking Berhasil Dikirim!</h2><p class="mut">Konfirmasi dikirim ke ${esc(l.email)}</p>
  <div class="code" id="kd">${esc(l.kode)}</div><button class="btn sec" id="cp">Salin Kode</button>
  <p><b>${esc(l.mobil)}</b><br>${esc(l.mulai)} – ${esc(l.selesai)}<br>Total: <b>${rp(l.total)}</b><br><span class="badge warn">Menunggu</span> <span class="badge">Belum Bayar</span></p>
  <div class="sum">Transfer DP min. 30%: <b>${rp(l.dp)}</b><br>${esc(BANK)}</div>
  <p>1. Simpan kode booking → 2. Unggah bukti pembayaran → 3. Tunggu persetujuan</p>
  <a class="btn" href="#/status">Unggah Bukti Pembayaran</a><a class="btn sec" href="#/print">Cetak Bukti Booking</a></div>`;
  $('#cp').onclick = () => { navigator.clipboard?.writeText(l.kode); toast('Kode disalin'); };
}

// ---------- CEK STATUS & UNGGAH BUKTI ----------
const badge = s => `<span class="badge ${/Lunas|Disetujui|Selesai|Terverifikasi/.test(s) ? '' : /Ditolak|Batal/.test(s) ? 'err' : 'warn'}">${esc(s)}</span>`;
function viewStatus() {
  const l = S.last || JSON.parse(sessionStorage.getItem('rm_last') || 'null') || {};
  app.innerHTML = `<div class="card narrow"><h2>Cek Status Booking</h2><form id="f"><label>Kode Booking<input name="k" required value="${esc(l.kode)}" placeholder="RNT-20261005-0012"></label>
  <label>No. HP atau Email (verifikasi)<input name="c" required value="${esc(l.kontak)}"></label><button class="btn">Cek Status</button></form></div><div id="hasil"></div>`;
  $('#f').onsubmit = async e => {
    e.preventDefault(); const k = e.target.k.value.trim().toUpperCase(), c = e.target.c.value.trim();
    $('#hasil').innerHTML = '<div class="card skel narrow"></div>';
    const r = await get({ action: 'status', kode: k, kontak: c });
    if (!r.success) { $('#hasil').innerHTML = `<div class="alert narrow">${esc(r.message)}</div>`; return; }
    S.last = { ...S.last, ...r, kode: k, kontak: c, status: true }; sessionStorage.setItem('rm_last', JSON.stringify(S.last)); showResult(r, k, c);
  };
}
function showResult(r, k, c) {
  const b = r.b, steps = ['Menunggu', 'Disetujui', 'Berjalan', 'Selesai'], idx = steps.indexOf(b.status);
  $('#hasil').innerHTML = `<div class="two" style="margin-top:16px"><div class="card"><h3>${esc(b.kode)} ${badge(b.status)}</h3><p>${esc(b.mobil)}<br>${esc(b.mulai)} – ${esc(b.selesai)} (${esc(b.hari)} hari) • Driver: ${b.driver === 'Y' ? 'Ya' : 'Tidak'}<br>Total: <b>${rp(b.total)}</b></p>
  ${idx < 0 ? badge(b.status) : `<div class="steps">${steps.map((s, i) => `<span class="${i <= idx ? 'on' : ''}">${s}</span>`).join('')}</div>`}<a class="btn sec" href="#/print">Cetak Bukti Booking</a></div>
  <div class="card"><h3>Pembayaran ${badge(r.bayar)}</h3><p>Total ${rp(b.total)} • Dibayar ${rp(r.paid)} • <b>Sisa ${rp(r.sisa)}</b></p>
  ${r.pay.map(p => `<p class="mut">${esc(p.tgl)} — ${rp(p.jumlah)} ${badge(p.verif)}</p>`).join('')}
  <form id="u"><label>Bukti Transfer (JPG/PNG/PDF, maks. 5 MB)<input type="file" name="file" accept="image/jpeg,image/png,application/pdf" required></label>
  <label>Jumlah Dibayar (Rp)<input name="jml" type="number" required value="${r.sisa || ''}"></label><label>Metode<select name="met"><option>Transfer</option><option>QRIS</option><option>Tunai</option></select></label>
  <button class="btn" id="ub">Kirim Bukti Pembayaran</button></form></div></div>`;
  $('#u').onsubmit = e => {
    e.preventDefault(); const f = e.target, file = f.file.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('File terlalu besar (maks. 5 MB)', true);
    if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(file.type)) return toast('Format harus JPG/PNG/PDF', true);
    $('#ub').disabled = true; $('#ub').textContent = 'Mengunggah…';
    const rd = new FileReader();
    rd.onload = async () => {
      const x = await api('upload', { kode: k, kontak: c, b64: rd.result.split(',')[1], mime: file.type, jumlah: f.jml.value, metode: f.met.value });
      $('#ub').disabled = false; $('#ub').textContent = 'Kirim Bukti Pembayaran';
      if (x.success) { toast(x.message); r.pay.push({ tgl: new Date().toISOString().slice(0, 10), jumlah: f.jml.value, verif: 'Menunggu Verifikasi' }); showResult(r, k, c); } else toast(x.message, true);
    };
    rd.readAsDataURL(file);
  };
}

// ---------- CETAK BUKTI (A4) ----------
function viewPrint() {
  const l = S.last || JSON.parse(sessionStorage.getItem('rm_last') || 'null');
  if (!l) return location.hash = '#/status';
  const b = l.b || {}, kode = l.kode, mobil = l.mobil || b.mobil, total = l.total ?? b.total, mulai = l.mulai || b.mulai, selesai = l.selesai || b.selesai;
  app.innerHTML = `<div class="card" style="max-width:210mm;margin:auto;padding:15mm"><div style="border-top:6px solid var(--a);padding-top:12px"><h2>BUKTI BOOKING RENTAL MOBIL</h2><div class="code">${esc(kode)}</div></div>
  <table width="100%" cellpadding="6"><tr><td class="mut">Mobil</td><td>${esc(mobil)}</td></tr><tr><td class="mut">Tanggal ambil</td><td>${esc(mulai)}</td></tr><tr><td class="mut">Tanggal kembali</td><td>${esc(selesai)}</td></tr>
  <tr><td class="mut">Total Biaya</td><td><b>${rp(total)}</b></td></tr>${l.paid != null ? `<tr><td class="mut">Dibayar / Sisa</td><td>${rp(l.paid)} / ${rp(l.sisa)}</td></tr>` : ''}</table>
  <p class="mut"><small>Rekening: ${esc(BANK)}<br>Syarat: bawa KTP & SIM A asli saat pengambilan; pelunasan sebelum serah kunci; denda keterlambatan berlaku.<br>Dicetak: ${new Date().toLocaleString('id-ID')}</small></p></div>
  <div class="noprint" style="max-width:420px;margin:12px auto"><button class="btn" onclick="print()">Cetak / Simpan PDF</button></div>`;
}

// ---------- ADMIN (login, booking, pembayaran) ----------
async function viewAdmin() {
  if (!S.adm) {
    app.innerHTML = `<div class="card narrow"><h2>Login Panel Admin</h2><p class="mut">Khusus Owner dan Kasir</p><form id="f"><label>Username<input name="u" required autocomplete="username"></label>
    <label>Password<input name="p" type="password" required autocomplete="current-password"></label><div id="msg"></div><button class="btn">Masuk</button></form><a class="back" href="#/">← Kembali ke Beranda</a></div>`;
    $('#f').onsubmit = async e => {
      e.preventDefault(); const r = await api('login', { username: e.target.u.value, password: e.target.p.value });
      if (!r.success) return $('#msg').innerHTML = `<div class="alert">${esc(r.message)}</div>`;
      S.adm = { token: r.token, role: r.role, user: r.username }; ls.set('rm_adm', S.adm); viewAdmin();
    };
    return;
  }
  const cache = ls.get('rm_admdata', null);
  if (cache) { S.ad = cache; adminUI(); } else app.innerHTML = '<div class="card skel"></div>';
  const r = await api('adminData', {}, S.adm.token);
  if (!r.success) { if (/Sesi/.test(r.message)) { logout(); toast(r.message, true); } return; }
  S.ad = r; ls.set('rm_admdata', r); adminUI();
}
function logout() { S.adm = null; localStorage.removeItem('rm_adm'); localStorage.removeItem('rm_admdata'); viewAdmin(); }
function adminUI() {
  const B = S.ad.bookings, P = S.ad.payments, cnt = s => B.filter(b => b.status === s).length, piut = B.filter(b => ['Disetujui', 'Berjalan', 'Selesai'].includes(b.status)).reduce((a, b) => a + Math.max(0, b.total - b.paid), 0);
  const tabs = ['Menunggu', 'Disetujui', 'Berjalan', 'Selesai', 'Ditolak', 'Batal'], L = B.filter(b => b.status === S.tab), pv = P.filter(p => p.verif === 'Menunggu Verifikasi');
  const act = (b, st, lbl) => `<button class="btn ${st === 'Ditolak' ? 'sec' : ''}" data-k="${esc(b.kode)}" data-s="${st}">${lbl}</button>`;
  app.innerHTML = `<div class="bar"><h2>Panel ${esc(S.adm.role)}</h2><button class="btn sec" id="lo">Logout</button></div>
  <div class="stats"><div class="card"><b>${cnt('Menunggu')}</b>Booking Menunggu</div><div class="card"><b>${cnt('Berjalan')}</b>Sedang Berjalan</div><div class="card"><b>${pv.length}</b>Bukti Perlu Verifikasi</div><div class="card"><b>${rp(piut)}</b>Total Piutang</div></div>
  <div class="tabs">${tabs.map(t => `<button class="${t === S.tab ? 'on' : ''}" data-t="${t}">${t} (${cnt(t)})</button>`).join('')}</div>
  ${L.map(b => `<div class="card" style="margin-bottom:8px"><div class="row2"><b>${esc(b.kode)}</b>${badge(b.status)}</div><div>${esc(b.nama)} • ${esc(b.hp)}<br>${esc(b.mobil)} (${esc(b.plat)})<br>${esc(b.mulai)} – ${esc(b.selesai)} • ${rp(b.total)} • dibayar ${rp(b.paid)}</div>
  <div class="acts" style="margin-top:8px">${b.status === 'Menunggu' ? act(b, 'Disetujui', '✓ Setujui') + act(b, 'Ditolak', '✗ Tolak') : b.status === 'Disetujui' ? act(b, 'Berjalan', 'Tandai Berjalan') : b.status === 'Berjalan' ? act(b, 'Selesai', 'Tandai Selesai') : ''}</div></div>`).join('') || '<p class="empty">Tidak ada booking.</p>'}
  <h3>Verifikasi Pembayaran (${pv.length})</h3>${pv.map(p => `<div class="card" style="margin-bottom:8px"><div class="row2"><b>${esc(p.kode)}</b><span>${rp(p.jumlah)} • ${esc(p.metode)}</span></div><a href="${esc(p.bukti)}" target="_blank" rel="noopener">Lihat bukti</a>
  <div class="acts" style="margin-top:8px"><button class="btn" data-p="${esc(p.id)}" data-ok="1">Verifikasi</button><button class="btn sec" data-p="${esc(p.id)}" data-ok="0">Tolak</button></div></div>`).join('') || '<p class="empty">Tidak ada.</p>'}`;
  $('#lo').onclick = logout;
  app.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { S.tab = x.dataset.t; adminUI(); });
  app.querySelectorAll('[data-s]').forEach(x => x.onclick = async () => {
    const b = B.find(y => y.kode === x.dataset.k), old = b.status; b.status = x.dataset.s; ls.set('rm_admdata', S.ad); adminUI();   // optimistic: UI berubah seketika
    const r = await api('setStatus', { kode: b.kode, status: b.status }, S.adm.token);
    if (!r.success) { b.status = old; adminUI(); toast(r.message, true); } else toast('Status diperbarui');
  });
  app.querySelectorAll('[data-p]').forEach(x => x.onclick = async () => {
    const p = P.find(y => y.id === x.dataset.p), old = p.verif; p.verif = x.dataset.ok === '1' ? 'Terverifikasi' : 'Ditolak';
    const bk = B.find(y => y.kode === p.kode); if (bk && p.verif === 'Terverifikasi') bk.paid += Number(p.jumlah); adminUI();
    const r = await api('verify', { id: p.id, ok: x.dataset.ok === '1' }, S.adm.token);
    if (!r.success) { p.verif = old; if (bk && old !== 'Terverifikasi') bk.paid -= Number(p.jumlah); adminUI(); toast(r.message, true); } else toast('Pembayaran diperbarui');
  });
}

route();
