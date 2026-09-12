import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ensureGsap } from '../lib/gsapSetup';

interface NodeGroup {
  color: THREE.Color;
  count: number;
}

const GROUPS: NodeGroup[] = [
  { color: new THREE.Color('#5eead4'), count: 90 }, // students - cyan
  { color: new THREE.Color('#a78bfa'), count: 70 }, // industry - violet
  { color: new THREE.Color('#fb7185'), count: 55 }, // academia - pink
];

function makeDotTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default function Hero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060d, 0.05);

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // ---- Particle nodes ----
    const totalNodes = GROUPS.reduce((n, g) => n + g.count, 0);
    const positions = new Float32Array(totalNodes * 3);
    const basePositions = new Float32Array(totalNodes * 3);
    const colors = new Float32Array(totalNodes * 3);
    const phases = new Float32Array(totalNodes);

    let idx = 0;
    GROUPS.forEach((g) => {
      for (let i = 0; i < g.count; i++) {
        const radius = 4.2 + Math.random() * 3.4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
        const z = radius * Math.cos(phi) * 0.6;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        basePositions[idx * 3] = x;
        basePositions[idx * 3 + 1] = y;
        basePositions[idx * 3 + 2] = z;
        colors[idx * 3] = g.color.r;
        colors[idx * 3 + 1] = g.color.g;
        colors[idx * 3 + 2] = g.color.b;
        phases[idx] = Math.random() * Math.PI * 2;
        idx++;
      }
    });

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const dotTexture = makeDotTexture();
    const pointsMat = new THREE.PointsMaterial({
      size: 0.16,
      map: dotTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(pointsGeo, pointsMat);
    group.add(points);

    // ---- Connections (fixed k-nearest-neighbour graph) ----
    const maxEdges = totalNodes * 2;
    const linePositions = new Float32Array(maxEdges * 2 * 3);
    const edgeEndpoints: [number, number][] = [];

    for (let i = 0; i < totalNodes; i++) {
      const distances: { j: number; d: number }[] = [];
      for (let j = 0; j < totalNodes; j++) {
        if (i === j) continue;
        const dx = basePositions[i * 3] - basePositions[j * 3];
        const dy = basePositions[i * 3 + 1] - basePositions[j * 3 + 1];
        const dz = basePositions[i * 3 + 2] - basePositions[j * 3 + 2];
        distances.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      distances.sort((a, b) => a.d - b.d);
      const neighbours = distances.slice(0, 2);
      neighbours.forEach((n) => {
        if (edgeEndpoints.length < maxEdges) {
          edgeEndpoints.push([i, n.j]);
        }
      });
    }

    edgeEndpoints.forEach(([a, b], e) => {
      linePositions[e * 6] = basePositions[a * 3];
      linePositions[e * 6 + 1] = basePositions[a * 3 + 1];
      linePositions[e * 6 + 2] = basePositions[a * 3 + 2];
      linePositions[e * 6 + 3] = basePositions[b * 3];
      linePositions[e * 6 + 4] = basePositions[b * 3 + 1];
      linePositions[e * 6 + 5] = basePositions[b * 3 + 2];
    });

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(linePositions.subarray(0, edgeEndpoints.length * 6), 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x384168,
      transparent: true,
      opacity: 0.35,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    // ---- Centerpiece wireframe ----
    const coreGeo = new THREE.IcosahedronGeometry(2.15, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x8fb8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const glowGeo = new THREE.IcosahedronGeometry(2.05, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.045,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // ---- Pointer parallax ----
    const pointer = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };

    // ---- Scroll parallax: as the hero scrolls away, the network sinks, spins
    // slightly, and fades — on top of (not instead of) the pointer parallax above. ----
    const scrollState = { progress: 0 };
    const gsapRefs = prefersReducedMotion ? null : ensureGsap();
    const scrollTrigger = gsapRefs
      ? gsapRefs.ScrollTrigger.create({
          trigger: mount.closest('section') ?? mount,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
          onUpdate: (self) => {
            scrollState.progress = self.progress;
          },
        })
      : null;
    const onPointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove);

    // ---- Resize ----
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();

    const renderOnce = () => renderer.render(scene, camera);

    const animate = () => {
      const t = clock.getElapsedTime();

      for (let i = 0; i < totalNodes; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];
        const ph = phases[i];
        positions[i * 3] = bx + Math.sin(t * 0.4 + ph) * 0.12;
        positions[i * 3 + 1] = by + Math.cos(t * 0.35 + ph) * 0.12;
        positions[i * 3 + 2] = bz + Math.sin(t * 0.3 + ph * 1.3) * 0.12;
      }
      pointsGeo.attributes.position.needsUpdate = true;

      const linePosAttr = lineGeo.attributes.position as THREE.BufferAttribute;
      edgeEndpoints.forEach(([a, b], e) => {
        linePosAttr.setXYZ(e * 2, positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]);
        linePosAttr.setXYZ(
          e * 2 + 1,
          positions[b * 3],
          positions[b * 3 + 1],
          positions[b * 3 + 2]
        );
      });
      linePosAttr.needsUpdate = true;

      core.rotation.y = t * 0.09;
      core.rotation.x = t * 0.05;
      glow.rotation.y = -t * 0.06;

      targetRotation.x += (pointer.y * 0.25 - targetRotation.x) * 0.04;
      targetRotation.y += (pointer.x * 0.3 - targetRotation.y) * 0.04;
      group.rotation.x = targetRotation.x;
      group.rotation.y = targetRotation.y + t * 0.02;

      // Scroll parallax layered on top: sink, spin further, and fade as the hero
      // scrolls out of view (0 = at rest at the top, 1 = fully scrolled past).
      const sp = scrollState.progress;
      group.position.y = -sp * 3.5;
      group.rotation.z = sp * 0.4;
      camera.position.z = 13 + sp * 4;
      const fade = 1 - sp * 0.9;
      pointsMat.opacity = 0.9 * fade;
      lineMat.opacity = 0.35 * fade;

      renderOnce();
      raf = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      renderOnce();
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      scrollTrigger?.kill();
      window.removeEventListener('pointermove', onPointerMove);
      mount.removeChild(renderer.domElement);
      pointsGeo.dispose();
      lineGeo.dispose();
      coreGeo.dispose();
      glowGeo.dispose();
      pointsMat.dispose();
      lineMat.dispose();
      coreMat.dispose();
      glowMat.dispose();
      dotTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
