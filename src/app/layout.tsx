import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../styles/globals.css";

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mohamik – منصة المحامين الموثّقة", template: "%s | Mohamik" },
  description:
    "منصة قانونية موثّقة لمكاتب المحاماة: إدارة القضايا، موقع بهوية المكتب، بوابة عملاء خاصة، وعزل كامل لبيانات كل مكتب.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${amiri.variable} ${plex.variable}`}>
      <body className="bg-paper font-arabic-body text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
