"use client";

import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel?: string;
  variant?: "default" | "danger";
  className?: string;
};

export default function SubmitButton({
  label,
  pendingLabel = "İşleniyor...",
  variant = "default",
  className = "",
}: Props) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "danger"
      ? "bg-red-600/90 text-white hover:bg-red-600 border border-red-700/30"
      : "border border-white/10 bg-white/10 hover:bg-white/20";

  return (
    <button type="submit" className={`${base} ${styles} ${className}`} disabled={pending}>
      {pending && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}
