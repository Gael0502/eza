import { X } from "lucide-react";
import { useEffect, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-forest-700 text-white hover:bg-forest-800",
    secondary: "border border-slate-200 bg-white text-forest-800 hover:border-fresh-300 hover:bg-fresh-50",
    ghost: "text-forest-800 hover:bg-fresh-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
  }[variant];
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-px hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-fresh-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button className="absolute inset-0 bg-forest-950/50" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] border border-white/70 bg-white shadow-2xl shadow-forest-950/20 sm:rounded-[1.75rem] ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-forest-900">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-slate-700">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm shadow-slate-900/[0.02] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-forest-600 focus:ring-4 focus:ring-fresh-500/10";

export function TextField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-800">{label}</span>
      <input className={fieldClass} aria-invalid={Boolean(error)} {...props} />
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-800">{label}</span>
      <select className={fieldClass} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-forest-800">{label}</span>
      <textarea className={`${fieldClass} min-h-28 resize-y`} aria-invalid={Boolean(error)} {...props} />
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/15 bg-forest-900/80 px-5 py-5 text-white shadow-lg shadow-forest-950/10 backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
      <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-fresh-300">EZA workspace</p>
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-white/80 bg-white/70 px-6 py-16 text-center shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-fresh-50 text-forest-700 ring-8 ring-fresh-50/60">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold text-forest-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SampleBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Example
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`eza-card rounded-2xl border border-white/80 bg-white/70 p-5 shadow-card backdrop-blur-lg sm:p-6 ${className}`}>{children}</section>;
}

export function StatusPill({ status }: { status: "planned" | "active" | "completed" | "overdue" }) {
  const styles = {
    planned: "bg-slate-100 text-slate-700",
    active: "bg-fresh-100 text-forest-800",
    completed: "bg-forest-800 text-white",
    overdue: "bg-amber-100 text-amber-950",
  }[status];
  const label = {
    planned: "Planned",
    active: "Active",
    completed: "Harvested",
    overdue: "Harvest due",
  }[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
      <div className="h-full rounded-full bg-forest-700" style={{ width: `${value}%` }} />
    </div>
  );
}
