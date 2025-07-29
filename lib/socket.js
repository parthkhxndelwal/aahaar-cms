import { Server } from 'socket.io'

let io

const initSocketServer = () => {
  if (!io && typeof window === 'undefined') {
    console.log('🔗 Initializing Socket.io server...')
    
    // Check if we're in a server environment and initialize once
    if (!global.socketio && !global.socketServerInitializing) {
      global.socketServerInitializing = true // Prevent multiple initialization attempts
      
      const { createServer } = require('http')
      
      // Create HTTP server for Socket.io
      const httpServer = createServer()
      
      io = new Server(httpServer, {
        cors: {
          origin: process.env.NODE_ENV === 'development' 
            ? ['http://localhost:3000'] 
            : [process.env.NEXT_PUBLIC_APP_URL],
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
      })

      // Namespace for vendor real-time updates
      const vendorNamespace = io.of('/vendor')
      
      // Namespace for app user real-time updates  
      const appNamespace = io.of('/app')

      // Vendor namespace handlers
      vendorNamespace.on('connection', (socket) => {
        console.log(`🏪 Vendor connected: ${socket.id}`)
        
        // Join vendor-specific room
        socket.on('join-vendor-room', (vendorId) => {
          console.log(`🏪 Vendor ${vendorId} joined room: vendor-${vendorId}`)
          socket.join(`vendor-${vendorId}`)
          socket.vendorId = vendorId
          
          // Send confirmation
          socket.emit('joined-vendor-room', { vendorId, room: `vendor-${vendorId}` })
        })

        // Leave vendor room
        socket.on('leave-vendor-room', (vendorId) => {
          console.log(`🏪 Vendor ${vendorId} left room: vendor-${vendorId}`)
          socket.leave(`vendor-${vendorId}`)
          delete socket.vendorId
        })

        socket.on('disconnect', () => {
          console.log(`🏪 Vendor disconnected: ${socket.id}`)
        })
      })

      // App user namespace handlers
      appNamespace.on('connection', (socket) => {
        console.log(`📱 App user connected: ${socket.id}`)
        
        // Join user-specific room for order updates
        socket.on('join-user-room', (userId) => {
          console.log(`📱 User ${userId} joined room: user-${userId}`)
          socket.join(`user-${userId}`)
          socket.userId = userId
          
          // Send confirmation
          socket.emit('joined-user-room', { userId, room: `user-${userId}` })
        })

        // Join order-specific room for specific order tracking
        socket.on('join-order-room', (parentOrderId) => {
          console.log(`📱 User joined order room: order-${parentOrderId}`)
          socket.join(`order-${parentOrderId}`)
          socket.parentOrderId = parentOrderId
          
          // Send confirmation
          socket.emit('joined-order-room', { parentOrderId, room: `order-${parentOrderId}` })
        })

        // Leave user room
        socket.on('leave-user-room', (userId) => {
          console.log(`📱 User ${userId} left room: user-${userId}`)
          socket.leave(`user-${userId}`)
          delete socket.userId
        })

        // Leave order room
        socket.on('leave-order-room', (parentOrderId) => {
          console.log(`📱 User left order room: order-${parentOrderId}`)
          socket.leave(`order-${parentOrderId}`)
          delete socket.parentOrderId
        })

        socket.on('disconnect', () => {
          console.log(`📱 App user disconnected: ${socket.id}`)
        })
      })

      // Start the Socket.io server
      const socketPort = process.env.SOCKET_PORT || 3001
      
      // Add error handling for port conflicts
      httpServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${socketPort} is already in use, reusing existing socket server`)
          // Don't throw error, just reuse the existing server
          if (global.socketio) {
            io = global.socketio
          }
        } else {
          console.error('❌ Socket.io server error:', error)
        }
        global.socketServerInitializing = false
      })

      httpServer.listen(socketPort, () => {
        console.log(`✅ Socket.io server running on port ${socketPort}`)
        global.socketServerInitializing = false
      })
      
      global.socketio = io
      global.socketServer = httpServer
    } else {
      io = global.socketio
      console.log('🔄 Reusing existing Socket.io server instance')
    }
  }
  
  return io
}

const getSocket = () => {
  if (!io && typeof window === 'undefined') {
    return initSocketServer()
  }
  return io
}

// Helper functions to emit events
const emitToVendor = (vendorId, event, data) => {
  const socket = getSocket()
  if (socket) {
    console.log(`🔔 Emitting to vendor ${vendorId}: ${event}`, data)
    socket.of('/vendor').to(`vendor-${vendorId}`).emit(event, data)
    return true
  }
  console.warn(`⚠️ Socket not available for vendor ${vendorId}`)
  return false
}

const emitToUser = (userId, event, data) => {
  const socket = getSocket()
  if (socket) {
    console.log(`🔔 Emitting to user ${userId}: ${event}`, data)
    socket.of('/app').to(`user-${userId}`).emit(event, data)
    return true
  }
  console.warn(`⚠️ Socket not available for user ${userId}`)
  return false
}

const emitToOrder = (parentOrderId, event, data) => {
  const socket = getSocket()
  if (socket) {
    console.log(`🔔 Emitting to order ${parentOrderId}: ${event}`, data)
    socket.of('/app').to(`order-${parentOrderId}`).emit(event, data)
    return true
  }
  console.warn(`⚠️ Socket not available for order ${parentOrderId}`)
  return false
}

// Initialize socket server when this module is imported on server side
// Only initialize if not already initializing or initialized
if (typeof window === 'undefined' && !global.socketio && !global.socketServerInitializing) {
  console.log('📡 Auto-initializing Socket.io server on module import')
  initSocketServer()
}

export { 
  initSocketServer, 
  getSocket, 
  emitToVendor, 
  emitToUser, 
  emitToOrder 
}
