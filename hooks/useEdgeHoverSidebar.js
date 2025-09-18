"use client";
import { useEffect, useState, useCallback } from 'react';

/**
 * useEdgeHoverSidebar
 * Shared hook to manage edge-triggered open/close behavior for sidebars.
 * Params:
 *  - options: { edgeThreshold?: number, autoHideDelay?: number, sidebarWidth?: number, enabled?: boolean }
 * Returns:
 *  { isOpen, setIsOpen, edgeMeta }
 */
export function useEdgeHoverSidebar(options = {}) {
  const {
    edgeThreshold = 6,
    autoHideDelay = 900,
    sidebarWidth = 256, // 16rem default
    enabled = true,
    defaultOpen = true,
  } = options;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [edgeMeta, setEdgeMeta] = useState({ autoOpened: false, lastInside: Date.now() });

  const handleMove = useCallback((e) => {
    if (!enabled) return;
    if (e.clientX <= edgeThreshold) {
      if (!isOpen) {
        setIsOpen(true);
        setEdgeMeta(m => ({ ...m, autoOpened: true, lastInside: Date.now() }));
      } else {
        setEdgeMeta(m => ({ ...m, lastInside: Date.now() }));
      }
    } else if (isOpen && edgeMeta.autoOpened) {
      if (e.clientX > sidebarWidth + 4) {
        if (Date.now() - edgeMeta.lastInside > autoHideDelay) {
          setIsOpen(false);
          setEdgeMeta(m => ({ ...m, autoOpened: false }));
        }
      } else {
        setEdgeMeta(m => ({ ...m, lastInside: Date.now() }));
      }
    }
  }, [enabled, isOpen, edgeMeta.autoOpened, edgeMeta.lastInside, edgeThreshold, autoHideDelay, sidebarWidth]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [enabled, handleMove]);

  return { isOpen, setIsOpen, edgeMeta };
}
