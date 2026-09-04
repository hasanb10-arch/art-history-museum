'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Painting } from '@/lib/types';

type Props = {
  paintings: Painting[];
  onInspect: (p: Painting) => void;
  inspecting: boolean;
  onReady: () => void;
};

const EYE = 1.62;
const HANG_CENTER = 1.55;
const MAX_DIM = 1.7;
const SLOT = 3.1;     // metres of wall per painting

export default function Gallery({ paintings, onInspect, inspecting, onReady }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const inspectingRef = useRef(inspecting);
  useEffect(() => { inspectingRef.current = inspecting; }, [inspecting]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let disposed = false;

    // ---------- renderer ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0a09);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.28;

    const camera = new THREE.PerspectiveCamera(62, el.clientWidth / el.clientHeight, 0.05, 80);

    // ---------- room size from painting count ----------
    type Slot = { x: number; z: number; ry: number; nx: number; nz: number };
    const along = (len: number, margin: number) => {
      const count = Math.max(0, Math.floor((len - margin * 2) / SLOT));
      const start = -((count - 1) * SLOT) / 2;
      return Array.from({ length: count }, (_, i) => start + i * SLOT);
    };
    // north, east, west, then south (leaving the entrance clear)
    const buildSlots = (W: number, D: number): Slot[] => {
      const hx = W / 2, hz = D / 2;
      const out: Slot[] = [];
      for (const x of along(W, 1.5)) out.push({ x, z: -hz, ry: 0, nx: 0, nz: 1 });
      for (const z of along(D, 1.5)) out.push({ x: hx, z, ry: -Math.PI / 2, nx: -1, nz: 0 });
      for (const z of along(D, 1.5)) out.push({ x: -hx, z, ry: Math.PI / 2, nx: 1, nz: 0 });
      for (const x of along(W, 1.5).filter(v => Math.abs(v) > 1.9)) out.push({ x, z: hz, ry: Math.PI, nx: 0, nz: -1 });
      return out;
    };
    const n = Math.max(paintings.length, 4);
    const perimeter = n * SLOT + 10;
    // Start from the perimeter estimate and grow the room until every painting has its own slot,
    // otherwise two paintings end up hanging in the same spot and z-fight.
    let D = Math.max(9, perimeter / 4.8);
    let slots = buildSlots(D * 1.4, D);
    while (slots.length < n && D < 60) { D += 0.5; slots = buildSlots(D * 1.4, D); }
    const W = D * 1.4;
    const H = 4.2;
    const hx = W / 2, hz = D / 2;

    // ---------- materials ----------
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe9e3d7, roughness: 0.94, metalness: 0 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c7, roughness: 0.98 });
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x2a231e, roughness: 0.6, metalness: 0.05 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc9a75a, roughness: 0.28, metalness: 0.78 });
    const frameInner = new THREE.MeshStandardMaterial({ color: 0x3a2f24, roughness: 0.55, metalness: 0.2 });
    const matBoard = new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 0.9 });
    const canMat = new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.4, metalness: 0.6 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffe2b0, emissiveIntensity: 2.2 });

    // ---------- walls, ceiling, floor ----------
    const room = new THREE.Group();
    const wall = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true;
      room.add(m);
    };
    wall(W, H, 0, H / 2, -hz, 0);           // north
    wall(W, H, 0, H / 2, hz, Math.PI);      // south
    wall(D, H, -hx, H / 2, 0, Math.PI / 2); // west
    wall(D, H, hx, H / 2, 0, -Math.PI / 2); // east
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H; room.add(ceil);

    // skirting
    const skirt = (w: number, x: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.03), skirtMat);
      m.position.set(x, 0.06, z); m.rotation.y = ry; m.castShadow = true; room.add(m);
    };
    skirt(W, 0, -hz + 0.015, 0); skirt(W, 0, hz - 0.015, 0); skirt(D, -hx + 0.015, 0, Math.PI / 2); skirt(D, hx - 0.015, 0, Math.PI / 2);

    // reflective floor: mirror underneath, satin wood layer on top
    const mirror = new Reflector(new THREE.PlaneGeometry(W, D), {
      clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x6f6a63,
    });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = 0.0; room.add(mirror);
    const floorMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a2e24, roughness: 0.42, metalness: 0.0, transparent: true, opacity: 0.74, clearcoat: 0.6, clearcoatRoughness: 0.35,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.receiveShadow = true; room.add(floor);

    // ceiling light tracks
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x24211d, roughness: 0.5, metalness: 0.5 });
    for (const z of [-hz + 1.6, hz - 1.6]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(W - 3, 0.05, 0.06), trackMat); t.position.set(0, H - 0.03, z); room.add(t);
    }
    for (const x of [-hx + 1.6, hx - 1.6]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, D - 3), trackMat); t.position.set(x, H - 0.03, 0); room.add(t);
    }
    scene.add(room);

    // base light
    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2a211a, 0.35));
    const fill = new THREE.PointLight(0xffe9c9, 6, 30, 2); fill.position.set(0, H - 0.4, 0); scene.add(fill);

    // ---------- hang paintings ----------
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const meshes: THREE.Mesh[] = [];
    const loads: Promise<void>[] = [];

    paintings.forEach((p, i) => {
      const s = slots[i % slots.length];
      if (!s) return;
      const aspect = p.width && p.height ? p.width / p.height : 1.3;
      const pw = aspect >= 1 ? MAX_DIM : MAX_DIM * aspect;
      const ph = aspect >= 1 ? MAX_DIM / aspect : MAX_DIM;
      const g = new THREE.Group();
      g.position.set(s.x + s.nx * 0.03, HANG_CENTER, s.z + s.nz * 0.03);
      g.rotation.y = s.ry;

      const fw = 0.075, fd = 0.055;
      const outer = new THREE.Mesh(new THREE.BoxGeometry(pw + fw * 2, ph + fw * 2, fd), frameMat);
      outer.position.z = fd / 2; outer.castShadow = true; outer.receiveShadow = true; g.add(outer);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(pw + fw * 0.9, ph + fw * 0.9, fd + 0.004), frameInner);
      lip.position.z = fd / 2 + 0.001; g.add(lip);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(pw + fw * 0.5, ph + fw * 0.5), matBoard);
      mat.position.z = fd + 0.004; g.add(mat);

      const canvasMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.72, metalness: 0 });
      const canvas = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), canvasMat);
      canvas.position.z = fd + 0.006;
      canvas.userData.painting = p;
      g.add(canvas);
      meshes.push(canvas);

      loads.push(new Promise<void>(resolve => {
        loader.load(p.thumb_url, tex => {
          tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
          canvasMat.map = tex; canvasMat.color.set(0xffffff); canvasMat.needsUpdate = true; resolve();
        }, undefined, () => resolve());
      }));

      // spotlight from the ceiling track, aimed at the painting
      const lx = s.x + s.nx * 1.55, lz = s.z + s.nz * 1.55;
      const spot = new THREE.SpotLight(0xfff0d8, 95, 9, 0.44, 0.55, 2);
      spot.position.set(lx, H - 0.08, lz);
      spot.target.position.set(s.x, HANG_CENTER, s.z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0006;
      spot.shadow.radius = 4;
      spot.shadow.camera.near = 0.5; spot.shadow.camera.far = 10;
      scene.add(spot, spot.target);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 20), canMat);
      can.position.set(lx, H - 0.14, lz); can.lookAt(s.x, HANG_CENTER, s.z); can.rotateX(Math.PI / 2); scene.add(can);
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), bulbMat);
      bulb.position.set(lx, H - 0.26, lz); bulb.lookAt(s.x, HANG_CENTER, s.z); scene.add(bulb);

      scene.add(g);
    });

    Promise.all(loads).then(() => { if (!disposed) onReady(); });

    // ---------- controls ----------
    const controls = new PointerLockControls(camera, renderer.domElement);
    controlsRef.current = controls;
    camera.position.set(0, EYE, hz - 1.2);
    camera.lookAt(0, HANG_CENTER, -hz);
    controls.addEventListener('lock', () => setLocked(true));
    controls.addEventListener('unlock', () => setLocked(false));

    const keys = new Set<string>();
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft'].includes(e.code)) {
        down ? keys.add(e.code) : keys.delete(e.code);
      }
    };
    const kd = onKey(true), ku = onKey(false);
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);

    const ray = new THREE.Raycaster();
    const onClick = () => {
      if (inspectingRef.current) return;
      if (!controls.isLocked) { controls.lock(); return; }
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit && hit.distance < 7) {
        controls.unlock();
        onInspect(hit.object.userData.painting as Painting);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ---------- loop ----------
    const vel = new THREE.Vector3();
    const dir = new THREE.Vector3();
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (controls.isLocked && !inspectingRef.current) {
        const fwd = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
        const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
        const speed = keys.has('ShiftLeft') ? 5.2 : 3.0;
        dir.set(side, 0, fwd);
        if (dir.lengthSq() > 0) dir.normalize();
        const ease = Math.min(1, 10 * dt);
        vel.x += (dir.x * speed - vel.x) * ease;
        vel.z += (dir.z * speed - vel.z) * ease;
        controls.moveRight(vel.x * dt);
        controls.moveForward(vel.z * dt);
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -hx + 0.6, hx - 0.6);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -hz + 0.6, hz - 0.6);
        camera.position.y = EYE;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      mirror.dispose();
      pmrem.dispose();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mm of mats) { const sm = mm as THREE.MeshStandardMaterial; sm.map?.dispose(); mm.dispose(); }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintings]);

  // release the pointer while inspecting
  useEffect(() => { if (inspecting && controlsRef.current?.isLocked) controlsRef.current.unlock(); }, [inspecting]);

  return (
    <>
      <div ref={mount} style={{ position: 'fixed', inset: 0 }} data-testid="gallery-canvas" />
      {locked && !inspecting && <div className="crosshair" />}
      {!locked && !inspecting && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div className="placard" style={{ padding: '1.1rem 1.6rem', fontSize: '1.05rem' }}>Click to walk in</div>
        </div>
      )}
    </>
  );
}
