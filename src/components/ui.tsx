import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const field =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-base text-ink focus:border-copper";

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(field, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(field, "min-h-24", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(field, props.className)} />;
}

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "sand" }) {
  const look = {
    primary: "bg-copper text-paper hover:bg-copper-deep",
    ghost: "text-ink-2 hover:bg-sand",
    sand: "bg-sand text-ink hover:bg-sand-2",
  }[variant];
  return (
    <button
      {...props}
      data-variant={variant}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50",
        look,
        props.className,
      )}
    />
  );
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("cartao rounded-2xl border border-line bg-cream p-5", className)}>{children}</section>;
}

export function Erro({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">{children}</p>;
}
