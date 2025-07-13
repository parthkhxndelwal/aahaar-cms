"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, ShoppingBag, Menu, BarChart3, Settings, ChevronLeft, ChevronRight, Plus, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface VendorSidebarProps {
  courtId: string
}

export function VendorSidebar({ courtId }: VendorSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { logout } = useAuth()

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
    <div className={cn("bg-white shadow-lg transition-all duration-300 flex flex-col h-full", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="text-xl font-semibold text-gray-800">Vendor Panel</h2>}
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="mt-6 flex-1">
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
        <div className="p-4 space-y-2">
          <Button asChild className="w-full">
            <Link href={`/vendor/${courtId}/orders/manual`}>
              <Plus className="h-4 w-4 mr-2" />
              Quick Order
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={logout}
            className="w-full text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}

      {collapsed && (
        <div className="p-2 space-y-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={logout}
            className="w-full p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
