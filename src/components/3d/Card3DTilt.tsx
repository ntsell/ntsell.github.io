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
  maxTilt = 8,
  scale = 1.02,
  enableGlare = true
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
  });
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({
    opacity: 0
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Tắt trên màn hình chạm / mobile để cuộn trang mượt mà
    if (typeof window !== 'undefined' && ('ontouchstart' in window || window.innerWidth < 768)) {
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

    setStyle({
      transform: `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: 'transform 0.1s ease-out'
    });

    if (enableGlare) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      setGlareStyle({
        opacity: 0.18,
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 40%, transparent 80%)`,
        transition: 'opacity 0.2s ease-out'
      });
    }
  }, [maxTilt, scale, enableGlare]);

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
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
        willChange: 'transform'
      }}
      className={`relative ${className}`}
    >
      {children}
      {enableGlare && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-20"
          style={glareStyle}
        />
      )}
    </div>
  );
};
