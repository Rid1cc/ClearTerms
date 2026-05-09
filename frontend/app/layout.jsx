import "./globals.css";

export const metadata = {
  title: "ClearTerms – Liquid Glass Security",
  description: "Security analysis of websites and privacy policies using AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡</text></svg>" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
