import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

function Input({ className, error, ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        data-slot="input"
        aria-invalid={!!error}
        className={cn(
          "w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500",
          "aria-invalid:border-destructive aria-invalid:focus:border-destructive",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export { Input }
