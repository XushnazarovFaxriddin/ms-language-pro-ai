"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";

function Scene() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <pointLight position={[-10, -10, -10]} />
      
      <Float speed={4} rotationIntensity={1} floatIntensity={2}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshDistortMaterial
            color="#3b82f6"
            speed={3}
            distort={0.4}
            radius={1}
            emissive="#1d4ed8"
            emissiveIntensity={0.2}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </Float>
      
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

export function Hero3D() {
  return (
    <div className="h-full w-full opacity-60">
      <Canvas>
        <Scene />
      </Canvas>
    </div>
  );
}
