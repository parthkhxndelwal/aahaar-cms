"use client"
import { Sidebar } from "@/components/app/sidebar"
import { BottomNavigation } from "@/components/app/bottom-navigation"
import { BottomNavProvider } from "@/contexts/bottom-nav-context"
import { CartProvider } from "@/contexts/cart-context"
import { use } from "react"
import { usePathname } from "next/navigation"

export default function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ courtId: string }>
}) {
  const { courtId } = use(params)
  const pathname = usePathname()
  const isLoginPage = pathname.endsWith("/login")
  const isCartPage = pathname.endsWith("/cart")

  return (
    <CartProvider>
      <BottomNavProvider>
        <div className="min-h-screen dark bg-neutral-950 flex w-full max-w-full overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 flex flex-col w-full max-w-full overflow-hidden">
            <main className={`flex-1 ${isCartPage ? 'p-0' : 'p-4 md:p-6 pb-20 md:pb-6'} mx-auto w-full flex justify-center overflow-hidden`}>
              <div className={isCartPage ? 'w-full md:max-w-[70%] lg:max-w-[60%] xl:max-w-[50%]' : 'w-full md:max-w-[70%] lg:max-w-[60%] xl:max-w-[50%]'}>
                {children}
              </div>
            </main>
            {/* Mobile Bottom Navigation - hidden on desktop, login page, and cart page */}
            {!isLoginPage && !isCartPage && (
              <div className="">
                <BottomNavigation courtId={courtId} />
              </div>
            )}
          </div>
        </div>
      </BottomNavProvider>
    </CartProvider>
  )
}
