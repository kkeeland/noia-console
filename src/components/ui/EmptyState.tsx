import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {icon && (
        <div className="mb-4 text-[#71717a] text-4xl">{icon}</div>
      )}
      <h3 className="text-lg font-medium text-[#e4e4e7] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#71717a] max-w-sm">{description}</p>
      )}
      {action && (
        <motion.button
          className="mt-6 px-4 py-2 text-sm font-medium rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
