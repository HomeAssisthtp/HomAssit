import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-accent to-accent-strong text-[#04121a] font-semibold shadow-[0_8px_24px_-10px_rgb(79_209_232/0.7),inset_0_1px_0_rgb(255_255_255/0.35)] hover:brightness-110",
        glass: "glass text-ink hover:bg-white/10 hover:border-line-strong",
        ghost: "text-ink-muted hover:text-ink hover:bg-white/6",
        danger:
          "bg-danger/90 text-white font-semibold shadow-[0_8px_24px_-10px_rgb(255_93_108/0.7),inset_0_1px_0_rgb(255_255_255/0.25)] hover:bg-danger",
        success: "bg-ok/15 text-ok border border-ok/30 hover:bg-ok/22",
        outline: "border border-line-strong text-ink hover:bg-white/6",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-[0.95rem]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "glass", size: "md" },
  },
);

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function GlassButton({ className, variant, size, asChild, loading, disabled, children, ...props }: GlassButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
