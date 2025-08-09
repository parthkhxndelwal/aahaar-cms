"use client"

import { useRef, useEffect } from "react"
import { usePathname } from "next/navigation"

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pathname = usePathname()

  // Ensure video continues playing smoothly
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(console.log)
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background Video - Persistent across route changes */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          willChange: 'auto',
        }}
      >
        <source src="/admin-auth-bg.mp4" type="video/mp4" />
      </video>
      
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-2xl z-5"></div>
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 z-10"></div>
      
      {/* Content container */}
      <div className="z-20 relative w-full max-w-2xl">
        {children}
      </div>
    </div>
  )
}
