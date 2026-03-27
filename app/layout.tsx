import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediQueue+",
  description: "AI-Powered QoS Priority Triage System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('mq-theme');
            if (t === 'light' || t === 'dark') {
              document.documentElement.setAttribute('data-theme', t);
            } else {
              var sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
              document.documentElement.setAttribute('data-theme', sys);
            }
          } catch(e) {}
        `}} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}