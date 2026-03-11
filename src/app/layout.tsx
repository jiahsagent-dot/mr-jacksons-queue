import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: "Mr Jackson — Mornington",
  description: "Join the queue at Mr Jackson, Mornington. No app required.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#faf8f5',
              color: '#1a1208',
              border: '1px solid #e7e2da',
              borderRadius: '12px',
              fontFamily: 'Georgia, serif',
            },
          }}
        />
      </body>
    </html>
  )
}
