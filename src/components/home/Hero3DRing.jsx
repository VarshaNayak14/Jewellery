import { Component, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Lightformer, OrbitControls, Sparkles } from '@react-three/drei';

// ─── Materials ────────────────────────────────────────────────────────────
// Everything is procedural (no model / HDRI downloads), so the hero loads fast.
const GOLD = { color: '#e6bf6e', metalness: 1, roughness: 0.24, envMapIntensity: 1.35 };
const DIAMOND = {
  color: '#eef2ff',
  metalness: 0.55,
  roughness: 0,
  envMapIntensity: 4.2,
  clearcoat: 1,
  clearcoatRoughness: 0,
  transparent: true,
  opacity: 0.96,
  side: THREE.DoubleSide,
  flatShading: true,
};

// Round-brilliant style gem: a lathe profile with 8 segments + flat shading
// gives crisp facets that catch the studio lights as the ring turns.
function useGemGeometry() {
  return useMemo(() => {
    const profile = [
      [0.001, -0.78], // culet
      [1, 0], //          girdle (bottom)
      [1, 0.09], //       girdle (top)
      [0.58, 0.4], //     crown → table edge
      [0.001, 0.4], //    table centre
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(profile, 8);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

const RING_R = 1; //        centre-line radius of the band
const TUBE = 0.11; //       band thickness

function Prong({ angle }) {
  return (
    <group rotation={[0, angle, 0]}>
      <group position={[0.42, 1.31, 0]} rotation={[0, 0, 0.21]}>
        <mesh>
          <cylinderGeometry args={[0.026, 0.04, 0.5, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <sphereGeometry args={[0.048, 16, 16]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
      </group>
    </group>
  );
}

function Ring() {
  const gem = useGemGeometry();

  // Tiny pavé stones set along the top of the band, mirrored left / right.
  const pave = useMemo(() => {
    const items = [];
    for (let k = 1; k <= 5; k += 1) {
      const step = 0.17;
      [-1, 1].forEach((side) => {
        const theta = Math.PI / 2 + side * (0.36 + k * step);
        items.push({
          key: `${side}-${k}`,
          pos: [Math.cos(theta) * (RING_R + TUBE * 0.78), Math.sin(theta) * (RING_R + TUBE * 0.78), 0],
          rot: theta - Math.PI / 2,
          scale: 0.082 - k * 0.0055,
        });
      });
    }
    return items;
  }, []);

  return (
    <group>
      {/* band — slightly wider than it is thick, like a real comfort-fit shank */}
      <mesh scale={[1, 1, 1.55]}>
        <torusGeometry args={[RING_R, TUBE, 48, 160]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* thin inner edge highlight */}
      <mesh scale={[1, 1, 1.55]}>
        <torusGeometry args={[RING_R - TUBE * 0.96, 0.012, 16, 160]} />
        <meshStandardMaterial {...GOLD} roughness={0.1} />
      </mesh>

      {/* setting: basket ring + prongs */}
      <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.036, 16, 48]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <Prong key={i} angle={Math.PI / 4 + (i * Math.PI) / 2} />
      ))}

      {/* centre stone */}
      <mesh geometry={gem} position={[0, 1.47, 0]} scale={0.48}>
        <meshPhysicalMaterial {...DIAMOND} />
      </mesh>

      {/* pavé */}
      {pave.map((p) => (
        <mesh key={p.key} geometry={gem} position={p.pos} rotation={[0, 0, p.rot]} scale={p.scale}>
          <meshPhysicalMaterial {...DIAMOND} />
        </mesh>
      ))}
    </group>
  );
}

// Warm "jewellery studio" lighting built from light panels — no HDR file.
function Studio() {
  return (
    <Environment resolution={256} background={false}>
      <Lightformer form="rect" intensity={5} color="#fff4e0" position={[0, 5, 2]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-5, 1, 3]} rotation-y={Math.PI / 2.4} scale={[6, 2, 1]} />
      <Lightformer form="rect" intensity={3.2} color="#ffe9c2" position={[5, 0.5, 3]} rotation-y={-Math.PI / 2.4} scale={[6, 2, 1]} />
      <Lightformer form="ring" intensity={2.6} color="#ffffff" position={[0, 1, -5]} scale={6} />
      <Lightformer form="rect" intensity={1.8} color="#d9a85a" position={[0, -4, 1]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
      {/* soft warm fills so polished gold never reflects pure black */}
      <Lightformer form="rect" intensity={0.9} color="#ffe6bd" position={[0, 0, 9]} scale={[22, 12, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#ffd9a0" position={[-9, 0, 0]} rotation-y={Math.PI / 2} scale={[14, 10, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#ffd9a0" position={[9, 0, 0]} rotation-y={-Math.PI / 2} scale={[14, 10, 1]} />
    </Environment>
  );
}

// OrbitControls forces `touch-action: none`, which would trap vertical page
// scrolling on phones. Let the browser keep vertical pans; horizontal drags
// still rotate the ring.
function TouchScrollFix() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current < 8) {
      gl.domElement.style.touchAction = 'pan-y';
      frames.current += 1;
    }
  });
  return null;
}

function Scene({ reduceMotion }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} color="#fff1d6" />
      <Studio />

      {/* gentle bobbing, slight idle tilt */}
      <Float speed={reduceMotion ? 0 : 1.6} rotationIntensity={reduceMotion ? 0 : 0.18} floatIntensity={reduceMotion ? 0 : 0.7} floatingRange={[-0.08, 0.08]}>
        <group position={[0, -0.3, 0]} rotation={[0.12, 0, 0]}>
          <Ring />
        </group>
      </Float>

      <Sparkles count={36} scale={[4.4, 3.4, 3]} size={3} speed={0.35} opacity={0.9} color="#f0cf8a" />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reduceMotion}
        autoRotateSpeed={2.2}
        minPolarAngle={Math.PI / 2.9}
        maxPolarAngle={Math.PI / 1.85}
        target={[0, 0, 0]}
      />
      <TouchScrollFix />
    </>
  );
}

// If WebGL isn't available, quietly fall back to the campaign photo.
class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return <img className="jewel-hero-3d-fallback" src="/jewelry/ring.jpg" alt="Gold ring" />;
    }
    return this.props.children;
  }
}

export default function Hero3DRing() {
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Stop rendering while the hero is scrolled out of view — saves battery.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="jewel-hero-3d">
      <WebGLBoundary>
        <Canvas
          dpr={[1, 2]}
          frameloop={visible ? 'always' : 'never'}
          camera={{ position: [0, 0.6, 7.6], fov: 31 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
          }}
        >
          <Scene reduceMotion={reduceMotion} />
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}