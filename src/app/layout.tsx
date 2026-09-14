import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

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
    <html lang="tr" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
