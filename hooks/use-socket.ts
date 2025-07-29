import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionDelay?: number
  reconnectionAttempts?: number
  timeout?: number
}

// Socket.io connection hook
export const useSocket = (namespace: string = '', options: UseSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socketUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

    const fullUrl = namespace ? `${socketUrl}${namespace}` : socketUrl

    console.log(`🔗 Connecting to Socket.io: ${fullUrl}`)

    // Initialize socket connection
    socketRef.current = io(fullUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      ...options
    })

    const socket = socketRef.current

    // Connection handlers
    socket.on('connect', () => {
      console.log(`✅ Connected to ${fullUrl}`, socket.id)
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', (reason: string) => {
      console.log(`❌ Disconnected from ${fullUrl}:`, reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (err: any) => {
      console.error(`❌ Connection error for ${fullUrl}:`, err)
      setError(err.message)
      setIsConnected(false)
    })

    socket.on('reconnect', (attempt: number) => {
      console.log(`🔄 Reconnected to ${fullUrl} after ${attempt} attempts`)
      setIsConnected(true)
      setError(null)
    })

    socket.on('reconnect_error', (err: any) => {
      console.error(`❌ Reconnection error for ${fullUrl}:`, err)
      setError(err.message)
    })

    // Cleanup on unmount
    return () => {
      console.log(`🔌 Cleaning up socket connection to ${fullUrl}`)
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [namespace])

  return {
    socket: socketRef.current,
    isConnected,
    error
  }
}
