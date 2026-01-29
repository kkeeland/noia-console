import { motion } from 'framer-motion';

type BadgeVariant = 'online' | 'offline' | 'active' | 'idle' | 'error';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  pulse?: boolean;
}

const config: Record<BadgeVariant, { dot: string; bg: string; text: string; label: string }> = {
  online:  { dot: 'bg-green-500',  bg: 'bg-green-500/10',  text: 'text-green-400',  label: 'Online' },
  offline: { dot: 'bg-zinc-500',   bg: 'bg-zinc-500/10',   text: 'text-zinc-400',   label: 'Offline' },
  active:  { dot: 'bg-[#8b5cf6]',  bg: 'bg-[#8b5cf6]/10',  text: 'text-[#a78bfa]',  label: 'Active' },
  idle:    { dot: 'bg-amber-500',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  label: 'Idle' },
  error:   { dot: 'bg-red-500',    bg: 'bg-red-500/10',    text: 'text-red-400',    label: 'Error' },
};

export function Badge({ variant, label, pulse }: BadgeProps) {
  const c = config[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <motion.span
            className={`absolute inset-0 rounded-full ${c.dot} opacity-75`}
            animate={{ scale: [1, 1.8], opacity: [0.75, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`} />
      </span>
      {label ?? c.label}
    </span>
  );
}
