import React from 'react';

export const FloatingShapesCSS: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Khối lập phương 3D Isometric mặt đa giác (Cube 1) */}
      <div className="absolute top-6 right-16 w-24 h-24 transform -rotate-12 hover:rotate-0 transition-transform duration-700 opacity-60">
        <div className="relative w-full h-full" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
          {/* Mặt trước */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/40 to-sky-400/30 rounded-2xl border border-white/30 backdrop-blur-md shadow-2xl" />
          {/* Lớp nổi 3D */}
          <div 
            className="absolute inset-2 bg-gradient-to-br from-white/25 to-transparent rounded-xl border border-white/20"
            style={{ transform: 'translateZ(20px)' }}
          />
        </div>
      </div>

      {/* 2. Vòng nhẫn hào quang 3D Torus mô phỏng (Ring 2) */}
      <div 
        className="absolute top-1/3 -left-10 w-44 h-44 rounded-full border-8 border-sky-400/25 shadow-lg shadow-sky-500/20 transform rotate-45 animate-spin"
        style={{ animationDuration: '40s', borderStyle: 'double' }}
      />

      {/* 3. Khối đa diện 3D toán học bồng bềnh góc dưới phải */}
      <div className="absolute bottom-4 right-8 w-28 h-28 transform rotate-45 opacity-50">
        <div className="w-full h-full rounded-3xl bg-gradient-to-tr from-purple-500/30 via-indigo-400/20 to-sky-300/30 border-2 border-white/30 backdrop-blur-lg shadow-2xl" />
      </div>

      {/* 4. Khối cầu phát sáng nổi 3D */}
      <div 
        className="absolute -top-12 left-1/4 w-36 h-36 rounded-full bg-gradient-to-tr from-blue-600/30 via-sky-400/20 to-transparent blur-md border border-sky-300/30 animate-pulse"
        style={{ animationDuration: '6s' }}
      />

      {/* 5. Quyển sách học đường 3D CSS */}
      <div className="absolute bottom-6 right-1/4 w-28 h-20 transform -rotate-6 opacity-75">
        <div className="relative w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-xl border border-white/30 p-2 flex items-center justify-between">
          <div className="w-1/2 h-full bg-slate-50/90 rounded-l border-r border-slate-300/60 flex flex-col justify-center gap-1 px-1">
            <div className="w-full h-0.5 bg-sky-400/60 rounded" />
            <div className="w-3/4 h-0.5 bg-sky-300/50 rounded" />
            <div className="w-5/6 h-0.5 bg-sky-400/60 rounded" />
          </div>
          <div className="w-1/2 h-full bg-slate-50/90 rounded-r flex flex-col justify-center gap-1 px-1">
            <div className="w-full h-0.5 bg-sky-400/60 rounded" />
            <div className="w-2/3 h-0.5 bg-amber-400/70 rounded" />
            <div className="w-4/5 h-0.5 bg-sky-400/60 rounded" />
          </div>
        </div>
      </div>

      {/* 6. Mấy mảnh giấy nháp bài thi toán học bay lượn */}
      <div className="absolute top-10 right-1/3 w-16 h-20 bg-white/80 backdrop-blur rounded shadow-lg border border-white/40 transform rotate-12 flex flex-col gap-1.5 p-2 opacity-80 animate-bounce" style={{ animationDuration: '4s' }}>
        <div className="w-full h-0.5 bg-blue-400/70 rounded" />
        <div className="w-4/5 h-0.5 bg-blue-300/60 rounded" />
        <div className="w-full h-0.5 bg-blue-400/70 rounded" />
        <div className="w-2/3 h-0.5 bg-sky-400/50 rounded" />
      </div>

      <div className="absolute bottom-12 right-12 w-14 h-18 bg-white/75 backdrop-blur rounded shadow-lg border border-white/40 transform -rotate-12 flex flex-col gap-1 p-2 opacity-70">
        <div className="w-full h-0.5 bg-indigo-400/60 rounded" />
        <div className="w-3/4 h-0.5 bg-indigo-300/50 rounded" />
        <div className="w-5/6 h-0.5 bg-indigo-400/60 rounded" />
      </div>
    </div>
  );
};
