/* ==========================================================================
   PERF BUDGET - how this holds 60fps on integrated graphics
   --------------------------------------------------------------------------
   1. 3 draw calls: one InstancedMesh (216 octahedra = 1,728 tris), one merged
      LineSegments for the edges, one Points field. Nothing else is drawn.
   2. No lights / no shadow maps / no post-processing. MeshBasicMaterial and
      LineBasicMaterial only, so the fragment cost is close to zero.
   3. RENDER ON DEMAND. rAF runs only while the smoothed scroll value is still
      converging (or, high tier only, while the idle rotation is on). Stop
      scrolling on the low tier and the GPU goes completely quiet.
   4. Pixel ratio capped at 1.5 desktop / 1.0 small screens.
   5. Scroll is read from a passive listener into a variable; the actual
      camera maths happens once per rendered frame, never per scroll event.
   6. Loop stops on tab hide (visibilitychange).
   7. Low tier: 4x4x4 lattice instead of 6x6x6, no idle rotation, no depth
      point field, antialias off.
   8. Reduced motion / Save-Data: the camera never moves. One still frame is
      drawn at the hero viewpoint and the page scrolls like a normal document.
   Press "d" for a live frame-time / draw-call readout.
   ========================================================================== */

const THREE_URL = '/assets/vendor/three.module.min.js';

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqSmall  = window.matchMedia('(max-width: 720px)');
const modeEl   = document.getElementById('mode');
/* The live page has no status readout. Every write goes through this so a
   missing #mode is a no-op instead of a TypeError that kills the backdrop. */
const setMode  = (t) => { if(modeEl) modeEl.textContent = t; };

/* three r163+ dropped WebGL1 entirely, so WebGL2 is the real requirement. */
function hasWebGL(){
  try{
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  }catch(e){ return false; }
}
const savingData = () => !!(navigator.connection && navigator.connection.saveData === true);
function motionPref(){
  const s = localStorage.getItem('sample2-motion');
  if(s === 'off') return false;
  if(s === 'on')  return true;
  return !mqReduce.matches;
}
function tier(){
  const cores = navigator.hardwareConcurrency || 8;
  const mem   = navigator.deviceMemory || 8;
  return (mqSmall.matches || cores <= 4 || mem <= 4) ? 'low' : 'high';
}

/* ---------- motion toggle ---------- */
const toggleBtn = document.getElementById('motion-toggle');
if(!toggleBtn){ /* control is optional; motion still respects the OS setting */ }
function paintToggle(){
  const s = localStorage.getItem('sample2-motion');
  if(toggleBtn) toggleBtn.textContent = s === 'off' ? 'Motion: off' : s === 'on' ? 'Motion: on' : 'Motion: auto';
  if(toggleBtn) toggleBtn.setAttribute('aria-pressed', String(motionPref()));
}
toggleBtn && toggleBtn.addEventListener('click', () => {
  const s = localStorage.getItem('sample2-motion');
  const next = s === 'off' ? 'on' : s === 'on' ? '' : 'off';
  if(next) localStorage.setItem('sample2-motion', next); else localStorage.removeItem('sample2-motion');
  paintToggle(); location.reload();
});
paintToggle();

const fpsEl = document.getElementById('fps') || document.createElement('div');
addEventListener('keydown', e => {
  if(e.key === 'd' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) fpsEl.classList.toggle('on');
});

/* SHA-138: a sectionObserver used to live here. It was dead code carried over
   from the 3D sample page — it queried `.rail a` and `.navlinks a`, neither of
   which exists on this site (the real nav is `.nav-links`, hyphenated, and
   there is no rail at all). Both Maps were always empty, so it set aria-current
   on nothing on every scroll.

   Deleted rather than repointed: script.js already runs a working scroll-spy
   over `.nav-links a` that toggles `.is-active`, and `.nav-links a.is-active`
   is already styled. Two scroll-spies for one nav is the bug, not the fix. */

