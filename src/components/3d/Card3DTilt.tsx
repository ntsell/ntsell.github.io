import React, { useRef, useState, useCallback } from 'react';

interface Card3DTiltProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  enableGlare?: boolean;
}

export const Card3DTilt: React.FC<Card3DTiltProps> = ({
  children,
  className = '',
  maxTilt = 12,
  scale = 1.03,
  enableGlare = true
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s ease'
  });
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({
    opacity: 0
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Chỉ tắt trên màn hình mobile cực nhỏ (<640px)
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return;
    }
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPct = (x / rect.width) - 0.5;
    const yPct = (y / rect.height) - 0.5;

    const rotX = -yPct * maxTilt;
    const rotY = xPct * maxTilt;

    // Tính toán bóng đổ 3D ngược hướng sáng
    const shadowX = -rotY * 1.5;
    const shadowY = rotX * 1.8 + 15;

    setStyle({
      transform: `perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      boxShadow: `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 30px -8px rgba(15, 23, 42, 0.22)`,
      transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out'
    });

    if (enableGlare) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      setGlareStyle({
        opacity: 0.25,
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 35%, transparent 75%)`,
        transition: 'opacity 0.15s ease-out'
      });
    }
  }, [maxTilt, scale, enableGlare]);

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      boxShadow: 'none',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease'
    });
    setGlareStyle({
      opacity: 0,
      transition: 'opacity 0.4s ease-out'
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        willChange: 'transform, box-shadow'
      }}
      className={`relative ${className}`}
    >
      {children}
      {enableGlare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-30"
          style={glareStyle}
        />
      )}
    </div>
  );
};
