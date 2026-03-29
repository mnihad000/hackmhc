import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import GlobalChatWidget from "@/components/GlobalChatWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-100">
        <AuthProvider>
          {children}
          <GlobalChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
