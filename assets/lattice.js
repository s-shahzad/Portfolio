/* ==========================================================================
   PERF BUDGET - how this holds 60fps on integrated graphics
   --------------------------------------------------------------------------
   1. 3 draw calls: one InstancedMesh (216 octahedra = 1,728 tris), one merged
      LineSegments for the edges, one Points field. Nothing else is drawn.
   2. No lights / no shadow maps / no post-processing. MeshBasicMaterial and
      LineBasicMaterial only, so the fragment cost is close to zero.
   3. RENDER ON DEMAND, on every tier. rAF runs while the smoothed scroll value
      is still converging, and for IDLE_SPIN_MS after the last interaction so
      the idle rotation has somewhere to go. After that the loop suspends and
      the GPU goes completely quiet until the next scroll or pointer event.
   4. Pixel ratio capped at 1.5.
   5. Scroll is read from a passive listener into a variable; the actual
      camera maths happens once per rendered frame, never per scroll event.
   6. Loop stops on tab hide (visibilitychange) and on WebGL context loss.
   7. Weak devices (small screens, few cores, little memory) never load the
      3D layer at all - three.js is 691KB and the CSS gradient backdrop in
      lattice.css is what they get instead. The import is gated on the tier.
   8. Reduced motion / Save-Data / prefers-reduced-data: the camera never
      moves. One still frame is drawn and the page scrolls like a document.
   ========================================================================== */

const THREE_URL = '/assets/vendor/three.module.min.js';

/* SHA-162 #36: the prototype this grew out of stored its preference under a
   sample-page key. Renamed to a name that belongs to this site. There is no
   migration on purpose - a stale preference is not worth carrying a dead
   identifier into production for. */
const MOTION_KEY = 'portfolio-motion';

/* SHA-135: how long the idle rotation is allowed to keep the render loop
   alive after the last interaction. The loop used to run forever on the high
   tier because the sleep path was gated on `!cfg.idleSpin`. */
const IDLE_SPIN_MS = 5000;

/* Frame-time sampling for the auto-downgrade (SHA-162 #34). The first frames
   after boot include load jank, so they are thrown away before any judgement
   is made, and each window is judged on its own instead of one early verdict
   being latched for the whole session. */
const WARMUP_FRAMES = 45;
const WINDOW_FRAMES = 90;

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqSmall  = window.matchMedia('(max-width: 720px)');
/* SHA-167 #42: navigator.connection.saveData is Chromium-only. The media
   query is the standards-track spelling; browsers that do not know it simply
   report matches:false, so this is safe to ask everywhere. */
const mqData   = window.matchMedia('(prefers-reduced-data: reduce)');

/* three r163+ dropped WebGL1 entirely, so WebGL2 is the real requirement. */
function hasWebGL(){
  try{
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  }catch(e){ return false; }
}
const savingData = () =>
  mqData.matches || !!(navigator.connection && navigator.connection.saveData === true);

function motionState(){
  const s = localStorage.getItem(MOTION_KEY);
  return s === 'off' ? 'off' : s === 'on' ? 'on' : 'auto';
}
function motionPref(){
  const s = motionState();
  if(s === 'off') return false;
  if(s === 'on')  return true;
  return !mqReduce.matches;
}

/* SHA-162 #33: navigator.deviceMemory is Chromium-only. Defaulting it to 8
   handed every Firefox and Safari visitor the high tier regardless of the
   hardware underneath. Missing signals are now treated as missing rather
   than as a pass: with no memory reading the core count has to clear a
   higher bar on its own, and a device that reports nothing gets the low
   tier. The frame-time sampler below is the second line of defence. */
function tier(){
  if(mqSmall.matches) return 'low';
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;
  const mem   = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null;
  if(cores !== null && cores <= 4) return 'low';
  if(mem   !== null && mem   <= 4) return 'low';
  if(mem === null) return (cores !== null && cores >= 8) ? 'high' : 'low';
  return 'high';
}

