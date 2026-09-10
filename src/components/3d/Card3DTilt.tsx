import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

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
  const glareRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const resetCard = () => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;

    pointerRef.current.active = false;
    card.style.transition = 'transform 0.48s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.48s ease';
    card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    card.style.boxShadow = 'none';
    card.style.willChange = 'auto';

    if (glare) {
      glare.style.opacity = '0';
      glare.style.transition = 'opacity 0.3s ease-out';
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || window.innerWidth < 640) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    pointerRef.current.x = (event.clientX - rect.left) / rect.width - 0.5;
    pointerRef.current.y = (event.clientY - rect.top) / rect.height - 0.5;
    pointerRef.current.active = true;

    // Coalesce high-frequency pointer events into one composited update/frame.
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const currentCard = cardRef.current;
      if (!currentCard || !pointerRef.current.active) return;

      const { x, y } = pointerRef.current;
      const rotX = -y * maxTilt;
      const rotY = x * maxTilt;
      const shadowX = -rotY * 1.5;
      const shadowY = rotX * 1.8 + 15;

      currentCard.style.transition = 'transform 0.12s ease-out, box-shadow 0.12s ease-out';
      currentCard.style.willChange = 'transform, box-shadow';
      currentCard.style.transform = `perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      currentCard.style.boxShadow = `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 30px -8px rgba(15, 23, 42, 0.22)`;

      if (enableGlare && glareRef.current) {
        glareRef.current.style.opacity = '0.25';
        glareRef.current.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.15) 35%, transparent 75%)`;
      }
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetCard}
      style={{ transformStyle: 'preserve-3d' }}
      className={`card-tilt-root relative ${className}`}
    >
      {children}
      {enableGlare && (
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden z-30"
          style={{ opacity: 0 }}
        />
      )}
    </div>
  );
};
