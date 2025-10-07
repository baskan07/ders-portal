// components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // mounted olmadan tema bilinmiyor; boş (opacity-0) render ederek layout kaymasını önlüyoruz
  if (!mounted) {
    return (
      <button
        aria-label="Temayı değiştir"
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 opacity-0"
      >
        <SunIcon className="h-5 w-5" />
        <span className="text-sm">Tema</span>
      </button>
    );
  }

  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5 transition"
      aria-label="Temayı değiştir"
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
      <span className="text-sm">{isDark ? "Açık" : "Koyu"}</span>
    </button>
  );
}
