import { motion } from 'framer-motion';
import { Spinner } from './ui/Spinner';

interface SplashScreenProps {
  status?: string;
}

export function SplashScreen({ status = 'Connecting to gateway…' }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0f]">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Logo */}
      <motion.div
        className="relative mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Noia "N" mark */}
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
          }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(139, 92, 246, 0.3)',
              '0 0 60px rgba(139, 92, 246, 0.5)',
              '0 0 40px rgba(139, 92, 246, 0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-white">N</span>
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        className="text-xl font-semibold text-[#e4e4e7] mb-2 tracking-tight"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Noia Console
      </motion.h1>

      {/* Spinner + status */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Spinner size="sm" label={status} />
      </motion.div>
    </div>
  );
}
