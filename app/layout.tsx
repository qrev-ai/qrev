import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "QRev Lite",
  description: "Fast, minimal quarterly business review dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-1 text-text-primary antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#2F3136",
              color: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
            },
            success: {
              iconTheme: {
                primary: "#4ADE80",
                secondary: "#2F3136",
              },
            },
            error: {
              iconTheme: {
                primary: "#F87171",
                secondary: "#2F3136",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
