"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { useHydrated } from "@/lib/studio/local-flag"

/**
 * Dialog — Base UI `Dialog` with the Quanta Modal skin (q-modal-* from
 * styles/quanta/components/modal.css): dim backdrop, centered frosted glass
 * card, a 40px header row, an inset body "workspace" and a 48px footer.
 *
 *   <Dialog>
 *     <DialogTrigger render={<Button>Open</Button>} />
 *     <DialogContent size="md">
 *       <DialogHeader>
 *         <DialogTitle>New element</DialogTitle>
 *         <DialogDescription>Optional helper text</DialogDescription>
 *       </DialogHeader>
 *       <DialogBody>…</DialogBody>
 *       <DialogFooter>
 *         <Button variant="secondary">Cancel</Button>
 *         <Button>Confirm</Button>
 *       </DialogFooter>
 *     </DialogContent>
 *   </Dialog>
 */

export type DialogSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"

const SIZE_CLASS: Record<DialogSize, string> = {
  xs: "q-modal-size-xs",
  sm: "q-modal-size-sm",
  md: "q-modal-size-md",
  lg: "q-modal-size-lg",
  xl: "q-modal-size-xl",
  "2xl": "q-modal-size-2xl",
}

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ disabled, ...props }: DialogPrimitive.Trigger.Props) {
  const hydrated = useHydrated()
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...props}
      disabled={disabled || !hydrated}
    />
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn("q-modal-backdrop", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  size = "md",
  initialFocus,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** Card width preset: xs 349, sm 469, md 640, lg 708, xl 946, 2xl 1392px. */
  size?: DialogSize
}) {
  // Focus the card itself so opening doesn't ring the close button.
  const popupRef = React.useRef<HTMLDivElement>(null)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={popupRef}
        initialFocus={initialFocus ?? popupRef}
        data-slot="dialog-content"
        className={cn("q-modal", SIZE_CLASS[size], className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/** Round dismiss disc for the header's trailing end. */
function DialogCloseButton({
  className,
  children,
  ...props
}: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      aria-label="Close"
      className={cn("q-close q-close-md", className)}
      {...props}
    >
      {children ?? <XIcon className="size-5" />}
    </DialogPrimitive.Close>
  )
}

/**
 * Header row: title + trailing close disc. A `DialogDescription` child is
 * lifted out of the 40px row and rendered underneath it.
 */
function DialogHeader({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const nodes = React.Children.toArray(children)
  const descriptions = nodes.filter(
    (node) => React.isValidElement(node) && node.type === DialogDescription
  )
  const rest = nodes.filter((node) => !descriptions.includes(node))
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex shrink-0 flex-col gap-1", className)}
      {...props}
    >
      <div className="q-modal-header">
        {rest}
        {showCloseButton ? <DialogCloseButton /> : null}
      </div>
      {descriptions}
    </div>
  )
}

/** Pushes following header/footer controls to the trailing end. */
function DialogSpacer({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="dialog-spacer"
      className={cn("q-modal-spacer", className)}
      {...props}
    />
  )
}

/** The lighter inset pane inside the body. */
function DialogWorkspace({
  className,
  padded = true,
  ...props
}: React.ComponentProps<"div"> & { padded?: boolean }) {
  return (
    <div
      data-slot="dialog-workspace"
      className={cn(
        "q-modal-workspace",
        padded && "q-modal-workspace-padded",
        className
      )}
      {...props}
    />
  )
}

/**
 * Scrollable region between header and footer. Plain content is wrapped in a
 * single `DialogWorkspace`; nest your own workspaces for split layouts.
 */
function DialogBody({
  className,
  padded = true,
  children,
  ...props
}: React.ComponentProps<"div"> & { padded?: boolean }) {
  const hasWorkspace = (nodes: React.ReactNode): boolean =>
    React.Children.toArray(nodes).some(
      (child) =>
        React.isValidElement(child) &&
        (child.type === DialogWorkspace ||
          hasWorkspace(
            (child.props as { children?: React.ReactNode }).children
          ))
    )
  return (
    <div
      data-slot="dialog-body"
      className={cn("q-modal-body", className)}
      {...props}
    >
      {hasWorkspace(children) ? (
        children
      ) : (
        <DialogWorkspace padded={padded}>{children}</DialogWorkspace>
      )}
    </div>
  )
}

/** 48px footer: optional caption on the left, actions pushed right. */
function DialogFooter({
  className,
  caption,
  full = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  caption?: React.ReactNode
  full?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("q-modal-footer", full && "q-modal-footer-full", className)}
      {...props}
    >
      {caption != null ? (
        <div className="q-modal-caption">{caption}</div>
      ) : null}
      <div className={cn("q-modal-actions", full && "q-modal-actions-full")}>
        {children}
      </div>
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("q-modal-title", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("q-modal-description", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogSpacer,
  DialogTitle,
  DialogTrigger,
  DialogWorkspace,
}