/* ---------- motion toggle ---------- */
const toggleBtn = document.getElementById('motion-toggle');
/* The live backdrop's control surface, or null while the static fallback is
   showing. SHA-148 needs this so the toggle can act on a running loop
   instead of reloading the document. */
let backdrop = null;

function paintToggle(){
  if(!toggleBtn) return;
  const state = motionState();
  toggleBtn.textContent = 'Motion: ' + state;
  /* SHA-162 #35: aria-pressed is a two-state attribute on a three-state
     control, so a screen reader announced "pressed: true" for both "on" and
     "auto". Name the state in the accessible name instead. The visible text
     is a prefix of that name, so label-in-name still holds. */
  toggleBtn.removeAttribute('aria-pressed');
  toggleBtn.setAttribute(
    'aria-label',
    'Motion: ' + state + '. Activate to cycle background motion between auto, off and on.'
  );
}
toggleBtn && toggleBtn.addEventListener('click', () => {
  const next = motionState() === 'auto' ? 'off' : motionState() === 'off' ? 'on' : '';
  if(next) localStorage.setItem(MOTION_KEY, next); else localStorage.removeItem(MOTION_KEY);
  paintToggle();
  /* SHA-148: apply the setting in place. This used to call location.reload(),
     which threw away the visitor's scroll position and re-downloaded the whole
     page to change a background. */
  if(backdrop) backdrop.setMotion(motionPref());
});
paintToggle();

/* SHA-138: a sectionObserver used to live here. It was dead code carried over
   from the 3D prototype - it queried two nav selectors that do not exist on
   this site, so both of its Maps were always empty and it set aria-current on
   nothing on every scroll.

   Deleted rather than repointed: script.js already runs a working scroll-spy
   over the real nav that toggles `.is-active`, and that state is already
   styled. Two scroll-spies for one nav is the bug, not the fix. */

/* ---------- boot ---------- */
/* SHA-147: three.js is 691KB raw / 160KB gzipped and was the slowest resource
   on the page at 1,017ms. It is now imported only when the visitor is going
   to get something worth 691KB out of it. Everyone else keeps the CSS
   gradient backdrop, which is what `#bg::before` draws whenever <body> does
   not carry `.gl-live`. */
let booting = false;

function eligible(){
  return hasWebGL() && !savingData() && tier() === 'high';
}

function start(){
  if(backdrop || booting || !eligible()) return;
  booting = true;
  boot()
    .then(api => { backdrop = api; })
    .catch(err => {
      console.warn('[lattice] 3D layer unavailable, static backdrop in use:', err && err.message);
    })
    .finally(() => { booting = false; });
}

/* SHA-167 #40: these queries were read once at load and never listened to, so
   rotating a tablet or flipping the OS reduced-motion switch mid-session did
   nothing until a reload. */
const onMq = (mq, fn) => mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn);
onMq(mqSmall,  () => { if(backdrop){ if(tier() === 'low') backdrop.reduce(); } else start(); });
onMq(mqReduce, () => { if(backdrop) backdrop.setMotion(motionPref()); });
onMq(mqData,   () => { if(backdrop && savingData()) backdrop.setMotion(false); });

start();

