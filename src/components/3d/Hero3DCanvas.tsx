import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingShapesCSS } from './FloatingShapesCSS';

// Mô hình máy tính Casio 3D thu nhỏ bồng bềnh ở góc Hero
const Mini3DCalculator: React.FC = () => {
  const calcRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (!calcRef.current) return;
    const t = state.clock.getElapsedTime();
    calcRef.current.rotation.y = Math.sin(t * 0.6) * 0.35 + 0.2;
    calcRef.current.rotation.x = Math.cos(t * 0.5) * 0.2 + 0.15;
    calcRef.current.position.y = Math.sin(t * 1.2) * 0.12;
  });

  return (
    <group ref={calcRef} position={[2.8, -0.2, 0.5]} rotation={[0.2, -0.4, 0.1]} scale={0.75}>
      {/* Thân máy chính */}
      <mesh>
        <boxGeometry args={[2.1, 3.6, 0.28]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>

      {/* Màn hình LCD phát sáng cyan */}
      <mesh position={[0, 0.88, 0.15]}>
        <boxGeometry args={[1.65, 0.85, 0.04]} />
        <meshStandardMaterial
          color="#0369a1"
          emissive="#38bdf8"
          emissiveIntensity={0.65}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Dải pin năng lượng mặt trời amber */}
      <mesh position={[0.42, 1.45, 0.15]}>
        <boxGeometry args={[0.7, 0.18, 0.02]} />
        <meshStandardMaterial
          color="#78350f"
          emissive="#f59e0b"
          emissiveIntensity={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Cụm phím điều hướng mạ bạc */}
      <mesh position={[0, 0.22, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Phím số dạ quang */}
      {[-0.22, -0.6, -0.98, -1.35].map((y, rIdx) => (
        <group key={rIdx} position={[0, y, 0.15]}>
          {[-0.62, -0.2, 0.2, 0.62].map((x, cIdx) => (
            <mesh key={cIdx} position={[x, 0, 0]}>
              <boxGeometry args={[0.32, 0.22, 0.05]} />
              <meshStandardMaterial
                color={rIdx === 0 ? '#38bdf8' : '#334155'}
                emissive={rIdx === 0 ? '#0284c7' : '#000000'}
                emissiveIntensity={rIdx === 0 ? 0.4 : 0}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tem chống giả phản quang hologram mặt sau */}
      <mesh position={[0, 0.7, -0.15]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.75, 0.5]} />
        <meshStandardMaterial
          color="#e0e7ff"
          emissive="#818cf8"
          emissiveIntensity={0.7}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>
    </group>
  );
};

// Các khối hình học toán học bồng bềnh đa lớp
const FloatingMathGeometries: React.FC = () => {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const { x, y } = state.pointer;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.35, 0.06);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.35, 0.06);
  });

  return (
    <group ref={groupRef}>
      {/* 1. Máy tính 3D Casio bồng bềnh */}
      <Mini3DCalculator />

      {/* 2. Khối 20 mặt Icosahedron đại diện cho toán học & hình học */}
      <Float speed={2.0} rotationIntensity={1.5} floatIntensity={1.8} position={[1.2, 1.4, -1]}>
        <mesh>
          <icosahedronGeometry args={[1.0, 0]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#2563eb"
            emissiveIntensity={0.35}
            roughness={0.15}
            metalness={0.85}
            wireframe={true}
          />
        </mesh>
      </Float>

      {/* 3. Vòng nhẫn Torus xoay nhịp nhàng đa chiều */}
      <Float speed={1.6} rotationIntensity={2.0} floatIntensity={1.4} position={[-2.8, -0.8, -0.5]}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.1, 0.22, 20, 40]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#7c3aed"
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>

      {/* 4. Khối lập phương dạ quang phím Casio */}
      <Float speed={2.5} rotationIntensity={1.2} floatIntensity={2.0} position={[-2.4, 1.5, -1.2]}>
        <mesh rotation={[0.5, 0.5, 0]}>
          <boxGeometry args={[0.85, 0.85, 0.85]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.75}
          />
        </mesh>
      </Float>

      {/* 5. Khối cầu ngọc lục bảo nhỏ phản chiếu */}
      <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.2} position={[4.2, 1.6, -1.5]}>
        <mesh>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#059669"
            emissiveIntensity={0.45}
            roughness={0.1}
            metalness={0.7}
          />
        </mesh>
      </Float>
    </group>
  );
};

export const Hero3DCanvas: React.FC = () => {
  // Kiểm tra khả năng hỗ trợ WebGL của trình duyệt
  const hasWebGL = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }, []);

  if (!hasWebGL) {
    return <FloatingShapesCSS />;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'default'
        }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[8, 10, 6]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[-8, -4, -4]} intensity={1.2} color="#a5b4fc" />
        <pointLight position={[2.5, 0, 3]} intensity={1.8} color="#38bdf8" />
        <pointLight position={[-2.5, 1, 2]} intensity={1.2} color="#c084fc" />
        <FloatingMathGeometries />
      </Canvas>
    </div>
  );
};

export default Hero3DCanvas;
