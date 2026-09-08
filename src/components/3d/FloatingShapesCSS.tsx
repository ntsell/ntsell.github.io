import React from 'react';

export const FloatingShapesCSS: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Khối cầu kính mờ 1 */}
      <div 
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-300/10 backdrop-blur-md border border-white/20 animate-pulse"
        style={{ animationDuration: '7s' }}
      />

      {/* Khối torus / nhẫn xoay nhẹ 2 */}
      <div 
        className="absolute top-1/2 -left-12 w-36 h-36 rounded-full border-4 border-dashed border-sky-300/20 animate-spin"
        style={{ animationDuration: '35s' }}
      />

      {/* Khối lập phương nghiêng 3D 3 */}
      <div 
        className="absolute bottom-4 right-1/4 w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-300/15 via-white/10 to-transparent backdrop-blur-sm border border-white/25 transform rotate-12"
      />

      {/* Hạt bụi sáng nhỏ 4 */}
      <div 
        className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-blue-300/40 blur-xs animate-ping"
        style={{ animationDuration: '4s' }}
      />
    </div>
  );
};