async function boot(){
  const THREE = await import(THREE_URL);

  const canvas = document.getElementById('gl');
  if(!canvas) throw new Error('no #gl canvas in the document');

  let animate = motionPref();
  const cfg = { n: 6, dpr: 1.5, aa: true, dust: 320, idleSpin: 0.05 };

  /* SHA-167 #39: the --lattice-* custom properties in lattice.css were
     defined and never read, because every colour was hardcoded here. The
     stylesheet is now the source of truth and these are the fallbacks for
     when it has not applied. */
  const css = getComputedStyle(document.documentElement);
  const hex = (name, fallback) => {
    const v = css.getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? parseInt(v.slice(1), 16) : fallback;
  };
  const COLOR = {
    node: hex('--lattice-node', 0xf1efe7),
    edge: hex('--lattice-edge', 0x4b3fa0),
    dust: hex('--lattice-dust', 0x8b7bf0),
    back: hex('--lattice-void', 0x090c12)
  };

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: cfg.aa, alpha: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false
  });
  renderer.setClearColor(COLOR.back, 1);

  const scene  = new THREE.Scene();
  scene.fog    = new THREE.FogExp2(COLOR.back, 0.16);  // free depth cue, no cost
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60);

  let dprCap = cfg.dpr;
  function applySize(){
    /* SHA-167 #28: this used window.innerWidth, which includes the classic
       scrollbar gutter, while the canvas box is laid out inside the viewport
       without it - about 1% of horizontal stretch wherever a scrollbar
       exists. Measure the element that is actually being painted. */
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
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
  const nodeMat = new THREE.MeshBasicMaterial({ color: COLOR.node, toneMapped: false });
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
    color: COLOR.edge, transparent: true, opacity: 0.70, depthWrite: false, fog: true
  }));
  edges.matrixAutoUpdate = false; edges.updateMatrix();
  world.add(edges);

  /* ============ 3. sparse depth field ============ */
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
      color: COLOR.dust, size: 0.03, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, fog: false
    }));
    dust.matrixAutoUpdate = false; dust.updateMatrix();
    scene.add(dust);
  }

  /* ============ camera path: one curve for eye, one for target ============
     SHA-162 #38: the old path had five waypoints tuned to a five-section
     prototype, and one of them ("work") dived to 2.6 units from the origin -
     inside a lattice whose half-diagonal is 1.73, so the camera was sitting
     in the middle of the thing it was meant to be showing. Stretched over a
     document of roughly 19,000px that left the backdrop reading as flat black
     for most scroll positions.

     The replacement is a closed orbit. The waypoints sit 5.3-6.0 units out and
     the interpolated curve never comes closer than 4.52, which is past the
     4.08 the 46-degree vertical frustum needs to hold the whole lattice —
     sampled at 4,000 points, the tightest framing slack is +0.04 units once
     the aim curve's off-axis wander is subtracted. Fog visibility at the far
     face of the lattice bottoms out at 21%, the same as the old path's 22%,
     so nothing has been pushed back into the murk. Closing the loop means the
     bottom of the document arrives back at the hero viewpoint instead of
     stranding the camera somewhere arbitrary. */
  const eyeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 0.00,  0.32,  5.70),  // hero - well back, text has to win
    new THREE.Vector3( 3.60,  1.22,  4.65),  // swings right and rises
    new THREE.Vector3( 5.20, -0.70,  1.05),  // side-on, below the equator
    new THREE.Vector3( 1.45, -1.85, -4.95),  // behind and under
    new THREE.Vector3(-3.90,  0.95, -3.90),  // behind left, climbing
    new THREE.Vector3(-4.95,  1.35,  2.60)   // round the left and back to hero
  ], true, 'catmullrom', 0.4);
  /* Small deliberate wander so the lattice is not pinned dead-centre; kept
     under 0.16 units because that is what the framing slack above can absorb. */
  const aimCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3( 0.00,  0.00, 0),
    new THREE.Vector3(-0.12,  0.06, 0),
    new THREE.Vector3(-0.10,  0.15, 0),
    new THREE.Vector3( 0.06,  0.12, 0),
    new THREE.Vector3( 0.12,  0.03, 0),
    new THREE.Vector3( 0.06, -0.04, 0)
  ], true, 'catmullrom', 0.4);

  const eye = new THREE.Vector3(), aim = new THREE.Vector3();
  function placeCamera(u){
    const t = THREE.MathUtils.clamp(u, 0, 1);
    eyeCurve.getPointAt(t, eye);
    aimCurve.getPointAt(t, aim);
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
  /* SHA-135: the loop now suspends itself while nothing is happening, so it
     needs something other than scroll to bring it back. */
  addEventListener('pointerdown', () => wake(), { passive: true });

  applySize();
  readScroll();
  currentU = targetU;
  placeCamera(currentU);
  document.body.classList.add('gl-live');

  /* ---------- the on-demand loop ---------- */
  const clock = new THREE.Clock();
  let running = false, spin = 0, lastInput = performance.now();
  let warmup = WARMUP_FRAMES;
  const samples = []; let downgraded = false;

  function render(){ renderer.render(scene, camera); }

  /* SHA-162 #34: the sampler used to take the first 90 frames - load jank
     included - and latch `downgraded = true` whatever the verdict, so one
     busy second at boot pinned a capable machine to dpr 1.0 for the rest of
     the session. Now the warm-up frames are discarded and each window is
     judged on its own, so the check keeps watching until it actually sees
     sustained slow frames. */
  function measure(dt){
    if(downgraded) return;
    if(warmup > 0){ warmup--; return; }
    samples.push(dt * 1000);
    if(samples.length < WINDOW_FRAMES) return;
    const med = samples.slice().sort((a, b) => a - b)[WINDOW_FRAMES >> 1];
    samples.length = 0;
    if(med > 20) reduce();
  }

  function reduce(){
    if(downgraded) return;
    downgraded = true;
    dprCap = 1.0;
    cfg.idleSpin = 0;
    applySize();
    if(dust) dust.visible = false;
  }

  function frame(){
    const dt = Math.min(clock.getDelta(), 0.05);

    // critically-damped-ish smoothing, frame-rate independent
    const k = 1 - Math.pow(0.0016, dt);
    currentU += (targetU - currentU) * k;
    const settled = Math.abs(targetU - currentU) < 0.00025;
    if(settled) currentU = targetU;

    /* `spin` only advances while the loop is awake, so suspending and
       resuming is continuous rather than a jump-cut. */
    if(cfg.idleSpin){ spin += dt * cfg.idleSpin; world.rotation.set(spin * 0.35, spin, 0); }
    placeCamera(currentU);
    render();

    measure(dt);

    /* The whole point: if nothing is moving, stop burning the GPU. The idle
       rotation gets IDLE_SPIN_MS of grace after the last interaction and then
       loses its exemption too - it used to hold the loop open forever. */
    if(settled && (!cfg.idleSpin || performance.now() - lastInput > IDLE_SPIN_MS)) sleep();
  }

  function wake(){
    lastInput = performance.now();
    if(!animate || running || document.hidden) return;
    running = true; clock.getDelta(); renderer.setAnimationLoop(frame);
  }
  function sleep(){
    if(!running) return;
    running = false; renderer.setAnimationLoop(null);
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? sleep() : wake(); });

  /* SHA-148: switching motion off draws one still frame and stops; switching
     it on restarts the loop. No reload, no lost scroll position. */
  function setMotion(on){
    animate = !!on;
    if(animate){ wake(); return; }
    sleep();
    currentU = targetU;
    placeCamera(currentU);
    render();
  }

  /* SHA-167 #41: without a handler a lost context left a frozen canvas and a
     stream of console errors. Fall back to the CSS backdrop while the context
     is gone and pick the loop back up if the browser restores it. */
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();                 // required, or the context never comes back
    sleep();
    document.body.classList.remove('gl-live');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    applySize();
    document.body.classList.add('gl-live');
    if(animate) wake(); else render();
  });

  if(animate) wake(); else render();      // reduced motion → exactly one frame

  addEventListener('pagehide', () => {
    sleep();
    nodeGeo.dispose(); nodeMat.dispose(); edgeGeo.dispose(); edges.material.dispose();
    if(dust){ dust.geometry.dispose(); dust.material.dispose(); }
    renderer.dispose();
  });

  return { setMotion, reduce };
}
