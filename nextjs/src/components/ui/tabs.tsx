"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, ...props }:any, ref:any) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex items-center justify-start border-b border-b11 px-5",
      className
    )}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }:any, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "text-font-16 font-semibold py-3 px-9 border-b-2 border-transparent inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-b6 data-[state=active]:text-b2 data-[state=active]:border-b2",
      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }:any, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3  focus-visible:outline-none",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
