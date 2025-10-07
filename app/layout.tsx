import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Ders Portal",
  description: "Ders içerikleri ve quizler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {/* Header */}
          <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/30 border-b border-black/10">
            <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
              <a href="/" className="font-bold text-lg">Ders Portal</a>
              <nav className="flex items-center gap-3">
                <a href="/admin" className="text-sm text-gray-600 dark:text-slate-300 hover:underline">
                  Admin
                </a>
                <ThemeToggle />
              </nav>
            </div>
          </header>

          {/* Ana içerik */}
          <main className="mx-auto max-w-5xl px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-black/10">
            <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500 dark:text-slate-400">
              © {new Date().getFullYear()} Ders Portal
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}

