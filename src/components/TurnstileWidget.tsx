import React, { useEffect, useRef } from 'react';

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: any) => void;
}

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onToken, onExpire, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let timer: any;
    const renderWidget = () => {
      if ((window as any).turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => onToken(token),
            'expired-callback': () => onExpire?.(),
            'error-callback': (err: any) => onError?.(err),
            theme: 'light',
            size: 'normal'
          });
        } catch (e) {
          console.warn('Turnstile render warning:', e);
        }
      } else if (!(window as any).turnstile) {
        timer = setTimeout(renderWidget, 500);
      }
    };

    renderWidget();

    return () => {
      clearTimeout(timer);
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [onToken, onExpire, onError]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <div className="flex justify-center my-3">
      <div ref={containerRef} className="min-h-[65px]" />
    </div>
  );
};
