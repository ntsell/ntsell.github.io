import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCw, ShieldCheck, Eye, Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CalculatorModelProps {
  colorScheme?: 'black' | 'white';
  isAutoRotate?: boolean;
}

const ProceduralCalculator: React.FC<CalculatorModelProps> = ({ 
  colorScheme = 'black' 
}) => {
  const meshRef = useRef<THREE.Group | null>(null);

  const bodyColor = colorScheme === 'white' ? '#f8fafc' : '#1e293b';
  const accentColor = colorScheme === 'white' ? '#0284c7' : '#38bdf8';

  // Nhẹ nhàng nhấp nhô
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
      {/* 1. Thân máy Casio chính (Body) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 3.8, 0.32]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* 2. Màn hình kính LCD (Screen) */}
      <mesh position={[0, 0.95, 0.17]}>
        <boxGeometry args={[1.7, 0.85, 0.04]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Màn hình hiển thị ma trận điểm (LCD Display) */}
      <mesh position={[0, 0.95, 0.195]}>
        <planeGeometry args={[1.55, 0.72]} />
        <meshStandardMaterial
          color="#1e3a5f"
          emissive="#0284c7"
          emissiveIntensity={0.2}
          roughness={0.2}
        />
      </mesh>

      {/* Pin năng lượng mặt trời (Solar Cell) */}
      <mesh position={[0.45, 1.55, 0.17]}>
        <boxGeometry args={[0.7, 0.18, 0.02]} />
        <meshStandardMaterial
          color="#451a03"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Cụm phím điều hướng 4 chiều REPLAY (Nav Wheel) */}
      <mesh position={[0, 0.22, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.06, 32]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Các phím bấm chức năng & số (3 hàng phím tượng trưng) */}
      {[-0.25, -0.65, -1.05, -1.45].map((rowY, rIdx) => (
        <group key={rIdx} position={[0, rowY, 0.18]}>
          {[-0.65, -0.22, 0.22, 0.65].map((colX, cIdx) => (
            <mesh key={cIdx} position={[colX, 0, 0]}>
              <boxGeometry args={[0.34, 0.24, 0.06]} />
              <meshStandardMaterial
                color={rIdx === 0 ? accentColor : (colorScheme === 'white' ? '#e2e8f0' : '#334155')}
                roughness={0.5}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* 3. Mặt sau: Tem chống hàng giả bóng gương (Hologram Seal) */}
      <mesh position={[0, 0.8, -0.17]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.65, 0.45]} />
        <meshStandardMaterial
          color="#e0e7ff"
          roughness={0.05}
          metalness={0.95}
          emissive="#818cf8"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Nhãn tem mã Serial Number ở mặt sau */}
      <mesh position={[0, -0.4, -0.17]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.4, 0.6]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

interface Calculator3DViewerProps {
  productTitle?: string;
  className?: string;
}

export const Calculator3DViewer: React.FC<Calculator3DViewerProps> = ({
  productTitle = '',
  className = ''
}) => {
  const reducedMotion = useReducedMotion();
  const [autoRotate, setAutoRotate] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const controlsRef = useRef<any>(null);

  const isWhite = productTitle.toLowerCase().includes('trắng') || productTitle.toLowerCase().includes('white');

  const handleResetFront = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setAutoRotate(false);
    }
  };

  const handleViewBack = () => {
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(Math.PI);
      controlsRef.current.setPolarAngle(Math.PI / 2);
      setAutoRotate(false);
    }
  };

  return (
    <div className={`three-viewer-shell relative bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl ${className}`}>
      {/* Huy hiệu xem 3D */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 motion-gentle-pulse" />
        <span>Tương tác 3D 360°</span>
      </div>

      {/* Hướng dẫn tương tác */}
      <div className="three-viewer-hint absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-slate-300 text-[10px]">
        <Eye className="w-3 h-3 text-sky-400" />
        <span>Kéo chuột hoặc ngón tay để xoay 360°</span>
      </div>

      {/* Toolbar phím tắt góc phải */}
      <div className="three-viewer-toolbar absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold flex items-center gap-1 transition ${
            autoRotate 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
          title="Bật/Tắt tự động xoay"
        >
          <RotateCw className={`w-3 h-3 ${autoRotate && !reducedMotion ? 'motion-spin-slow' : ''}`} />
          <span>Tự xoay</span>
        </button>

        <button
          type="button"
          onClick={handleResetFront}
          className="px-2.5 py-1 text-[11px] rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 font-semibold transition"
          title="Xoay về mặt trước"
        >
          Mặt trước
        </button>

        <button
          type="button"
          onClick={handleViewBack}
          className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-600/60 hover:bg-indigo-600 text-white font-semibold transition flex items-center gap-1"
          title="Xoay xem tem chống giả mặt sau"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-300" />
          <span>Xem tem sau</span>
        </button>
      </div>

      {/* Khung Canvas WebGL */}
      <div className="w-full h-72 sm:h-80 cursor-grab active:cursor-grabbing">
        <Canvas
          frameloop={autoRotate && !reducedMotion ? 'always' : 'demand'}
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 1.3]}
          performance={{ min: 0.55, max: 1, debounce: 180 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-5, -5, -5]} intensity={0.8} color="#93c5fd" />
          <pointLight position={[0, 2, 3]} intensity={1.0} color="#38bdf8" />
          <pointLight position={[0, -2, -3]} intensity={0.9} color="#a855f7" />

          <ProceduralCalculator colorScheme={isWhite ? 'white' : 'black'} />

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={3.2}
            maxDistance={7.5}
            enableDamping
            dampingFactor={0.08}
            autoRotate={autoRotate && !reducedMotion}
            autoRotateSpeed={1.5}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default Calculator3DViewer;
