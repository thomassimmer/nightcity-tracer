import { useState, useEffect, useCallback, useRef } from 'react';
import type { PanelDefinition } from '@/scenario.types';

export interface PanelState {
  isOpen: boolean;
  isNew: boolean;
}

export interface PanelManager {
  order: string[];
  states: Record<string, PanelState>;
  zoomedId: string | null;
  activeId: string | null;
  openIds: string[];
  toggleOpen: (id: string) => void;
  markSeen: (id: string) => void;
  zoomPanel: (id: string) => void;
  setActive: (id: string) => void;
  reorder: (fromId: string, toId: string) => void;
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function usePanelManager(panels: PanelDefinition[], onHelpToggle?: () => void): PanelManager {
  const [order, setOrder] = useState<string[]>(() => panels.map(p => p.id));
  const [states, setStates] = useState<Record<string, PanelState>>(() =>
    Object.fromEntries(panels.map(p => [p.id, { isOpen: p.default_open !== false, isNew: false }]))
  );
  const [zoomedId, setZoomedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(panels[0]?.id ?? null);

  // Detect panels added mid-scenario (isNew notification)
  useEffect(() => {
    const knownIds = new Set(order);
    const newIds = panels.map(p => p.id).filter(id => !knownIds.has(id));
    if (newIds.length === 0) return;
    setOrder(prev => [...prev, ...newIds]);
    setStates(prev => ({
      ...prev,
      ...Object.fromEntries(newIds.map(id => [id, { isOpen: true, isNew: true }])),
    }));
  }, [panels]); // eslint-disable-line react-hooks/exhaustive-deps

  const openIds = order.filter(id => states[id]?.isOpen);

  const toggleOpen = useCallback((id: string) => {
    setStates(prev => ({
      ...prev,
      [id]: { isOpen: !prev[id]?.isOpen, isNew: false },
    }));
    setZoomedId(prev => (prev === id ? null : prev));
  }, []);

  const markSeen = useCallback((id: string) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], isNew: false } }));
  }, []);

  const zoomPanel = useCallback((id: string) => {
    setZoomedId(prev => (prev === id ? null : id));
  }, []);

  const reorder = useCallback((fromId: string, toId: string) => {
    setOrder(prev => {
      const from = prev.indexOf(fromId);
      const to = prev.indexOf(toId);
      if (from === -1 || to === -1 || from === to) return prev;
      return moveItem(prev, from, to);
    });
  }, []);

  // Keep refs in sync for the keyboard handler (avoids stale closures)
  const orderRef = useRef(order);
  const statesRef = useRef(states);
  const activeIdRef = useRef(activeId);
  const zoomedIdRef = useRef(zoomedId);
  const onHelpToggleRef = useRef(onHelpToggle);
  useEffect(() => { orderRef.current = order; }, [order]);
  useEffect(() => { statesRef.current = states; }, [states]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { zoomedIdRef.current = zoomedId; }, [zoomedId]);
  useEffect(() => { onHelpToggleRef.current = onHelpToggle; }, [onHelpToggle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ord = orderRef.current;
      const sts = statesRef.current;
      const aid = activeIdRef.current;
      const zid = zoomedIdRef.current;
      const currentOpenIds = ord.filter(id => sts[id]?.isOpen);
      const currentIndex = aid ? currentOpenIds.indexOf(aid) : -1;

      if (e.key === '?') { onHelpToggleRef.current?.(); return; }
      if (e.key === 'Escape') { setZoomedId(null); return; }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = currentOpenIds[(currentIndex + 1) % currentOpenIds.length];
        if (next) setActiveId(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = currentOpenIds[(currentIndex - 1 + currentOpenIds.length) % currentOpenIds.length];
        if (prev) setActiveId(prev);
      } else if (e.key === 'z' || e.key === 'Z') {
        if (aid && sts[aid]?.isOpen) setZoomedId(prev => (prev === aid ? null : aid));
      } else if (e.key === 'w' || e.key === 'W') {
        if (aid) {
          setStates(prev => ({ ...prev, [aid]: { isOpen: false, isNew: false } }));
          setZoomedId(prev => (prev === aid ? null : prev));
        }
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        const targetId = ord[idx];
        if (targetId) {
          const isCurrentlyOpen = sts[targetId]?.isOpen;
          setStates(prev => ({ ...prev, [targetId]: { isOpen: !isCurrentlyOpen, isNew: false } }));
          if (zid === targetId && isCurrentlyOpen) setZoomedId(null);
          setActiveId(targetId);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // registered once, reads state via refs

  return {
    order,
    states,
    zoomedId,
    activeId,
    openIds,
    toggleOpen,
    markSeen,
    zoomPanel,
    setActive: setActiveId,
    reorder,
  };
}
