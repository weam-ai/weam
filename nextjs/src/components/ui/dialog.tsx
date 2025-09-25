"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface DialogOverlayProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  className?: string;
}

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  className?: string;
  children?: React.ReactNode;
  showCloseButton?: boolean;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  className?: string;
}

interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {
  className?: string;
}
const Dialog:any = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] border border-slate-200 bg-white rounded-10 shadow-lg focus-visible:outline-none",
        className
      )}
      {...props}>
      {children}
      {showCloseButton && <DialogPrimitive.Close
        className="absolute right-2 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500">
        <X className="h-6 w-6  outline-none" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  children,
  ...props
}: DialogHeaderProps) => (
  <div
  className={cn("flex flex-col", className)}
    {...props}>
    {children}
  </div>
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  children,
  ...props
}: DialogFooterProps) => (
  <div
  className={cn(className)}
    {...props}>
    {children}
  </div>
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(className)}
    {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(className)}
    {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName


export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
