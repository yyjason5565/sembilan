const $=id=>document.getElementById(id);
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([3.14,101.69],11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const ic=(h,s=30)=>L.divIcon({html:h,className:'mk',iconSize:[s,s],iconAnchor:[s/2,s/2]});
let me=null,meMk=null,speed=0,line=null,destMk=null,dest=null,destName='',R=null,steps=[],coords=[],driving=false,follow=true,rerouting=false,lastRR=0;
window.openM=id=>{$(id).style.display='flex'};window.closeM=()=>document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
map.on('dragstart',()=>follow=false);window.recenter=()=>{follow=true;me&&map.setView(me,driving?17:15)};
// Geolocation
navigator.geolocation?navigator.geolocation.watchPosition(onPos,e=>$('myloc').textContent='Lokasi tidak tersedia: '+e.message,{enableHighAccuracy:true,maximumAge:1000}):0;
function onPos(p){const prev=me;me=[p.coords.latitude,p.coords.longitude];speed=p.coords.speed!=null?p.coords.speed*3.6:(prev&&p.timestamp&&onPos.t?map.distance(prev,me)/((p.timestamp-onPos.t)/1000)*3.6:0);onPos.t=p.timestamp;
if(!meMk){meMk=L.marker(me,{icon:ic('<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:4px solid #fff;box-shadow:0 0 0 6px #3b82f655"></div>',22),zIndexOffset:1000}).addTo(map);map.setView(me,14)}else meMk.setLatLng(me);
$('myloc').textContent=`Lokasi: ${me[0].toFixed(5)}, ${me[1].toFixed(5)}`;if(driving)driveTick();checkAlerts()}
// Search
let tmr;$('q').oninput=()=>{clearTimeout(tmr);tmr=setTimeout(async()=>{const v=$('q').value;if(v.length<3)return $('res').innerHTML='';const vb=me?`&viewbox=${me[1]-1},${me[0]+1},${me[1]+1},${me[0]-1}`:'';
const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=my&limit=5${vb}&q=${encodeURIComponent(v)}`).then(r=>r.json()).catch(()=>[]);$('res').innerHTML='';
r.forEach(x=>{const d=document.createElement('div');d.textContent='📍 '+x.display_name;d.onclick=()=>{$('res').innerHTML='';$('q').value=x.display_name.split(',')[0];$('q').blur();planRoute([+x.lat,+x.lon],$('q').value)};$('res').appendChild(d)})},450)};
// Routing
const fmtT=s=>{const m=Math.round(s/60);return m>=60?Math.floor(m/60)+'j '+m%60+'m':m+' min'};const fmtD=m=>m>=1000?(m/1000).toFixed(1)+' km':Math.round(m/10)*10+' m';
async function osrm(from,to){const j=await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`).then(r=>r.json());if(j.code!='Ok')throw Error(j.code);return j.routes[0]}
function drawRoute(r){R=r;coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);steps=r.legs[0].steps;line&&map.removeLayer(line);line=L.polyline(coords,{color:'#7c3aed',weight:8,opacity:.85}).addTo(map)}
async function planRoute(to,name){dest=to;destName=name;const from=me||[3.1390,101.6869];$('sheet').style.display='block';$('dname').textContent='Ke '+name;$('dinfo').textContent='Mengira…';
try{const r=await osrm(from,to);drawRoute(r);destMk&&map.removeLayer(destMk);destMk=L.marker(to,{icon:ic('🏁')}).addTo(map);follow=false;map.fitBounds(line.getBounds(),{padding:[60,60]});
$('dinfo').textContent=`${fmtT(r.duration)} · ${fmtD(r.distance)}`+(me?'':' (dari KL)');const t=tollEstimate();$('dtoll').innerHTML=t?`🛣️ Tol anggaran ~<b>RM${t.rm}</b> (Kelas 1)<br><span class="muted">Plaza: ${t.plazas.join(', ')}</span>`:'<span class="muted">🛣️ Tiada plaza tol contoh di laluan</span>'}catch(e){$('dinfo').textContent='Gagal: '+e.message}}
window.clearRoute=()=>{line&&map.removeLayer(line);destMk&&map.removeLayer(destMk);line=destMk=R=null;$('sheet').style.display='none';$('q').value=''};
// Toll: sample PLUS plazas, approx RM/km
const TOLL=[{n:'Jitra',p:[6.26,100.42]},{n:'Juru',p:[5.33,100.44]},{n:'Ipoh Utara',p:[4.66,101.09]},{n:'Tapah',p:[4.19,101.26]},{n:'Rawang',p:[3.32,101.56]},{n:'Sungai Besi',p:[3.05,101.71]},{n:'Seremban',p:[2.73,101.93]},{n:'Ayer Keroh',p:[2.27,102.28]},{n:'Skudai',p:[1.54,103.66]}];
function tollEstimate(){const hit=TOLL.filter(t=>coords.some((c,i)=>i%5==0&&map.distance(c,t.p)<4000));if(!hit.length)return null;return{plazas:hit.map(t=>t.n),rm:Math.max(1,Math.round(R.distance/1000*0.105))}}
// Voice guidance (Web Speech API)
let muted=localStorage.getItem('sembilan_muted')=='1',voiceSel=null,spoken=new Set();
function pickVoice(){if(!('speechSynthesis'in window))return;const v=speechSynthesis.getVoices();voiceSel=v.find(x=>/^ms[-_]MY/i.test(x.lang))||v.find(x=>/^ms/i.test(x.lang))||v.find(x=>/^en[-_]US/i.test(x.lang))||v[0]||null}
if('speechSynthesis'in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function say(t,force){if(!('speechSynthesis'in window)||(muted&&!force))return;const u=new SpeechSynthesisUtterance(t);if(voiceSel){u.voice=voiceSel;u.lang=voiceSel.lang}else u.lang='ms-MY';u.rate=1;speechSynthesis.speak(u)}
function sayOnce(k,t){if(spoken.has(k))return;spoken.add(k);say(t)}
function plain(t){return t.replace(/[^\p{L}\p{N}\s\-,.]/gu,' ').replace(/\s+/g,' ').trim()}
function spD(m){return m>=1000?(m/1000).toFixed(1).replace('.0','')+' kilometer':Math.round(m/10)*10+' meter'}
function updMute(){const b=$('mutebtn');if(b)b.textContent=muted?'🔇':'🔊'}
window.toggleMute=()=>{muted=!muted;localStorage.setItem('sembilan_muted',muted?'1':'0');updMute();if(muted)speechSynthesis&&speechSynthesis.cancel();else say('Suara dihidupkan')};
// Drive mode
const AR={left:'⬅️','slight left':'↖️','sharp left':'↩️',right:'➡️','slight right':'↗️','sharp right':'↪️',straight:'⬆️',uturn:'🔄'};
function stepText(s){const m=s.maneuver,t=m.type,road=s.name||s.ref||'';const ar=AR[m.modifier]||'⬆️';
if(t=='arrive')return'🏁 Tiba di destinasi';if(t=='depart')return`⬆️ Mula${road?' di '+road:''}`;if(t=='roundabout'||t=='rotary')return`🔄 Bulatan, keluar ke-${m.exit||1}${road?' → '+road:''}`;
const v={turn:'Belok',fork:'Ikut simpang','on ramp':'Masuk susur','off ramp':'Keluar susur',merge:'Bergabung','end of road':'Hujung jalan, belok','new name':'Terus',continue:'Terus'}[t]||'Terus';
const dir={left:'kiri','slight left':'sedikit kiri','sharp left':'tajam kiri',right:'kanan','slight right':'sedikit kanan','sharp right':'tajam kanan',straight:'',uturn:'pusing U'}[m.modifier]||'';return`${ar} ${v} ${dir}${road?' ke '+road:''}`}
window.startDrive=()=>{if(!R)return;if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}spoken=new Set();updMute();say('Memulakan navigasi ke '+destName+'. '+plain(stepText(steps[0]))+(steps[1]?'. Kemudian '+plain(stepText(steps[1])):''));driving=true;follow=true;$('sheet').style.display='none';$('search').style.display='none';$('banner').style.display='block';$('drivebar').style.display='flex';if(!me)alert('Lokasi GPS tidak tersedia — mod pemanduan perlukan GPS.');driveTick()};
window.stopDrive=()=>{driving=false;'speechSynthesis'in window&&speechSynthesis.cancel();$('banner').style.display='none';$('drivebar').style.display='none';$('search').style.display='block';clearRoute()};
function nearestIdx(p){let b=0,bd=1e12;for(let i=0;i<coords.length;i++){const d=map.distance(p,coords[i]);if(d<bd){bd=d;b=i}}return[b,bd]}
async function driveTick(){$('speed').innerHTML=`${Math.round(speed||0)}<small>km/j</small>`;if(!me||!R)return;if(follow)map.setView(me,17,{animate:true});
const[idx,off]=nearestIdx(me);
if(off>60&&!rerouting&&Date.now()-lastRR>10000){rerouting=true;lastRR=Date.now();$('ins').textContent='🔁 Mengira semula laluan…';say('Mengira semula laluan');try{drawRoute(await osrm(me,dest));spoken=new Set(['arr']);say('Laluan baharu dikira')}catch(e){}rerouting=false;return}
let rem=0;for(let i=idx;i<coords.length-1;i++)rem+=map.distance(coords[i],coords[i+1]);
if(rem<40){$('ins').textContent='🏁 Anda telah tiba!';$('insd').textContent=destName;$('eta').textContent='Tiba';sayOnce('arr','Anda telah tiba di destinasi, '+destName);return}
// next step: first step whose maneuver location is ahead of idx
let next=steps[steps.length-1],nd=0;for(const s of steps.slice(1)){const [si]=nearestIdx([s.maneuver.location[1],s.maneuver.location[0]]);if(si>idx){next=s;nd=0;for(let i=idx;i<si;i++)nd+=map.distance(coords[i],coords[i+1]);break}}
$('ins').textContent=stepText(next);{const k=next.maneuver.location.join(',');const tx=plain(stepText(next));if(nd<=70)sayOnce(k+'@50',next.maneuver.type=='arrive'?'Destinasi di hadapan':'Sekarang, '+tx);else if(nd<=550&&nd>=150)sayOnce(k+'@500','Dalam '+spD(nd)+', '+tx)}$('insd').textContent='dalam '+fmtD(nd);
const eta=R.duration*(rem/R.distance);const at=new Date(Date.now()+eta*1000);$('eta').textContent=at.toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit'});$('rem').textContent=`${fmtT(eta)} · ${fmtD(rem)} lagi`}
// Reports
const TYPES={accident:['💥','Kemalangan','#ef4444'],jam:['🚗','Kesesakan','#f97316'],police:['👮','Polis','#3b82f6'],hazard:['⚠️','Bahaya','#eab308'],flood:['🌊','Banjir','#0ea5e9'],closure:['⛔','Jalan Ditutup','#6b7280']};
Object.entries(TYPES).forEach(([k,[e,n,c]])=>$('repgrid').insertAdjacentHTML('beforeend',`<button class="rep" style="background:${c}" onclick="report('${k}')"><b>${e}</b>${n}</button>`));
const load=()=>JSON.parse(localStorage.getItem('sem_rep')||'[]'),save=l=>localStorage.setItem('sem_rep',JSON.stringify(l));
const ago=ts=>{const m=Math.floor((Date.now()-ts)/60000);return m<1?'baru':m<60?m+' min':Math.floor(m/60)+' j'};
const repLayer=L.layerGroup().addTo(map);
function drawReps(){repLayer.clearLayers();let l=load().filter(r=>r.down<3&&Date.now()-r.ts<6*3600e3);save(l);
l.forEach(r=>{const[e,n]=TYPES[r.type];L.marker(r.p,{icon:ic(`${e}<span>${ago(r.ts)}</span>`,34)}).addTo(repLayer).bindPopup(`<b>${e} ${n}</b><br>Dilaporkan ${ago(r.ts)} lalu<br>👍 ${r.up} · 👎 ${r.down}<div class="vote"><button style="background:#dcfce7" onclick="vote('${r.id}',1)">👍 Masih ada</button><button style="background:#fee2e2" onclick="vote('${r.id}',0)">👎 Tiada lagi</button></div>`)})}
window.report=k=>{const c=map.getCenter(),p=me||[c.lat,c.lng];const l=load();l.push({id:Math.random().toString(36).slice(2),type:k,p,ts:Date.now(),up:0,down:0});save(l);closeM();drawReps();toast(`${TYPES[k][0]} Terima kasih! Laporan dihantar`+(me?'':' (tengah peta)'))};
window.vote=(id,up)=>{const l=load(),r=l.find(x=>x.id==id);if(!r)return;up?(r.up++,r.ts=Date.now()):r.down++;save(l);map.closePopup();drawReps();toast(up?'👍 Terima kasih!':'👎 Dikemas kini')};
setInterval(drawReps,60000);drawReps();
const alerted=new Set();function checkAlerts(){if(!me)return;load().forEach(r=>{const d=map.distance(me,r.p);if(d<800&&!alerted.has(r.id)){alerted.add(r.id);const[e,n]=TYPES[r.type];toast(`${e} ${n} di hadapan · ${fmtD(d)}`,5000);say(`${n} dilaporkan di hadapan, ${spD(d)}`);navigator.vibrate&&navigator.vibrate([200,100,200])}})}
function toast(t,ms=2500){const a=$('alert');a.textContent=t;a.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>a.style.display='none',ms)}
// R&R sample data
const RR=[{n:'R&R Sungai Buloh',h:'PLUS E1',p:[3.2135,101.5703],f:['Surau','Tandas','Makanan','Minyak','EV']},{n:'R&R Seremban',h:'PLUS E2',p:[2.7690,101.9105],f:['Surau','Tandas','Makanan','Minyak','EV']},{n:'R&R Ayer Keroh',h:'PLUS E2',p:[2.2725,102.2856],f:['Surau','Tandas','Makanan','Minyak','EV']},{n:'R&R Tapah',h:'PLUS E1',p:[4.1745,101.2390],f:['Surau','Tandas','Makanan','Minyak','EV']},{n:'R&R Gunung Semanggol',h:'PLUS E1',p:[4.9590,100.6450],f:['Surau','Tandas','Makanan','Minyak']},{n:'R&R Pagoh',h:'PLUS E2',p:[2.1500,102.7700],f:['Surau','Tandas','Makanan','Minyak','EV']}];
const FI={Surau:'🕌',Tandas:'🚻',Makanan:'🍛',Minyak:'⛽',EV:'🔌'};
RR.forEach((r,i)=>{L.marker(r.p,{icon:ic('☕',26)}).addTo(map).bindPopup(`<b>${r.n}</b> (${r.h})<br>${r.f.map(x=>FI[x]+' '+x).join(' · ')}<br><i>Data contoh</i>`);
$('rrlist').insertAdjacentHTML('beforeend',`<div class="card"><b>${r.n}</b> <span class="muted">${r.h}</span><br>${r.f.map(x=>`<span class="tag">${FI[x]} ${x}</span>`).join('')}<br><button class="btn" style="background:#7c3aed;color:#fff;padding:8px 14px;margin-top:6px" onclick="closeM();planRoute(RR[${i}].p,RR[${i}].n)">Navigasi</button></div>`)});
window.RR=RR;
window.shareLoc=()=>{if(!me)return alert('Lokasi tidak tersedia');const u=`https://maps.google.com/?q=${me[0]},${me[1]}`;navigator.share?navigator.share({title:'Lokasi saya (SOS)',url:u}):prompt('Salin:',u)};
