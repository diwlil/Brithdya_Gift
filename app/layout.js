import { Outfit, Bricolage_Grotesque, Patrick_Hand } from "next/font/google";
import "./globals.css";
const outfit = Outfit({ subsets: ["latin"], variable: "--f-body" });
const brico = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-head", weight: ["700", "800"] });
const hand = Patrick_Hand({ subsets: ["latin"], variable: "--f-hand", weight: "400" });
export const metadata = { title: "A little something, for you 🎂", description: "Happy Birthday!" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${brico.variable} ${hand.variable}`}>{children}</body>
    </html>
  );
}
