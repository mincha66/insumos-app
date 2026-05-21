import './globals.css'

export const metadata = {
  title: 'Insumos',
  description: 'Sistema de gestión de insumos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
