import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface SidebarTooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  enabled?: boolean;
  delayMs?: number;
  sideOffset?: number;
}

export const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  children,
  content,
  enabled = true,
  delayMs = 300,
  sideOffset = 10,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setIsVisible(false);
  }, [clearTimer]);

  const show = useCallback(() => {
    if (!enabled || !content) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + sideOffset,
        });
        setIsVisible(true);
      }
    }, delayMs);
  }, [enabled, content, clearTimer, delayMs, sideOffset]);

  useEffect(() => {
    if (!enabled && isVisible) {
      hide();
    }
  }, [enabled, isVisible, hide]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Clone child with ref and event handlers
  const child = React.isValidElement(children) ? children : <span>{children}</span>;

  const childWithEvents = React.cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      targetRef.current = node;
      // Call original ref if exists
      const originalRef = (child as any).ref;
      if (typeof originalRef === 'function') {
        originalRef(node);
      } else if (originalRef && typeof originalRef === 'object') {
        originalRef.current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      child.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      child.props.onMouseLeave?.(e);
      hide();
    },
    onClick: (e: React.MouseEvent) => {
      child.props.onClick?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      child.props.onFocus?.(e);
      show();
    },
    onBlur: (e: React.FocusEvent) => {
      child.props.onBlur?.(e);
      hide();
    },
  });

  return (
    <>
      {childWithEvents}
      {isVisible && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: 'translateY(-50%)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
            className="animate-fade-in flex items-center"
          >
            <div className="bg-ink-900 text-white dark:bg-ink-950 dark:text-ink-100 text-[12px] font-medium px-2.5 py-1 rounded shadow-md border border-ink-800/80 dark:border-ink-800 whitespace-nowrap select-none">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
