const API = 'https://mental-health-score-8u11.onrender.com';
const $ = id => document.getElementById(id);

/* ---------- 3D background ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({canvas:$('bg'), antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0c0517, 0.04);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.z = 10;

scene.add(new THREE.AmbientLight(0x6d4bb5, 0.8));
const l1 = new THREE.PointLight(0xc084fc, 2.2, 40); l1.position.set(6, 5, 6); scene.add(l1);
const l2 = new THREE.PointLight(0xf0abfc, 1.6, 40); l2.position.set(-7, -4, 4); scene.add(l2);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.7, 1),
  new THREE.MeshStandardMaterial({color:0x7c3aed, metalness:.65, roughness:.25, flatShading:true, emissive:0x2e1065}));
const wire = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.5, 2),
  new THREE.MeshBasicMaterial({color:0xc4b5fd, wireframe:true, transparent:true, opacity:.2}));
const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, .03, 8, 220), new THREE.MeshBasicMaterial({color:0xe879f9}));
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.1, .02, 8, 220), new THREE.MeshBasicMaterial({color:0xa78bfa, transparent:true, opacity:.6}));
ring.rotation.x = 1.25; ring2.rotation.set(.5, 1, 0);
const hero = new THREE.Group(); hero.add(core, wire, ring, ring2); scene.add(hero);

const orbs = [];
[[-7,3,-2,.9],[7,-3,-3,1.2],[-5,-4.5,-1,.6],[6,4.5,-4,.7],[0,6,-6,1]].forEach(([x,y,z,s],i)=>{
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s,1),
    new THREE.MeshStandardMaterial({color:i%2?0xd946ef:0x8b5cf6, metalness:.5, roughness:.3, flatShading:true, emissive:0x2a0b50}));
  m.position.set(x,y,z); m.userData = {y0:y, ph:i*1.7}; scene.add(m); orbs.push(m);
});

const N = 700, pos = new Float32Array(N*3);
for(let i=0;i<N*3;i++) pos[i] = (Math.random()-.5)*28;
const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos,3));
const stars = new THREE.Points(pg, new THREE.PointsMaterial({color:0xd8b4fe, size:.045, transparent:true, opacity:.8}));
scene.add(stars);

let mx = 0, my = 0, pulse = 0;
addEventListener('pointermove', e => { mx = e.clientX/innerWidth - .5; my = e.clientY/innerHeight - .5; });
function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  hero.scale.setScalar(innerWidth < 900 ? .7 : 1);
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
(function loop(){
  const t = clock.getElapsedTime(), k = reduce ? .15 : 1;
  pulse *= .96;
  core.rotation.y = t*.35*k + pulse*2; core.rotation.x = t*.2*k;
  wire.rotation.y = -t*.15*k; wire.rotation.z = t*.1*k;
  ring.rotation.z = t*.3*k; ring2.rotation.z = -t*.2*k;
  core.scale.setScalar(1 + pulse*.35); wire.scale.setScalar(1 + pulse*.2);
  orbs.forEach(o => { o.position.y = o.userData.y0 + Math.sin(t*.6*k + o.userData.ph)*.6; o.rotation.x = t*.25*k; o.rotation.y = t*.2*k; });
  stars.rotation.y = t*.015*k;
  camera.position.x += (mx*2.2 - camera.position.x)*.04;
  camera.position.y += (-my*1.6 - camera.position.y)*.04;
  camera.lookAt(0,0,0);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();

/* ---------- UI ---------- */
[['usage','usageO'],['study','studyO'],['activity','activityO'],['sleep','sleepO']].forEach(([i,o])=>{
  const el = $(i), out = $(o);
  const upd = () => out.textContent = el.value + ' h';
  el.addEventListener('input', upd); upd();
});

// tilt the result card
const rc = $('result');
rc.addEventListener('pointermove', e => {
  if(reduce) return;
  const r = rc.getBoundingClientRect();
  const x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5;
  rc.style.transform = `perspective(900px) rotateY(${x*14}deg) rotateX(${-y*14}deg)`;
});
rc.addEventListener('pointerleave', () => rc.style.transform = '');

async function checkServer(){
  const s = $('status'); s.className = 'glass status'; $('statusText').textContent = 'Checking server…';
  try{
    const r = await fetch(API + '/'); if(!r.ok) throw 0;
    s.classList.add('ok'); $('statusText').textContent = 'Model server connected';
  }catch{
    s.classList.add('bad'); $('statusText').textContent = 'Server offline · click to retry';
  }
}
$('status').addEventListener('click', checkServer); checkServer();

function verdict(s){
  if(s >= 7.5) return ['Healthy range', 'Habits look balanced. Keep sleep and activity steady.'];
  if(s >= 6)   return ['Moderate range', 'Some strain is showing. Less screen time and more sleep usually help.'];
  return ['Under strain', 'Habits point to a lower score. Cut late-night use and add rest and movement.'];
}
function countUp(el, to){
  if(reduce){ el.textContent = to.toFixed(2); return; }
  const t0 = performance.now();
  (function step(now){
    const p = Math.min((now - t0)/1200, 1), e = 1 - Math.pow(1-p, 3);
    el.textContent = (to*e).toFixed(2);
    if(p < 1) requestAnimationFrame(step);
  })(t0);
}
function show(score){
  const C = 578, pct = Math.max(0, Math.min(score/10, 1));
  $('bar').style.strokeDashoffset = C*(1 - pct);
  countUp($('score'), score);
  const [v, n] = verdict(score);
  $('verdict').textContent = v; $('note').textContent = n;
  core.material.color.set(new THREE.Color(0xf0abfc).lerp(new THREE.Color(0x7c3aed), pct));
  pulse = 1;
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('err'), btn = $('go'); err.textContent = '';
  const payload = {
    age: parseInt($('age').value, 10),
    gender: document.querySelector('[name=gender]:checked').value,
    country: $('country').value.trim(),
    academic_level: $('academic').value,
    most_used_platform: $('platform').value,
    purpose_of_use: $('purpose').value,
    avg_daily_usage_hours: parseFloat($('usage').value),
    daily_unlocks: parseInt($('unlocks').value, 10),
    study_hours: parseFloat($('study').value),
    physical_activity_hours: parseFloat($('activity').value),
    sleep_hours_per_night: parseFloat($('sleep').value),
    stress_level: document.querySelector('[name=stress]:checked').value
  };
  btn.disabled = true; btn.textContent = 'Predicting…';
  try{
    const r = await fetch(API + '/predict', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!r.ok){
      const d = await r.json().catch(()=>null);
      const m = d && Array.isArray(d.detail) ? d.detail.map(x => (x.loc||[]).slice(-1)[0] + ': ' + x.msg).join(' · ') : 'Server error ' + r.status;
      throw new Error(m);
    }
    const data = await r.json();
    show(data.predicted_mental_health_score);
    $('status').className = 'glass status ok'; $('statusText').textContent = 'Model server connected';
  }catch(ex){
    err.textContent = ex instanceof TypeError
      ? 'Cannot reach ' + API + '. Start the server with: uvicorn main:app --port 2300'
      : ex.message;
    if(ex instanceof TypeError){ $('status').className = 'glass status bad'; $('statusText').textContent = 'Server offline · click to retry'; }
  }finally{
    btn.disabled = false; btn.textContent = 'Predict score';
  }
});

/* country: clear on focus so the full list shows and typing works; restore on blur if left empty */
(() => {
  const c = $('country');
  c.addEventListener('focus', () => { c.dataset.prev = c.value; c.value = ''; });
  c.addEventListener('blur', () => { if(!c.value.trim()) c.value = c.dataset.prev || ''; });
})();
