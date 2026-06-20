import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Zap, Trophy } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  iconType: 'MILESTONE' | 'MULTIPLIER' | 'JACKPOT';
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function NotificationToast({ toasts, onRemove }: NotificationToastProps) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-80 max-w-[calc(100vw-3rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          let Icon = Award;
          let colorClass = 'border-yellow-500/30 text-yellow-400 bg-yellow-950/20 shadow-[0_0_15px_rgba(234,179,8,0.15)]';
          
          if (toast.iconType === 'MULTIPLIER') {
            Icon = Zap;
            colorClass = 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
          } else if (toast.iconType === 'JACKPOT') {
            Icon = Trophy;
            colorClass = 'border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-950/20 shadow-[0_0_15px_rgba(217,70,239,0.15)]';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
              layout
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md flex gap-3 items-start shadow-2xl ${colorClass}`}
            >
              <div className="p-2 rounded-lg bg-black/40 border border-white/5 shrink-0">
                <Icon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black tracking-widest uppercase mb-1">{toast.title}</h4>
                <p className="text-[10px] text-zinc-300 font-mono leading-relaxed">{toast.description}</p>
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="text-[9px] text-zinc-500 hover:text-zinc-200 transition-colors uppercase font-mono py-0.5 px-1 bg-black/20 rounded cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
