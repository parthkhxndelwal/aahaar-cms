"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Utensils, Users, BarChart3, CreditCard } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  const [courtId, setCourtId] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCourtAccess = async () => {
    if (!courtId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid court ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/courts/${courtId}`)
      const data = await response.json()

      if (data.success) {
        router.push(`/app/${courtId}`)
      } else {
        toast({
          title: "Court Not Found",
          description: "Please check your court ID and try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access court",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Aahaar" width={40} height={40} />
            <h1 className="text-2xl font-bold text-gray-900">Aahaar</h1>
          </div>
          <div className="space-x-4">
            <Button variant="ghost" onClick={() => router.push("/admin/login")}>
              Admin Login
            </Button>
            <Button variant="ghost" onClick={() => router.push("/vendor/login")}>
              Vendor Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">Complete Food Court Management Solution</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Streamline your food court operations with our comprehensive SaaS platform. Manage vendors, process orders,
          handle payments, and delight customers.
        </p>

        {/* Court Access Card */}
        <Card className="max-w-md mx-auto mb-16">
          <CardHeader>
            <CardTitle>Access Your Food Court</CardTitle>
            <CardDescription>Enter your court ID to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="courtId">Court ID</Label>
              <Input
                id="courtId"
                placeholder="e.g., vbs-ghamroj"
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCourtAccess()}
              />
            </div>
            <Button onClick={handleCourtAccess} className="w-full" disabled={loading}>
              {loading ? "Accessing..." : "Access Food Court"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Why Choose Aahaar?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardHeader>
              <Utensils className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Multi-Vendor Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Manage multiple food vendors with individual menus, pricing, and operations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>User-Friendly Ordering</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Intuitive mobile-first interface for customers to browse and order food.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Integrated Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Secure payment processing with automatic vendor payouts via Razorpay.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Analytics & Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Comprehensive analytics for admins and vendors to track performance.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Transform Your Food Court?</h3>
          <p className="text-xl mb-8">Join hundreds of institutions already using Aahaar</p>
          <Button size="lg" variant="secondary" onClick={() => router.push("/admin/register")}>
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Aahaar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
