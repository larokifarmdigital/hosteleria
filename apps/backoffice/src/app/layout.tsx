import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/query/provider';
import { Toaster } from '@/lib/api/toast';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Hosteleria Studio',
  description: 'Backoffice del grupo de restauración.',
  robots: { index: false, follow: false }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={manrope.variable}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors closeButton position="bottom-right" />
      </body>
    </html>
  );
}
