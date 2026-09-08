import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { FloatingShapesCSS } from './FloatingShapesCSS';

// Mô hình máy tính Casio 3D thu nhỏ bồng bềnh ở góc Hero
const Mini3DCalculator: React.FC = () => {
  const calcRef = useRef<THREE.Group | null>(null);
  const { viewport } = useThree();
  const isMobile = viewport.width < 6.0;

  useFrame((state) => {
    if (!calcRef.current) return;
    const t = state.clock.getElapsedTime();
    calcRef.current.rotation.y = Math.sin(t * 0.6) * 0.35 - 0.25;
    calcRef.current.rotation.x = Math.cos(t * 0.5) * 0.18 + 0.12;
    calcRef.current.position.y = (isMobile ? -0.4 : 0.0) + Math.sin(t * 1.2) * 0.14;
  });

  const posX = isMobile ? viewport.width * 0.28 : Math.min(2.7, viewport.width * 0.28);
  const scale = isMobile ? 0.62 : 0.92;

  return (
    <group ref={calcRef} position={[posX, isMobile ? -0.4 : 0.0, 0.5]} rotation={[0.15, -0.3, 0.06]} scale={scale}>
      {/* Tấm kính mờ 3D Glass Plate tạo chiều sâu như hiệu ứng ảnh 1 */}
      <mesh position={[0, 0, -0.22]}>
        <boxGeometry args={[2.5, 4.0, 0.06]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.25}
          roughness={0.15}
          metalness={0.8}
          transparent
          opacity={0.35}
        />
      </mesh>

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

// Mô hình quyển sách học đường 3D mở bồng bềnh
const Floating3DBook: React.FC<{ position: [number, number, number]; scale?: number }> = ({ position, scale = 0.72 }) => {
  const bookRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (!bookRef.current) return;
    const t = state.clock.getElapsedTime();
    bookRef.current.rotation.y = Math.sin(t * 0.7) * 0.2 + 0.35;
    bookRef.current.rotation.x = Math.cos(t * 0.5) * 0.15 + 0.15;
    bookRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.1;
  });

  return (
    <group ref={bookRef} position={position} scale={scale}>
      {/* Gáy sách */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[0.16, 1.8, 0.22]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Bìa trái */}
      <mesh position={[-0.65, 0, 0.05]} rotation={[0, 0.28, 0]}>
        <boxGeometry args={[1.2, 1.85, 0.06]} />
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.25} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Bìa phải */}
      <mesh position={[0.65, 0, 0.05]} rotation={[0, -0.28, 0]}>
        <boxGeometry args={[1.2, 1.85, 0.06]} />
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.25} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Khối giấy trang sách bên trái (trắng ngà) */}
      <mesh position={[-0.62, 0, 0.14]} rotation={[0, 0.26, 0]}>
        <boxGeometry args={[1.12, 1.74, 0.14]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>

      {/* Khối giấy trang sách bên phải */}
      <mesh position={[0.62, 0, 0.14]} rotation={[0, -0.26, 0]}>
        <boxGeometry args={[1.12, 1.74, 0.14]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>

      {/* Dải ruy băng đánh dấu trang (Bookmark màu vàng hổ phách) */}
      <mesh position={[0, -0.2, 0.22]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.08, 1.9, 0.02]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
    </group>
  );
};

// Các mảnh giấy kiểm tra / nháp toán học bồng bềnh uốn lượn
const FloatingPaper: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  speed?: number;
}> = ({ position, rotation = [0, 0, 0], scale = 0.5, speed = 1.0 }) => {
  const paperRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (!paperRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    paperRef.current.position.y = position[1] + Math.sin(t * 1.3) * 0.08;
    paperRef.current.rotation.z = rotation[2] + Math.sin(t * 0.9) * 0.12;
    paperRef.current.rotation.x = rotation[0] + Math.cos(t * 0.7) * 0.1;
  });

  return (
    <group ref={paperRef} position={position} rotation={rotation} scale={scale}>
      {/* Tờ giấy trắng mỏng có viền */}
      <mesh>
        <planeGeometry args={[1.0, 1.35, 4, 4]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#f1f5f9"
          emissiveIntensity={0.2}
          roughness={0.7}
          side={THREE.DoubleSide}
          transparent
          opacity={0.94}
        />
      </mesh>

      {/* Các dòng kẻ ghi chú / công thức toán học trên giấy */}
      {[-0.38, -0.18, 0.02, 0.22, 0.42].map((y, idx) => (
        <mesh key={idx} position={[idx % 2 === 0 ? 0 : -0.1, y, 0.005]}>
          <planeGeometry args={[idx % 2 === 0 ? 0.75 : 0.55, 0.03]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.65} transparent />
        </mesh>
      ))}

      {/* Góc gấp tờ giấy tạo chiều sâu */}
      <mesh position={[0.4, 0.57, 0.02]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshStandardMaterial color="#cbd5e1" side={THREE.DoubleSide} roughness={0.5} />
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

      {/* 2. Quyển sách học đường 3D mở bồng bềnh */}
      <Floating3DBook position={[0.9, -0.9, 0.2]} scale={0.72} />

      {/* 3. Các mảnh giấy bài thi / nháp toán học bồng bềnh */}
      <FloatingPaper position={[1.8, 1.25, 0.3]} rotation={[0.3, -0.4, 0.2]} scale={0.55} speed={1.1} />
      <FloatingPaper position={[3.6, -0.9, 0.6]} rotation={[-0.2, 0.5, -0.3]} scale={0.48} speed={0.9} />
      <FloatingPaper position={[-0.5, -1.0, 0.2]} rotation={[0.1, 0.2, 0.4]} scale={0.42} speed={1.3} />
      <FloatingPaper position={[2.8, 1.4, -0.5]} rotation={[-0.3, -0.2, -0.15]} scale={0.5} speed={0.8} />

      {/* 4. Khối 20 mặt Icosahedron đại diện cho toán học & hình học */}
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
