import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles, Stars } from '@react-three/drei';

// Glowing, slowly-tumbling icosahedron — reacts a little to pointer position
// for a subtle parallax feel without being distracting behind the copy.
function FloatingGem({ position, color, scale = 1, speed = 1, distort = 0.4 }) {
  const meshRef = useRef(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const { pointer } = state;
    meshRef.current.rotation.x += 0.0018 * speed;
    meshRef.current.rotation.y += 0.0026 * speed;
    meshRef.current.position.x += (pointer.x * 0.6 - meshRef.current.position.x + position[0]) * 0.02;
    meshRef.current.position.y += (pointer.y * 0.3 - meshRef.current.position.y + position[1]) * 0.02;
  });

  return (
    <Float speed={1.4 * speed} rotationIntensity={0.6} floatIntensity={1.1}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 1]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          distort={distort}
          speed={1.6}
          roughness={0.15}
          metalness={0.6}
        />
      </mesh>
    </Float>
  );
}

function RingShape({ position, color }) {
  const ref = useRef(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.z += 0.0022;
    ref.current.rotation.x += 0.0009;
  });
  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={ref} position={position}>
        <torusGeometry args={[1.1, 0.14, 24, 100]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.25} metalness={0.7} />
      </mesh>
    </Float>
  );
}

// Purely decorative — kept lightweight (no HDRI file, no heavy geometry) so
// it stays smooth on low-end phones. Sits absolutely behind the hero copy.
export default function Hero3DScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      className="!absolute inset-0 !w-full !h-full"
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={2} color="#60a5fa" />
      <pointLight position={[-5, -3, -5]} intensity={1.4} color="#f97316" />
      <pointLight position={[0, 2, 3]} intensity={0.8} color="#ffffff" />

      <Suspense fallback={null}>
        <FloatingGem position={[2.4, 0.6, 0]} color="#3b82f6" scale={1.3} speed={1} distort={0.45} />
        <FloatingGem position={[3.6, -1.2, -1.5]} color="#f59e0b" scale={0.7} speed={1.4} distort={0.3} />
        <RingShape position={[1.2, -1.4, -1]} color="#38bdf8" />
        <Sparkles count={60} scale={[9, 5, 4]} size={2.4} speed={0.4} color="#93c5fd" opacity={0.6} />
        <Stars radius={30} depth={20} count={400} factor={2} saturation={0} fade speed={0.6} />
      </Suspense>
    </Canvas>
  );
}
