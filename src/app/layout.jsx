import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'WeTrack - Video Course Tracker',
  description: 'Track your video course progress',
  icons: {
    icon: '/images/logo.png',
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col text-colortext bg-primary min-h-screen">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
