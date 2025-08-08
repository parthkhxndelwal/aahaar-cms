import Image from "next/image"

interface SpinnerProps {
  size?: number
  variant?: "dark" | "white" | "light"
  className?: string
}

export function Spinner({ 
  size = 24, 
  variant = "dark", 
  className = ""
}: SpinnerProps) {
  // Map variants to appropriate spinner files
  // For dark backgrounds, use white spinner (visible on dark)
  // For light backgrounds, use dark spinner (visible on light)
  const getSpinnerSrc = () => {
    switch (variant) {
      case "dark":
        // Dark variant = for dark backgrounds, so use white spinner
        return "/Spinner_white_275x275.svg"
      case "white":
      case "light":
        // White/light variant = for light backgrounds, so use dark spinner
        return "/Spinner_dark_275x275.svg"
      default:
        return "/Spinner_dark_275x275.svg"
    }
  }
  
  return (
    <Image
      src={getSpinnerSrc()}
      alt="Loading..."
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
