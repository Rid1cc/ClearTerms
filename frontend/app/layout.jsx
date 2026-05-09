import "./globals.css";
import AuthSync from "./components/AuthSync";
import Ambient from "./components/Ambient";

export const metadata = {
  title: "ClearTerms",
  description: "Security analysis of websites and privacy policies using AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body suppressHydrationWarning>
        <Ambient />
        <AuthSync />
        {children}
      </body>
    </html>
  );
}
