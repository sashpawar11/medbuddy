import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type SidebarState = 'expanded' | 'collapsed' | 'peeking';

export interface SidebarContextValue {
  isPinned: boolean;
  isPeeking: boolean;
  state: SidebarState;
  isExpandedOrPeeking: boolean;
  width: number;
  collapsedWidth: number;
  expandedWidth: number;
  togglePin: () => void;
  setPinned: (pinned: boolean) => void;
  startPeeking: () => void;
  stopPeeking: (delayMs?: number) => void;
  cancelStopPeeking: () => void;
  closePeekImmediate: () => void;
  setExpandedWidth: (width: number) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleFocus: (e: React.FocusEvent) => void;
  handleBlur: (e: React.FocusEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export interface SidebarProviderProps {
  children: React.ReactNode;
  defaultPinned?: boolean;
  isCollapsedControlled?: boolean;
  onToggleCollapseControlled?: () => void;
  defaultExpandedWidth?: number;
  collapsedWidth?: number;
  storageKey?: string;
  peekLeaveDelayMs?: number;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  defaultPinned,
  isCollapsedControlled,
  onToggleCollapseControlled,
  defaultExpandedWidth = 256,
  collapsedWidth = 58,
  storageKey = 'medbuddy-sidebar-collapsed',
  peekLeaveDelayMs = 180,
}) => {
  // Pinned state (persisted to localStorage)
  const [isPinnedInternal, setIsPinnedInternal] = useState<boolean>(() => {
    if (isCollapsedControlled !== undefined) {
      return !isCollapsedControlled;
    }
    if (defaultPinned !== undefined) {
      return defaultPinned;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored !== 'true'; // if stored 'true' (isCollapsed), pinned is false
      }
    } catch {
      // ignore
    }
    return true; // default expanded
  });

  // Keep internal state synced if externally controlled
  useEffect(() => {
    if (isCollapsedControlled !== undefined) {
      setIsPinnedInternal(!isCollapsedControlled);
    }
  }, [isCollapsedControlled]);

  const isPinned = isCollapsedControlled !== undefined ? !isCollapsedControlled : isPinnedInternal;

  // Peeking state (temporary expansion on hover/focus while collapsed)
  const [isPeeking, setIsPeeking] = useState<boolean>(false);

  // Custom expanded width with persistence
  const [expandedWidth, setExpandedWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('medbuddy-sidebar-width');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 200 && val <= 400) {
          return val;
        }
      }
    } catch {}
    return defaultExpandedWidth;
  });

  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive effective state
  const state: SidebarState = isPinned ? 'expanded' : isPeeking ? 'peeking' : 'collapsed';
  const isExpandedOrPeeking = isPinned || isPeeking;
  const width = isExpandedOrPeeking ? expandedWidth : collapsedWidth;

  const setPinned = useCallback(
    (pinned: boolean) => {
      setIsPinnedInternal(pinned);
      setIsPeeking(false);
      try {
        localStorage.setItem(storageKey, String(!pinned));
      } catch {}
      if (onToggleCollapseControlled && isCollapsedControlled !== !pinned) {
        onToggleCollapseControlled();
      }
    },
    [isCollapsedControlled, onToggleCollapseControlled, storageKey]
  );

  const togglePin = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    // If peeking, clicking toggle button immediately pins it open!
    if (isPeeking) {
      setPinned(true);
      return;
    }
    setPinned(!isPinned);
  }, [isPeeking, isPinned, setPinned]);

  const startPeeking = useCallback(() => {
    if (isPinned) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsPeeking(true);
  }, [isPinned]);

  const cancelStopPeeking = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const stopPeeking = useCallback(
    (delayMs = peekLeaveDelayMs) => {
      if (isPinned) return;
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
      leaveTimerRef.current = setTimeout(() => {
        setIsPeeking(false);
        leaveTimerRef.current = null;
      }, delayMs);
    },
    [isPinned, peekLeaveDelayMs]
  );

  const closePeekImmediate = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsPeeking(false);
  }, []);

  // Mouse handlers for peek
  const handleMouseEnter = useCallback(() => {
    if (!isPinned) {
      startPeeking();
    } else {
      cancelStopPeeking();
    }
  }, [isPinned, startPeeking, cancelStopPeeking]);

  const handleMouseLeave = useCallback(() => {
    if (!isPinned) {
      stopPeeking();
    }
  }, [isPinned, stopPeeking]);

  // Focus handlers for keyboard accessibility
  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      if (!isPinned) {
        startPeeking();
      }
    },
    [isPinned, startPeeking]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (isPinned) return;
      // Check if the new focused element is still within the sidebar
      const currentTarget = e.currentTarget;
      requestAnimationFrame(() => {
        if (!currentTarget.contains(document.activeElement)) {
          stopPeeking(120);
        }
      });
    },
    [isPinned, stopPeeking]
  );

  // Keyboard shortcut listener
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && isPeeking) {
        e.preventDefault();
        closePeekImmediate();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        togglePin();
      }
    },
    [isPeeking, closePeekImmediate, togglePin]
  );

  // Global window listener for Cmd/Ctrl+B and Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        togglePin();
      } else if (e.key === 'Escape' && isPeeking) {
        closePeekImmediate();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [togglePin, isPeeking, closePeekImmediate]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const handleSetExpandedWidth = useCallback((newWidth: number) => {
    setExpandedWidth(newWidth);
    try {
      localStorage.setItem('medbuddy-sidebar-width', String(newWidth));
    } catch {}
  }, []);

  const value: SidebarContextValue = {
    isPinned,
    isPeeking,
    state,
    isExpandedOrPeeking,
    width,
    collapsedWidth,
    expandedWidth,
    togglePin,
    setPinned,
    startPeeking,
    stopPeeking,
    cancelStopPeeking,
    closePeekImmediate,
    setExpandedWidth: handleSetExpandedWidth,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur,
    handleKeyDown,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = (): SidebarContextValue => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
