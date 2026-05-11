"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & {
    min?: number
    max?: number
    step?: number
    value?: number[]
    onValueChange?: (value: number[]) => void
  }
>(({ className, min = 0, max = 100, step = 1, value = [0], onValueChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [Number(e.target.value)]
    onValueChange?.(newValue)
  }

  return (
    <div className="relative flex w-full items-center gap-3">
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted",
          "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:aspect-square [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110",
          "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:aspect-square [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110",
          "[&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted",
          "[&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted",
          className
        )}
        {...props}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }