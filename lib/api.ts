const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "API request failed")
    }

    return data
  }

  // Auth methods
  async login(email: string, password: string, courtId: string) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, courtId }),
    })
  }

  async register(userData: any) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async sendOTP(phone: string, courtId: string) {
    return this.request("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, courtId }),
    })
  }

  // Court methods
  async getCourt(courtId: string) {
    return this.request(`/api/courts/${courtId}`)
  }

  async getMenu(courtId: string, filters?: any) {
    const params = new URLSearchParams(filters)
    return this.request(`/api/courts/${courtId}/menu?${params}`)
  }

  // Order methods
  async createOrder(courtId: string, orderData: any) {
    return this.request(`/api/courts/${courtId}/orders`, {
      method: "POST",
      body: JSON.stringify(orderData),
    })
  }

  async getUserOrders(params?: any) {
    const query = new URLSearchParams(params)
    return this.request(`/api/users/orders?${query}`)
  }

  async updateOrderStatus(orderId: string, status: string, note?: string) {
    return this.request(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    })
  }

  // Cart methods
  async getCart() {
    return this.request("/api/cart")
  }

  async addToCart(menuItemId: string, quantity: number, customizations?: any) {
    return this.request("/api/cart", {
      method: "POST",
      body: JSON.stringify({ menuItemId, quantity, customizations }),
    })
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request(`/api/cart/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    })
  }

  async removeFromCart(itemId: string) {
    return this.request(`/api/cart/${itemId}`, {
      method: "DELETE",
    })
  }

  async clearCart() {
    return this.request("/api/cart", {
      method: "DELETE",
    })
  }

  // Payment methods
  async createRazorpayOrder(orderId: string) {
    return this.request("/api/payments/razorpay/create-order", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    })
  }

  async verifyPayment(paymentData: any) {
    return this.request("/api/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(paymentData),
    })
  }

  // File upload
  async uploadImage(file: File, folder?: string) {
    const formData = new FormData()
    formData.append("file", file)
    if (folder) formData.append("folder", folder)

    return this.request("/api/upload/image", {
      method: "POST",
      body: formData,
      headers: {
        ...this.getAuthHeaders(),
      },
    })
  }
}

export const api = new ApiClient()
