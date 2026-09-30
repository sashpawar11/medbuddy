import React, { useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { SidebarTooltip } from './SidebarTooltip';

// --------------------------------------------------------------------------
// SidebarRoot
// --------------------------------------------------------------------------
export interface SidebarRootProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  allowResize?: boolean;
}

export const SidebarRoot: React.FC<SidebarRootProps> = ({
  children,
  allowResize = true,
  className = '',
  style,
  ...rest
}) => {
  const {
    state,
    width,
    isPinned,
    isPeeking,
    isExpandedOrPeeking,
    setExpandedWidth,
    setPinned,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur,
    handleKeyDown,
  } = useSidebar();

  const isResizingRef = useRef(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = moveEvent.clientX;
      if (newWidth < 140) {
        // Snap to collapsed!
        setPinned(false);
      } else {
        if (!isPinned) {
          setPinned(true);
        }
        const clamped = Math.min(Math.max(newWidth, 200), 420);
        setExpandedWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <aside
      data-state={state}
      role="navigation"
      aria-label="Sidebar navigation"
      aria-expanded={isExpandedOrPeeking}
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        width: `${width}px`,
        ...style,
      }}
      className={`group/sidebar h-full flex flex-col shrink-0 select-none font-sans relative outline-none bg-surface-recessed border-r border-border transition-[width,box-shadow] duration-280 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        state === 'peeking'
          ? 'shadow-[4px_0_24px_-4px_rgba(20,25,38,0.12)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.6)] z-30'
          : 'z-20'
      } print:hidden ${className}`}
      {...rest}
    >
      {/* Resizable Edge Handle */}
      {allowResize && (
        <div
          onMouseDown={handleMouseDownResize}
          onDoubleClick={() => setExpandedWidth(256)}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-vault-500/40 active:bg-vault-500 transition-colors z-40 select-none group-hover/sidebar:opacity-100"
          title="Drag to resize sidebar (double-click to reset, drag left to collapse)"
        />
      )}

      {children}
    </aside>
  );
};

// --------------------------------------------------------------------------
// SidebarHeader
// --------------------------------------------------------------------------
export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div
      className={`h-14 px-3.5 border-b border-border flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-xs transition-colors overflow-hidden ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

// --------------------------------------------------------------------------
// SidebarContent
// --------------------------------------------------------------------------
export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden px-2 py-2.5 space-y-1 scrollbar-thin ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

// --------------------------------------------------------------------------
// SidebarGroup & SidebarGroupLabel
// --------------------------------------------------------------------------
export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SidebarGroup: React.FC<SidebarGroupProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div className={`space-y-0.5 ${className}`} {...rest}>
      {children}
    </div>
  );
};

export interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const SidebarGroupLabel: React.FC<SidebarGroupLabelProps> = ({
  children,
  action,
  className = '',
  ...rest
}) => {
  const { isExpandedOrPeeking } = useSidebar();

  return (
    <div
      className={`flex items-center justify-between px-2.5 text-caption font-semibold uppercase tracking-wider text-tertiary transition-all duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden select-none ${
        isExpandedOrPeeking
          ? 'max-h-7 opacity-100 py-1 mb-0.5'
          : 'max-h-0 opacity-0 py-0 mb-0 pointer-events-none'
      } ${className}`}
      {...rest}
    >
      <span className="truncate">{children}</span>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export interface SidebarGroupContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SidebarGroupContent: React.FC<SidebarGroupContentProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div className={`space-y-0.5 ${className}`} {...rest}>
      {children}
    </div>
  );
};

// --------------------------------------------------------------------------
// SidebarItem
// --------------------------------------------------------------------------
export interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  badge?: React.ReactNode;
  tooltip?: string;
  action?: React.ReactNode;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  active = false,
  badge,
  tooltip,
  action,
  onClick,
  className = '',
  ...rest
}) => {
  const { isExpandedOrPeeking, closePeekImmediate, isPeeking } = useSidebar();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    // If user clicked an item while peeking, keep or close as appropriate
  };

  const itemContent = (
    <button
      type="button"
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={`w-full group/item flex items-center justify-between px-2.5 py-1.5 rounded-md text-body transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-vault-500/50 ${
        active
          ? 'bg-vault-50 dark:bg-vault-950/70 text-vault-700 dark:text-vault-300 font-semibold shadow-2xs border border-vault-200/60 dark:border-vault-800/60'
          : 'text-secondary hover:bg-surface-hover hover:text-primary font-medium border border-transparent'
      } ${className}`}
      {...rest}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
            active ? 'text-vault-600 dark:text-vault-400' : 'text-tertiary group-hover/item:text-primary'
          }`}
        >
          {icon}
        </div>
        <div
          className={`truncate transition-all duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] text-left ${
            isExpandedOrPeeking
              ? 'opacity-100 translate-x-0 max-w-[180px]'
              : 'opacity-0 -translate-x-2 max-w-0 pointer-events-none'
          }`}
        >
          {label}
        </div>
      </div>

      {isExpandedOrPeeking && (badge || action) && (
        <div className="flex items-center gap-1.5 shrink-0 ml-1 transition-opacity duration-200">
          {badge}
          {action}
        </div>
      )}
    </button>
  );

  // Show tooltip when collapsed and NOT peeking
  if (tooltip && !isExpandedOrPeeking) {
    return (
      <SidebarTooltip content={tooltip} enabled={!isExpandedOrPeeking}>
        {itemContent}
      </SidebarTooltip>
    );
  }

  return itemContent;
};

// --------------------------------------------------------------------------
// SidebarFooter
// --------------------------------------------------------------------------
export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <div
      className={`px-2 py-2 border-t border-border shrink-0 bg-surface/50 space-y-1 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

// --------------------------------------------------------------------------
// SidebarToggle
// --------------------------------------------------------------------------
export interface SidebarToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({ className = '', ...rest }) => {
  const { isPinned, isPeeking, togglePin } = useSidebar();

  const tooltipText = isPinned ? 'Unpin sidebar (⌘B)' : 'Pin sidebar (⌘B)';

  return (
    <SidebarTooltip content={tooltipText} delayMs={200}>
      <button
        type="button"
        onClick={togglePin}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-sm bg-surface border border-border text-secondary hover:text-primary hover:bg-surface-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-vault-500/40 ${
          !isPinned && isPeeking
            ? 'text-vault-600 dark:text-vault-300 border-vault-300 dark:border-vault-700 bg-vault-50 dark:bg-vault-950/60'
            : ''
        } ${className}`}
        title={tooltipText}
        aria-label={tooltipText}
        {...rest}
      >
        {isPinned ? (
          <PanelLeftClose className="w-4 h-4 text-secondary hover:text-primary transition-transform" strokeWidth={1.75} />
        ) : (
          <PanelLeftOpen
            className={`w-4 h-4 transition-transform ${
              isPeeking ? 'text-vault-600 dark:text-vault-400' : 'text-secondary hover:text-primary'
            }`}
            strokeWidth={1.75}
          />
        )}
      </button>
    </SidebarTooltip>
  );
};

