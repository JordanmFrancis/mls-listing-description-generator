import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Listing Desk — MLS Listing Generator",
  description: "Three compositions drafted from the particulars you provide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Runs before React hydration to set the theme class on <html>. Prevents a
  // flash of the wrong theme. Default is light; only applies dark when the
  // user has explicitly chosen it (ld-theme === "dark") — OS preference is
  // NOT honored as a default per the app's brand direction. Anything thrown
  // (private mode, SSR edges) is swallowed because we'd rather ship
  // light-by-default than crash.
  const noFlashScript = `
(function(){try{
var s=localStorage.getItem('ld-theme');
if(s==='dark')document.documentElement.classList.add('dark');
}catch(e){}})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
