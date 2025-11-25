import type { Metadata } from "next";
import "./globals.css";
import DevNavigation from "@/components/DevNavigation";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "OAuth Authentication POC",
  description: "Firebase OAuth authentication proof of concept",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        <Providers>
          <DevNavigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
