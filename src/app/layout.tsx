import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ders Paneli",
  description: "Öğretmen-öğrenci ders talep ve görüşme platformu",
};

// Tema (localStorage'daki "theme") sayfa boyanmadan önce uygulanır, flaş yaşanmaz.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    var dark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
