"use client";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <html lang="en" className={theme}>
      <head>
        <title>raone — Personal AI Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e4e4ef; height: 100vh; overflow: hidden; }
          .dark body { background: #0a0a0f; color: #e4e4ef; }
          .light body { background: #f5f5fa; color: #1a1a2e; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
