// RentalMobil — SPA (navigasi 0ms, katalog cache-first, filter tanggal lokal)
const $=s=>document.querySelector(s),rp=n=>'Rp '+(+n).toLocaleString('id-ID'),
esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let D=JSON.parse(localStorage.getItem('kat')||'null'),TOK=localStorage.getItem('tok'),SEL=null;
async function api(action,d={},post=false){try{
 const r=post?await fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...d})})
 :await fetch(GAS_URL+'?'+new URLSearchParams({action,...d}));return await r.json()}
 catch(e){return{success:false,message:'Koneksi gagal: '+e.message}}}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)}
function nav(){const v=(location.hash||'#katalog').slice(1);
 document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!='v-'+v);
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash=='#'+v));if(v=='admin')admin()}
addEventListener('hashchange',nav);

// ---- KATALOG ----
const days=()=>{const a=$('#d1').value,b=$('#d2').value;return a&&b&&b>a?Math.round((new Date(b)-new Date(a))/864e5):0};
const free=(m,a,b)=>!D.sibuk.some(x=>x.id==m.id&&a<=x.s&&b>=x.m);
function renderKat(){if(!D)return;const a=$('#d1').value,b=$('#d2').value,n=days(),L=D.mobil.filter(m=>!n||free(m,a,b));
 $('#info').textContent=n?`${L.length} mobil tersedia untuk ${n} hari`:'Pilih tanggal untuk melihat ketersediaan & estimasi biaya';
 $('#grid').innerHTML=L.length?L.map(m=>`<article class="card"><div class="ph" ${m.foto?`style="background-image:url('${esc(m.foto)}')"`:''}>${m.foto?'':'🚗'}</div>
 <div class="in"><span class="tag ok">Tersedia</span><h3>${esc(m.merek)} ${esc(m.tipe)}</h3>
 <span class="pill">${esc(m.transmisi)}</span><span class="pill">${esc(m.kapasitas)} kursi</span><span class="pill">${esc(m.tahun)}</span>
 <div class="price">${rp(m.harga)} <small class="muted">/ hari</small></div>${n?`<p class="muted">Estimasi ${n} hari: <b>${rp(n*m.harga)}</b></p>`:''}
 <button class="btn" data-a="pick" data-id="${m.id}">Pilih Mobil</button></div></article>`).join(''):'<div class="empty">Tidak ada mobil tersedia di tanggal ini. Coba tanggal lain.</div>'}
async function load(){const r=await api('katalog');if(r.success){D=r;localStorage.setItem('kat',JSON.stringify(r));renderKat()}else if(!D)toast(r.message)}
['d1','d2'].forEach(i=>$('#'+i).addEventListener('change',renderKat));

// ---- BOOKING ----
function openBook(id){const n=days();if(!n)return toast('Pilih tanggal mulai & selesai dulu');
 SEL=D.mobil.find(m=>m.id==id);const t=$('#modal');t.hidden=false;
 $('#mb').innerHTML=`<h2>${esc(SEL.merek)} ${esc(SEL.tipe)}</h2><p class="muted">${$('#d1').value} → ${$('#d2').value} (${n} hari)</p>
 <form id="fb"><input name="nama" placeholder="Nama lengkap" required><input name="hp" type="tel" placeholder="No. WhatsApp" required><input name="email" type="email" placeholder="Email" required>
 <label><input type="checkbox" name="driver" id="dr"> Dengan driver (+${rp(D.cfg.tarif_driver)}/hari)</label><textarea name="catatan" placeholder="Catatan (opsional)"></textarea>
 <p>Total: <b class="price" id="tot"></b></p><button class="btn">Booking Sekarang</button></form>`;
 const calc=()=>$('#tot').textContent=rp(n*(+SEL.harga+($('#dr').checked?+D.cfg.tarif_driver:0)));calc();$('#dr').onchange=calc}
document.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),btn=e.submitter,id=e.target.id;
 if(id=='fb'){btn.disabled=true;btn.textContent='Memproses…';
  const r=await api('booking',{id_mobil:SEL.id,mulai:$('#d1').value,selesai:$('#d2').value,nama:f.get('nama'),hp:f.get('hp'),email:f.get('email'),driver:f.get('driver')?1:0,catatan:f.get('catatan')},true);
  if(r.success){localStorage.setItem('last',JSON.stringify({k:r.kode,c:f.get('hp')}));
   $('#mb').innerHTML=`<h2>✅ Booking Berhasil!</h2><div class="code">${r.kode}</div><p>Total <b>${rp(r.total)}</b> · DP ${D.cfg.dp_persen}%: <b>${rp(r.dp)}</b></p>
   <p class="muted">Transfer ke: ${esc(D.cfg.rekening)}<br>Simpan kode ini. Konfirmasi dikirim ke email.</p><a class="btn" style="display:block;text-align:center;text-decoration:none" href="#status" data-a="x">Unggah Bukti Bayar</a>`;
   $('#sk').value=r.kode;$('#sc').value=f.get('hp');load()}
  else{toast(r.message);btn.disabled=false;btn.textContent='Booking Sekarang';if(r.bentrok){$('#modal').hidden=true;load()}}}
 if(id=='fs'){$('#sr').innerHTML='<p class="empty">Memuat…</p>';const r=await api('status',{kode:$('#sk').value.trim(),kontak:$('#sc').value.trim()});renderStatus(r)}
 if(id=='fu'){const file=$('#fl').files[0];if(!file)return toast('Pilih file bukti');if(file.size>5242880)return toast('Maks 5 MB');
  btn.disabled=true;const b64=await new Promise(ok=>{const R=new FileReader();R.onload=()=>ok(R.result.split(',')[1]);R.readAsDataURL(file)});
  const r=await api('upload',{kode:$('#sk').value.trim(),kontak:$('#sc').value.trim(),jumlah:$('#jm').value,mime:file.type,b64},true);
  toast(r.message);btn.disabled=false;if(r.success)$('#fs').requestSubmit()}
 if(id=='flogin'){const r=await api('login',{username:f.get('u'),password:f.get('p')},true);
  if(r.success){TOK=r.token;localStorage.setItem('tok',TOK);admin()}else toast(r.message)}});

