 "use client"

// import { useTheme } from "next-themes"

import { Toaster as Sonner } from "sonner"
import { CircleCheck, Info, TriangleAlert, OctagonX, LoaderCircle } from "lucide-react"
import { cn } from "@c2panel/shared"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = "system" as const

  return (
    <Sonner
      theme={theme}
      className={cn("toaster group")}
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      style={{
        "--brand": "hsl(var(--primary))",
        "--moderate-low": "hsl(var(--muted))",
        "--height": "60px"
      } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster } 
