"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "./button"

export function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Retour"
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
        } else if (fallbackHref) {
          router.push(fallbackHref)
        }
      }}
    >
      <ArrowLeft className="w-4 h-4" />
    </Button>
  )
}
