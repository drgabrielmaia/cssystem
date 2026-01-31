export default function FormsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Layout sem sidebar para formulários públicos */}
      {children}
    </div>
  )
}