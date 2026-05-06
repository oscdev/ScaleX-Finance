import type { Metadata } from 'next';
import './globals.css';
import Header from './components/Header';
import Footer from './components/Footer';
import MaintenanceShield from './components/MaintenanceShield';

export const metadata: Metadata = {
  title: 'ScaleX Finance - MVP Homepage',
  description: 'Join ScaleX Finance today. Apply now or become an advisor.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MaintenanceShield />
        <Header />
        <main className="main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
