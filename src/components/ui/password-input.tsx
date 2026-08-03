"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { InputProps } from "./input"

function PasswordInput({ className, error, ...props }: InputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          className={cn(
            "w-full bg-bg border border-border rounded p-2 pr-9 text-sm text-text focus:outline-none focus:border-cyan-500",
            "aria-invalid:border-destructive aria-invalid:focus:border-destructive",
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export { PasswordInput }
