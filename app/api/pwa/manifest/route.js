import { NextResponse } from "next/server"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const courtId = searchParams.get("courtId")

  // TODO: Customize manifest based on court branding
  const manifest = {
    name: `Aahaar - ${courtId || "Food Court"}`,
    short_name: "Aahaar",
    description: "Food Court Management System",
    start_url: `/app/${courtId || ""}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3B82F6",
    icons: [
      {
        src: "/logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }

  return NextResponse.json(manifest)
}
