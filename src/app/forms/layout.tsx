export default function FormsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Formulário - Customer Success</title>
      </head>
      <body>
        {/* Layout sem sidebar para formulários públicos */}
        {children}
      </body>
    </html>
  )
}