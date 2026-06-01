import { useState, useRef, useEffect } from 'react';

interface DragPos { x: number; y: number }

interface UseDraggableResult {
  pos: DragPos;
  setPos: (pos: DragPos) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useDraggable(width: number, initialX = 16, initialY = 80): UseDraggableResult {
  const [pos, setPos] = useState<DragPos>({ x: initialX, y: initialY });

  const dragState = useRef<{
    startMx: number;
    startMy: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startMx;
      const dy = e.clientY - dragState.current.startMy;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - width, dragState.current.startX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 120, dragState.current.startY + dy)),
      });
    };
    const onUp = () => { dragState.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [width]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
      startMx: e.clientX,
      startMy: e.clientY,
      startX: pos.x,
      startY: pos.y,
    };
  };

  return { pos, setPos, handleMouseDown };
}
