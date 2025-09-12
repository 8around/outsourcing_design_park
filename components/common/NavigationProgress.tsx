'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// NProgress 설정
if (typeof window !== 'undefined') {
  NProgress.configure({ 
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.3,
    easing: 'ease',
    speed: 500
  });
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      NProgress.start();
      setIsTransitioning(true);
    };

    const handleComplete = () => {
      NProgress.done();
      setIsTransitioning(false);
    };

    // 페이지 변경 감지
    handleComplete();

    return () => {
      handleComplete();
    };
  }, [pathname, searchParams]);

  // 링크 클릭 시 로딩 시작
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !link.target && link.hostname === window.location.hostname) {
        const currentUrl = window.location.href;
        const newUrl = link.href;
        
        if (currentUrl !== newUrl) {
          NProgress.start();
          setIsTransitioning(true);
        }
      }
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // 추가 로딩 오버레이 (선택적)
  if (isTransitioning) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
      </div>
    );
  }

  return null;
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}

// NProgress 스타일 오버라이드를 위한 전역 스타일
export const NavigationProgressStyles = () => {
  return (
    <style jsx global>{`
      #nprogress {
        pointer-events: none;
      }

      #nprogress .bar {
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        box-shadow: 0 1px 10px rgba(59, 130, 246, 0.5);
      }

      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #3b82f6, 0 0 5px #3b82f6;
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `}</style>
  );
};