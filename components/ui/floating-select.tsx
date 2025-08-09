"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface FloatingSelectProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  className?: string
}

export const FloatingSelect = ({ 
  label, 
  value, 
  onValueChange, 
  options, 
  error, 
  className 
}: FloatingSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const hasValue = Boolean(value)
  const selectedOption = options.find(option => option.value === value)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "block px-2.5 pb-2.5 pt-4 w-full text-sm bg-transparent rounded-lg border appearance-none dark:text-white focus:outline-none focus:ring-0 peer text-left flex items-center justify-between",
          error 
            ? "text-gray-900 border-red-600 dark:border-red-500 dark:focus:border-red-500 focus:border-red-600" 
            : "text-gray-900 border-gray-300 dark:border-gray-600 dark:focus:border-blue-500 focus:border-blue-600",
          className
        )}
      >
        <span className={cn(!hasValue && "text-transparent")}>
          {selectedOption?.label || ""}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200 ml-2",
            isOpen && "rotate-180"
          )} 
        />
      </button>
      
      <label
        className={cn(
          "absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] px-2 start-1",
          hasValue || isOpen ? "-translate-y-4 scale-75 top-2" : "scale-100 -translate-y-1/2 top-1/2",
          error 
            ? "text-red-600 dark:text-red-500 bg-neutral-900" 
            : "text-gray-500 dark:text-gray-400 bg-neutral-900"
        )}
      >
        {label}
      </label>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-600 rounded-md shadow-lg z-50 max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full px-3 py-2 text-left text-neutral-100 hover:bg-neutral-700 transition-colors duration-150 first:rounded-t-md last:rounded-b-md",
                value === option.value && "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          <span className="font-medium">Oh, snapp!</span> {error}
        </p>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  )
}
