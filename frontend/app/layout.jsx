export const metadata = {
  title: "ClearTerms – Make lawyer slop customer friendly",
  description: "Sprawdzamy bezpieczeństwo stron internetowych i edukujemy jak chronić siebie i bliskich przed cyberzagrożeniami.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡</text></svg>" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
