import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingShapesCSS } from './FloatingShapesCSS';

// Từng khối hình 3D toán học bồng bềnh
const FloatingMathGeometries: React.FC = () => {
  const groupRef = useRef<THREE.Group | null>(null);

  // Lắng nghe di chuyển chuột tạo hiệu ứng Parallax nhẹ
  useFrame((state) => {
    if (!groupRef.current) return;
    const { x, y } = state.pointer;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.25, 0.05);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.25, 0.05);
  });

  return (
    <group ref={groupRef}>
      {/* 1. Khối 20 mặt (Icosahedron) đại diện cho hình học & toán học */}
      <Float speed={1.8} rotationIntensity={1.2} floatIntensity={1.5} position={[3.2, 1.2, -1]}>
        <mesh>
          <icosahedronGeometry args={[1.3, 0]} />
          <meshStandardMaterial
            color="#60a5fa"
            roughness={0.2}
            metalness={0.8}
            wireframe={true}
            transparent
            opacity={0.65}
          />
        </mesh>
      </Float>

      {/* 2. Vòng nhẫn Torus xoay nhịp nhàng */}
      <Float speed={1.4} rotationIntensity={1.8} floatIntensity={1.2} position={[-3.5, -0.8, -0.5]}>
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[1.2, 0.25, 16, 32]} />
          <meshStandardMaterial
            color="#818cf8"
            roughness={0.3}
            metalness={0.6}
            transparent
            opacity={0.5}
          />
        </mesh>
      </Float>

      {/* 3. Khối lập phương mờ phản chiếu đại diện phím Casio */}
      <Float speed={2.2} rotationIntensity={1.0} floatIntensity={1.8} position={[3.8, -1.5, 0]}>
        <mesh rotation={[0.4, 0.4, 0]}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial
            color="#38bdf8"
            roughness={0.1}
            metalness={0.9}
            transparent
            opacity={0.45}
          />
        </mesh>
      </Float>

      {/* 4. Khối cầu ngọc trai nhỏ phía góc trên bên trái */}
      <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.0} position={[-2.8, 1.8, -2]}>
        <mesh>
          <sphereGeometry args={[0.7, 24, 24]} />
          <meshStandardMaterial
            color="#a7f3d0"
            roughness={0.2}
            metalness={0.5}
            transparent
            opacity={0.55}
          />
        </mesh>
      </Float>
    </group>
  );
};

export const Hero3DCanvas: React.FC = () => {
  // Kiểm tra thiết bị: tắt Three.js trên mobile / thiết bị yếu để tiết kiệm pin tối đa
  const shouldRender3D = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isMobile = window.innerWidth < 768;
    const isTouch = 'ontouchstart' in window;
    const lowCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    return !isMobile && !isTouch && !lowCores;
  }, []);

  if (!shouldRender3D) {
    return <FloatingShapesCSS />;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-75">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'low-power'
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} color="#bae6fd" />
        <directionalLight position={[-10, -5, -5]} intensity={0.6} color="#c7d2fe" />
        <pointLight position={[0, 0, 4]} intensity={0.8} color="#e0e7ff" />
        <FloatingMathGeometries />
      </Canvas>
    </div>
  );
};

export default Hero3DCanvas;
