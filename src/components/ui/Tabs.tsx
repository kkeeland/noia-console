import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const currentTab = activeTab ?? tabs[0]?.id;

  const updateUnderline = useCallback(() => {
    const el = tabRefs.current.get(currentTab);
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setUnderline({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [currentTab]);

  useEffect(() => {
    updateUnderline();
  }, [updateUnderline]);

  return (
    <div ref={containerRef} className="relative flex gap-1 border-b border-[#1e1e2e]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el);
          }}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            currentTab === tab.id
              ? 'text-[#e4e4e7]'
              : 'text-[#71717a] hover:text-[#a1a1aa]'
          }`}
        >
          {tab.label}
        </button>
      ))}

      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 h-0.5 bg-[#8b5cf6] rounded-full"
        animate={{ left: underline.left, width: underline.width }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </div>
  );
}
