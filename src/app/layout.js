export const metadata = {
  title: 'Corporación Madake SA de CV',
  description: 'Servicios profesionales de seguridad privada en México. Personal certificado, operación 24/7. Cotización gratuita.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}