/* ---------- boot ---------- */
if(!hasWebGL() || savingData()){
  setMode(savingData() ? 'data-saver - static backdrop' : 'no webgl - static backdrop');
}else{
  boot().catch(err => {
    console.warn('[sample-2] 3D layer unavailable, static backdrop in use:', err && err.message);
    setMode('static backdrop');
  });
}

async function boot(){
  const THREE = await import(THREE_URL);

  const canvas  = document.getElementById('gl');
  const animate = motionPref();
  const lvl     = tier();

  const cfg = lvl === 'low'
    ? { n: 4, dpr: 1.0, aa: false, dust: 0,   idleSpin: 0 }
    : { n: 6, dpr: 1.5, aa: true,  dust: 320, idleSpin: 0.05 };

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: cfg.aa, alpha: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false
  });
  renderer.setClearColor(0x090c12, 1);

  const scene  = new THREE.Scene();
  scene.fog    = new THREE.FogExp2(0x090c12, 0.16);   // free depth cue, no cost
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60);

  let dprCap = cfg.dpr;
  function applySize(){
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const world = new THREE.Group();
  scene.add(world);

  /* ============ 1. lattice nodes - ONE InstancedMesh ============ */
  const N = cfg.n, SPAN = 2.0, step = SPAN / (N - 1);
  const nodeGeo = new THREE.OctahedronGeometry(0.028, 0);      // 8 tris each
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xf1efe7, toneMapped: false });
  const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, N * N * N);
  nodes.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  const at = (i, j, k) => new THREE.Vector3(-SPAN/2 + i*step, -SPAN/2 + j*step, -SPAN/2 + k*step);
  let idx = 0;
  for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) for(let k = 0; k < N; k++){
    const p = at(i, j, k);
    // corner nodes read brighter - gives the polytope a readable silhouette
    const edgeness = ((i===0||i===N-1) + (j===0||j===N-1) + (k===0||k===N-1)) / 3;
    const s = 0.6 + edgeness * 0.9;
    m4.makeScale(s, s, s); m4.setPosition(p);
    nodes.setMatrixAt(idx, m4);
    col.setHSL(0.60, 0.06, 0.32 + edgeness * 0.50);
    nodes.setColorAt(idx, col);
    idx++;
  }
  nodes.instanceMatrix.needsUpdate = true;
  if(nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
  nodes.matrixAutoUpdate = false; nodes.updateMatrix();
  world.add(nodes);

  /* ============ 2. lattice edges - ONE merged LineSegments ============ */
  const ev = [];
  for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) for(let k = 0; k < N; k++){
    const p = at(i, j, k);
    if(i < N-1){ const q = at(i+1,j,k); ev.push(p.x,p.y,p.z, q.x,q.y,q.z); }
    if(j < N-1){ const q = at(i,j+1,k); ev.push(p.x,p.y,p.z, q.x,q.y,q.z); }
    if(k < N-1){ const q = at(i,j,k+1); ev.push(p.x,p.y,p.z, q.x,q.y,q.z); }
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ev, 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
    color: 0x4b3fa0, transparent: true, opacity: 0.70, depthWrite: false, fog: true
  }));
  edges.matrixAutoUpdate = false; edges.updateMatrix();
  world.add(edges);

  /* ============ 3. sparse depth field (high tier only) ============ */
  let dust = null;
  if(cfg.dust > 0){
    const dp = new Float32Array(cfg.dust * 3);
    for(let i = 0; i < cfg.dust; i++){
      const r = 5 + Math.random() * 9, u = Math.random() * Math.PI * 2, v = Math.acos(2*Math.random()-1);
      dp[i*3]   = r * Math.sin(v) * Math.cos(u);
      dp[i*3+1] = r * Math.cos(v) * 0.55;
      dp[i*3+2] = r * Math.sin(v) * Math.sin(u);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({
      color: 0x8b7bf0, size: 0.03, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, fog: false
    }));
    dust.matrixAutoUpdate = false; dust.updateMatrix();
    scene.add(dust);
  }

  /* ============ camera path: one curve for eye, one for target ============ */
  const eyeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 0.0,   0.25,  4.90),  // hero  (well back - text has to win)
    new THREE.Vector3( 3.30,  1.05,  2.90),  // about
    new THREE.Vector3( 0.45, -2.10,  1.60),  // work  (dives under the lattice)
    new THREE.Vector3(-3.40,  0.75,  3.10),  // writing
    new THREE.Vector3( 0.0,   0.15,  5.90)   // contact
  ], false, 'catmullrom', 0.4);
  const aimCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 0, 0,    0),
    new THREE.Vector3(-.2, .05, 0),
    new THREE.Vector3( 0, .35,  0),
    new THREE.Vector3( .2, .05, 0),
    new THREE.Vector3( 0, 0,    0)
  ], false, 'catmullrom', 0.4);

  const eye = new THREE.Vector3(), aim = new THREE.Vector3();
  function placeCamera(u){
    eyeCurve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), eye);
    aimCurve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), aim);
    camera.position.copy(eye);
    camera.lookAt(aim);
  }

  /* ---------- scroll → target progress (passive, never does maths) ---------- */
  let targetU = 0, currentU = 0;
  function readScroll(){
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetU = Math.min(1, Math.max(0, window.scrollY / max));
  }
  addEventListener('scroll', () => { readScroll(); wake(); }, { passive: true });
  addEventListener('resize', () => { applySize(); readScroll(); wake(); });

  applySize();
  readScroll();
  currentU = targetU;
  placeCamera(currentU);
  document.body.classList.add('gl-live');
  setMode(animate ? (lvl === 'low' ? 'live · low · render-on-demand' : 'live · render-on-demand') : 'still frame');

  /* ---------- the on-demand loop ---------- */
  const clock = new THREE.Clock();
  let running = false, spin = 0, lastT = 0;
  const samples = []; let downgraded = false;

  function render(){ renderer.render(scene, camera); }

  function frame(){
    const dt = Math.min(clock.getDelta(), 0.05);

    // critically-damped-ish smoothing, frame-rate independent
    const k = 1 - Math.pow(0.0016, dt);
    currentU += (targetU - currentU) * k;
    const settled = Math.abs(targetU - currentU) < 0.00025;
    if(settled) currentU = targetU;

    if(cfg.idleSpin){ spin += dt * cfg.idleSpin; world.rotation.set(spin * 0.35, spin, 0); }
    placeCamera(currentU);
    render();

    if(!downgraded){
      samples.push(dt * 1000);
      if(samples.length === 90){
        const med = samples.slice().sort((a,b)=>a-b)[45];
        if(med > 20){
          dprCap = 1.0; cfg.idleSpin = 0; applySize();
          if(dust){ dust.visible = false; }
          setMode('live · reduced');
        }
        downgraded = true;
      }
    }
    if(fpsEl.classList.contains('on')){
      fpsEl.textContent =
        'frame  ' + (dt*1000).toFixed(1) + ' ms\n' +
        'fps    ' + (1/Math.max(dt,1e-4)).toFixed(0) + '\n' +
        'calls  ' + renderer.info.render.calls + '\n' +
        'tris   ' + renderer.info.render.triangles + '\n' +
        'u      ' + currentU.toFixed(3) + '\n' +
        'state  ' + (running ? 'running' : 'idle');
    }

    // The whole point: if nothing is moving, stop burning the GPU.
    if(settled && !cfg.idleSpin && !fpsEl.classList.contains('on')) sleep();
  }

  function wake(){
    if(!animate || running || document.hidden) return;
    running = true; clock.getDelta(); renderer.setAnimationLoop(frame);
  }
  function sleep(){
    if(!running) return;
    running = false; renderer.setAnimationLoop(null);
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? sleep() : wake(); });

  if(animate) wake(); else render();      // reduced motion → exactly one frame

  addEventListener('pagehide', () => {
    sleep();
    nodeGeo.dispose(); nodeMat.dispose(); edgeGeo.dispose(); edges.material.dispose();
    if(dust){ dust.geometry.dispose(); dust.material.dispose(); }
    renderer.dispose();
  });
}