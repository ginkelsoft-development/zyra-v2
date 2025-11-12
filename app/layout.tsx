import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import ConditionalNav from '@/components/ConditionalNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Zyra v2.0 - AI Workflow Orchestrator',
  description: 'Drag and drop AI agents to build workflows',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <ConditionalNav />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
