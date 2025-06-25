"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  BarChart3,
  CreditCard,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface AdminSidebarProps {
  courtId: string
}

export function AdminSidebar({ courtId }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: `/admin/${courtId}`,
      icon: LayoutDashboard,
    },
    {
      name: "Vendors",
      href: `/admin/${courtId}/vendors`,
      icon: Users,
    },
    {
      name: "Orders",
      href: `/admin/${courtId}/orders`,
      icon: ShoppingBag,
    },
    {
      name: "Users",
      href: `/admin/${courtId}/users`,
      icon: UserCheck,
    },
    {
      name: "Payments",
      href: `/admin/${courtId}/payments`,
      icon: CreditCard,
    },
    {
      name: "Analytics",
      href: `/admin/${courtId}/analytics`,
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: `/admin/${courtId}/settings`,
      icon: Settings,
    },
  ]

  return (
    <div className={cn("bg-white shadow-lg transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="text-xl font-semibold text-gray-800">Admin Panel</h2>}
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
    </div>
  )
}
