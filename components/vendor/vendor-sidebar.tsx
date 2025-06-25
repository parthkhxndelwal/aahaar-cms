"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, ShoppingBag, Menu, BarChart3, Settings, ChevronLeft, ChevronRight, Plus } from "lucide-react"

interface VendorSidebarProps {
  courtId: string
}

export function VendorSidebar({ courtId }: VendorSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: `/vendor/${courtId}`,
      icon: LayoutDashboard,
    },
    {
      name: "Orders",
      href: `/vendor/${courtId}/orders`,
      icon: ShoppingBag,
    },
    {
      name: "Menu",
      href: `/vendor/${courtId}/menu`,
      icon: Menu,
    },
    {
      name: "Analytics",
      href: `/vendor/${courtId}/analytics`,
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: `/vendor/${courtId}/settings`,
      icon: Settings,
    },
  ]

  return (
    <div className={cn("bg-white shadow-lg transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="text-xl font-semibold text-gray-800">Vendor Panel</h2>}
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="mt-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {!collapsed && item.name}
            </Link>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <Button asChild className="w-full">
            <Link href={`/vendor/${courtId}/orders/manual`}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Order
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
