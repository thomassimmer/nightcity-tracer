import { useState, useRef, useEffect, useCallback } from 'react';

interface ResizableGridResult {
  colRatio: number;
  rowRatio: number;
  isDragging: 'col' | 'row' | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  startDrag: (axis: 'col' | 'row', clientPos: number, currentRatio: number) => void;
}

export function useResizableGrid(scenarioId: string | undefined): ResizableGridResult {
  const [colRatio, setColRatio] = useState(0.5);
  const [rowRatio, setRowRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState<'col' | 'row' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    axis: 'col' | 'row';
    startMouse: number;
    startRatio: number;
  } | null>(null);
  const mountedScenarioId = useRef(scenarioId);

  useEffect(() => {
    if (scenarioId === mountedScenarioId.current) return;
    mountedScenarioId.current = scenarioId;
    setColRatio(0.5);
    setRowRatio(0.5);
  }, [scenarioId]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const delta = drag.axis === 'col' ? e.clientX - drag.startMouse : e.clientY - drag.startMouse;
      const dimension = drag.axis === 'col' ? rect.width : rect.height;
      const newRatio = Math.max(0.15, Math.min(0.85, drag.startRatio + delta / dimension));
      if (drag.axis === 'col') setColRatio(newRatio);
      else setRowRatio(newRatio);
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = useCallback(
    (axis: 'col' | 'row', clientPos: number, currentRatio: number) => {
      dragRef.current = { axis, startMouse: clientPos, startRatio: currentRatio };
      setIsDragging(axis);
    },
    [],
  );

  return { colRatio, rowRatio, isDragging, containerRef, startDrag };
}
