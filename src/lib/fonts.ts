import { Bodoni_Moda, Geist, Geist_Mono, UnifrakturMaguntia } from "next/font/google";

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const brand = UnifrakturMaguntia({
  variable: "--font-brand",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const editorial = Bodoni_Moda({
  variable: "--font-editorial",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});
