import "./globals.css";

export const metadata = {
  title: "ALTIN.S1 Analyzer",
  description: "ALTIN.S1 teorik değer ve prim analizi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}