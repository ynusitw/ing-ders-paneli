import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ders Paneli",
  description: "Öğretmen-öğrenci ders talep ve görüşme platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
