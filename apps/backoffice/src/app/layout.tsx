import type { Metadata } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/query/provider';
import { Toaster } from '@/lib/api/toast';

const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-source-sans',
  display: 'swap'
});

export const metadata: Metadata = {
  title: { template: '%s · Hosteleria Studio', default: 'Hosteleria Studio' },
  description: 'Backoffice del grupo de restauración.',
  robots: { index: false, follow: false }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={sourceSans.variable}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors closeButton position="bottom-right" />
      </body>
    </html>
  );
}
