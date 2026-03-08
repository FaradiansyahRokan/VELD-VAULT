import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

// Helper class
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export const Button = ({ children, onClick, variant = 'primary', disabled, isLoading, className, ...props }: any) => {
  const base = "relative px-6 py-3 font-semibold text-sm flex items-center justify-center gap-2 select-none active:scale-95 transition-transform duration-100";

  const variants = {
    // Menggunakan var(--primary) agar adaptif dark/light
    primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 rounded-none",
    secondary: "bg-muted text-foreground hover:bg-muted/80 border border-border rounded-none",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-none",
    ghost: "text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-none",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 rounded-none"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(base, variants[variant as keyof typeof variants], className, (disabled || isLoading) && "opacity-50 pointer-events-none")}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
};

export const Input = ({ label, ...props }: any) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground ml-3">{label}</label>}
    <input
      className="w-full bg-muted/40 focus:bg-muted text-foreground px-5 py-4 rounded-none border border-transparent focus:border-primary/20 focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 text-sm font-medium"
      {...props}
    />
  </div>
);

export const Badge = ({ children, color = 'zinc' }: any) => {
  const colors = {
    zinc: "bg-muted text-muted-foreground border-border",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  return (
    <span className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md rounded-none", colors[color as keyof typeof colors])}>
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="relative w-full max-w-md bg-card border border-border p-6 rounded-none shadow-2xl z-10 overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-none bg-muted flex items-center justify-center hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};