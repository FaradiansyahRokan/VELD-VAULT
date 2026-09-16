"use client";

import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

// Helper class
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  disabled,
  isLoading,
  className,
  size = 'md',
  ...props
}: any) => {
  const sizes = {
    sm: "px-3.5 py-1.5 text-xs rounded-xl",
    md: "px-5 py-2.5 text-sm rounded-2xl",
    lg: "px-6 py-3.5 text-base rounded-2xl",
    icon: "p-2.5 rounded-full aspect-square",
  };

  const variants = {
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm",
    secondary: "bg-[#7692FF]/10 dark:bg-background/60 text-foreground font-medium border border-[#7692FF]/20 hover:bg-[#7692FF]/20 dark:hover:bg-background/90",
    glass: "enterprise-glass text-foreground font-medium hover:bg-white/90 dark:hover:bg-card/80 shadow-sm",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 font-medium border border-red-500/20 hover:bg-red-500/20",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-[#7692FF]/10 font-medium",
    success: "bg-emerald-500 text-primary-foreground font-semibold hover:bg-emerald-600 shadow-md shadow-emerald-500/20",
    outline: "border border-border text-foreground font-medium hover:bg-muted/50",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "relative flex items-center justify-center gap-2 select-none transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#7692FF]/40 cursor-pointer",
        sizes[size as keyof typeof sizes] || sizes.md,
        variants[variant as keyof typeof variants] || variants.primary,
        (disabled || isLoading) && "opacity-50 pointer-events-none cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </motion.button>
  );
};

export const Input = ({ label, error, className, ...props }: any) => (
  <div className="space-y-1.5 w-full">
    {label && (
      <label className="text-xs font-semibold text-muted-foreground px-1 tracking-tight">
        {label}
      </label>
    )}
    <input
      className={cn(
        "w-full bg-black/[0.03] dark:bg-background/60 text-foreground px-4 py-3 rounded-2xl border border-border focus:border-[#7692FF] focus:ring-4 focus:ring-[#7692FF]/20 outline-none transition-all placeholder:text-muted-foreground/50 text-sm font-medium",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500/15",
        className
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 px-1">{error}</p>}
  </div>
);

export const Badge = ({ children, color = 'zinc', className }: any) => {
  const colors = {
    zinc: "bg-black/5 dark:bg-background/80 text-muted-foreground border-border",
    blue: "bg-primary/10 text-[#1B2CC1] dark:text-[#ABD2FA] border-[#1B2CC1]/20 dark:border-[#7692FF]/30",
    azure: "bg-[#ABD2FA]/15 text-[#091540] dark:text-[#ABD2FA] border-[#ABD2FA]/30",
    periwinkle: "bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#7692FF] border-[#7692FF]/30",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border backdrop-blur-md shadow-xs",
        colors[color as keyof typeof colors] || colors.zinc,
        className
      )}
    >
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className={cn(
          "relative w-full bg-card/95 border border-border p-6 md:p-8 rounded-[28px] shadow-2xl z-10 overflow-hidden backdrop-blur-2xl",
          maxWidth
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">{title}</h3>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-[#7692FF]/15 flex items-center justify-center hover:bg-black/10 dark:hover:bg-[#7692FF]/25 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={16} />
          </motion.button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};