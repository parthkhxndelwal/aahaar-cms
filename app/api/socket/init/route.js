import { NextResponse } from 'next/server'
import { initSocketServer, getSocket } from '@/lib/socket'

export async function GET(request) {
  try {
    console.log('🚀 Socket.io initialization requested...')
    
    // Initialize the socket server
    const io = initSocketServer()
    
    if (io) {
      console.log('✅ Socket.io server is running')
      return NextResponse.json({ 
        success: true, 
        message: 'Socket.io server is running',
        socketUrl: `http://localhost:${process.env.SOCKET_PORT || 3001}`,
        namespaces: ['/vendor', '/app']
      })
    } else {
      throw new Error('Failed to get socket instance')
    }
    
  } catch (error) {
    console.error('❌ Socket.io initialization error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to initialize Socket.io server',
      error: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { action, data } = await request.json()
    
    if (action === 'test-emit') {
      const io = getSocket()
      if (io) {
        // Test emission
        io.of('/vendor').emit('test-message', { message: 'Test from server', timestamp: new Date().toISOString() })
        io.of('/app').emit('test-message', { message: 'Test from server', timestamp: new Date().toISOString() })
        
        return NextResponse.json({ 
          success: true, 
          message: 'Test message emitted to all namespaces' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Socket.io not initialized' 
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Invalid action' 
    }, { status: 400 })
    
  } catch (error) {
    console.error('❌ Socket.io test error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Socket.io test failed',
      error: error.message 
    }, { status: 500 })
  }
}
