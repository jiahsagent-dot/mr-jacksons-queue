import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: "Mr Jackson — Modern Brunch · Mornington",
  description: "Book a table, join the queue, order & pay — all from your phone. Mr Jackson, 1/45 Main St, Mornington VIC.",
  openGraph: {
    title: "Mr Jackson — Modern Brunch · Mornington",
    description: "Book a table, join the queue, order & pay — all from your phone.",
    type: "website",
  },
  appleWebApp: {
    title: "Mr Jackson",
    capable: true,
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1c1917',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#faf8f5',
              color: '#1a1208',
              border: '1px solid #e7e2da',
              borderRadius: '16px',
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            },
            success: {
              iconTheme: { primary: '#16a34a', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#dc2626', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}
