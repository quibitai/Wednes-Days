import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dog Custody Scheduler',
  description: 'Manage shared custody schedule for your beloved dog',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
} 