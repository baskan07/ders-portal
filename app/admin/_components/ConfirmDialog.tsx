"use client";

import { useEffect, useRef, useState } from "react";

type Pending = { form: HTMLFormElement; message: string; title?: string } | null;

export default function ConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onSubmit = (e: Event) => {
      const el = e.target as Element | null;
      if (!(el instanceof HTMLFormElement)) return;

      // Eğer bu submit zaten onaylanmışsa, engelleme ve bayrağı temizle
      if (el.getAttribute("data-confirmed") === "true") {
        el.removeAttribute("data-confirmed");
        return; // normal akış
      }

      const message = el.getAttribute("data-confirm");
      if (!message) return; // onay gerekmeyen formlar

      const title = el.getAttribute("data-confirm-title") || "Silme işlemini onayla";

      // Normal submit'i durdurup modalı aç
      e.preventDefault();
      e.stopPropagation();
      setPending({ form: el, message, title });
      setOpen(true);
    };

    // capture fazında dinle (kesin yakalamak için)
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  const close = () => {
    setOpen(false);
    setTimeout(() => setPending(null), 150);
  };

  const confirm = () => {
    if (pending?.form) {
      // Bu formun bir sonraki submit'ini serbest bırak
      pending.form.setAttribute("data-confirmed", "true");
      // Programatik submit
      pending.form.requestSubmit();
    }
    close();
  };

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !pending) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Arkaplan */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[92%] max-w-md rounded-2xl border border-white/10 bg-white/90 p-5 shadow-2xl backdrop-blur dark:bg-slate-900/90"
      >
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{pending.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{pending.message}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bu işlem <b>geri alınamaz</b>.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={close}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition dark:bg-white/5 dark:hover:bg-white/10"
          >
            Vazgeç
          </button>
          <button
            onClick={confirm}
            className="rounded-xl bg-red-600/90 px-4 py-2 text-sm text-white hover:bg-red-600 transition"
          >
            Evet, sil
          </button>
        </div>
      </div>
    </div>
  );
}