// ---- STATUS ----
function renderStatus(r){if(!r.success)return $('#sr').innerHTML=`<div class="box no">${esc(r.message)}</div>`;
 const b=r.booking,y=r.bayar;$('#sr').innerHTML=`<div class="box"><div class="code">${esc(b.kode)}</div>
 <p><span class="tag">${esc(b.status)}</span> <span class="tag ${y.status_bayar=='Lunas'?'ok':''}">${y.status_bayar}</span></p>
 <p><b>${esc(r.mobil.merek)} ${esc(r.mobil.tipe)}</b> · ${esc(r.mobil.plat)}<br>${b.mulai} → ${b.selesai} (${b.hari} hari) · ${esc(r.nama)}</p>
 <p>Total <b>${rp(b.total)}</b> · Terbayar ${rp(y.sudah)} · Sisa <b>${rp(y.sisa)}</b></p>
 ${y.list.map(p=>`<p class="muted">${rp(p.jumlah)} — ${esc(p.verifikasi)}</p>`).join('')}</div>
 ${y.sisa>0&&!['Ditolak','Batal'].includes(b.status)?`<form id="fu" class="box"><h3>Unggah Bukti Pembayaran</h3><input id="jm" type="number" placeholder="Jumlah dibayar (Rp)" value="${y.sisa}" required>
 <input id="fl" type="file" accept="image/jpeg,image/png,application/pdf"><button class="btn">Kirim Bukti</button><p class="muted">JPG/PNG/PDF, maks 5 MB</p></form>`:''}`}

// ---- ADMIN ----
async function admin(){const v=$('#adm');
 if(!TOK)return v.innerHTML=`<form id="flogin" class="box" style="max-width:400px;margin:auto"><h2>Login Staf</h2><input name="u" placeholder="Username" required><input name="p" type="password" placeholder="Sandi" required><button class="btn">Masuk</button></form>`;
 const r=await api('adminList',{token:TOK},true);
 if(!r.success){TOK=null;localStorage.removeItem('tok');toast(r.message);return admin()}
 const act=b=>({Menunggu:[['Disetujui','Setujui','g'],['Ditolak','Tolak','r']],Disetujui:[['Berjalan','Mulai Sewa','g']],Berjalan:[['Selesai','Selesai','g']]}[b.status]||[])
  .map(([s,l,c])=>`<button class="btn ${c}" data-a="st" data-k="${b.kode}" data-v="${s}">${l}</button>`).join(' ');
 v.innerHTML=`<div style="display:flex;justify-content:space-between"><h2>Booking</h2><button class="btn s" data-a="out">Keluar</button></div>
 <div class="panel tw"><table><tr><th>Kode</th><th>Pelanggan</th><th>Mobil</th><th>Tanggal</th><th>Total</th><th>Bayar</th><th>Status</th><th>Aksi</th></tr>
 ${r.bookings.map(b=>`<tr><td>${esc(b.kode)}</td><td>${esc(b.nama)}<br><small>${esc(b.hp)}</small></td><td>${esc(b.mobil)}<br><small>${esc(b.plat)}</small></td><td>${b.mulai} → ${b.selesai}</td>
 <td>${rp(b.total)}</td><td>${esc(b.status_bayar)}<br><small>${rp(b.sudah)}</small></td><td><span class="tag">${esc(b.status)}</span></td><td>${act(b)}</td></tr>`).join('')}</table></div>
 <h2>Verifikasi Pembayaran (${r.pending.length})</h2><div class="panel tw"><table>${r.pending.map(p=>`<tr><td>${esc(p.kode)}</td><td>${rp(p.jumlah)}</td>
 <td><a href="${esc(p.bukti_url)}" target="_blank" rel="noopener">Lihat bukti</a></td><td><button class="btn g" data-a="vf" data-k="${p.id}" data-v="1">Valid</button>
 <button class="btn r" data-a="vf" data-k="${p.id}" data-v="0">Tolak</button></td></tr>`).join('')||'<tr><td class="empty">Tidak ada antrean</td></tr>'}</table></div>`}

document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
 if(a=='pick')openBook(b.dataset.id);
 if(a=='x')$('#modal').hidden=true;
 if(a=='out'){TOK=null;localStorage.removeItem('tok');admin()}
 if(a=='st'){b.disabled=true;const r=await api('adminSet',{token:TOK,kode:b.dataset.k,status:b.dataset.v},true);r.success?admin():toast(r.message)}
 if(a=='vf'){b.disabled=true;const r=await api('adminVerif',{token:TOK,id:b.dataset.k,valid:b.dataset.v},true);r.success?admin():toast(r.message)}});

// ---- INIT: render cache dulu (instan), refresh di latar belakang ----
renderKat();nav();load();
