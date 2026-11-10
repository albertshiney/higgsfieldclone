"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  CreditCard,
  FolderOpen,
  Gem,
  LogOut,
  Menu,
  Shield,
  Sparkle,
  UserRound,
  X,
} from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { signOutAction } from "@/app/actions/auth"
import { useApp } from "@/components/providers/app-providers"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHydrated } from "@/lib/studio/local-flag"
import { cn } from "@/lib/utils"

import { Logo } from "./logo"
import { navLinks } from "./nav-links"

/**
 * The site header: logo · Explore · Image · Video · (Audio) · Effects ·
 * Community · Pricing, then the credit pill, Upgrade and the avatar menu
 * (or Login / Sign up). `compact` is the 36 px app-page variant.
 */
export function TopNav({ compact = false }: { compact?: boolean }) {
  const hydrated = useHydrated()
  const pathname = usePathname()
  const links = navLinks()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex w-full shrink-0 items-center gap-4 bg-page/95 px-4 backdrop-blur-sm",
        compact ? "h-12" : "h-[60px]"
      )}
    >
      <Logo compact={compact} />
      <nav
        aria-label="Main"
        className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
      >
        {links.map((link) => {
          const active = link.match(pathname)
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-200",
                active
                  ? "text-lime"
                  : "text-[#a8a8a8] hover:bg-white/5 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <AccountControls compact={compact} />
        <button
          type="button"
          disabled={!hydrated}
          aria-label="Open menu"
          className="flex size-9 items-center justify-center rounded-[10px] bg-white/5 text-foreground md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </button>
      </div>
      <MobileSheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        pathname={pathname}
      />
    </header>
  )
}

function AccountControls({ compact }: { compact: boolean }) {
  const hydrated = useHydrated()
  const { user, credits, openAuth, openUpgrade } = useApp()
  const height = compact ? "h-8" : "h-9"
  if (!user)
    return (
      <>
        <button
          type="button"
          disabled={!hydrated}
          onClick={() => openAuth({ mode: "login" })}
          className={cn(
            "hidden rounded-[10px] bg-lime/10 px-3 text-sm font-medium text-lime transition-colors hover:bg-lime/15 sm:block",
            height
          )}
        >
          Login
        </button>
        <button
          type="button"
          disabled={!hydrated}
          onClick={() => openAuth({ mode: "signup" })}
          className={cn(
            "btn-keycap rounded-[10px] px-3 text-sm font-semibold",
            height
          )}
        >
          Sign up
        </button>
      </>
    )
  return (
    <>
      <Link
        href="/account"
        aria-label={`${credits ?? 0} credits — account`}
        className={cn(
          "flex items-center gap-1.5 rounded-full bg-white/5 px-3 font-mono text-sm text-foreground tabular-nums transition-colors hover:bg-white/10",
          height
        )}
      >
        <Sparkle className="size-3.5 fill-lime text-lime" aria-hidden />
        {credits === null ? "—" : credits.toLocaleString("en-US")}
      </Link>
      <button
        type="button"
        onClick={() => openUpgrade()}
        className={cn(
          "btn-keycap hidden items-center gap-1.5 rounded-full px-3 text-sm font-semibold sm:flex",
          height
        )}
      >
        <Gem className="size-3.5" aria-hidden /> Upgrade
      </button>
      <UserMenu />
    </>
  )
}

function UserMenu() {
  const { user } = useApp()
  if (!user) return null
  const initial = (user.name || user.email).slice(0, 1).toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-raised text-sm font-semibold text-foreground ring-1 ring-white/10 transition hover:ring-white/30"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar from the auth provider
          <img src={user.image} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {user.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/assets" />}>
          <FolderOpen /> Assets
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account" />}>
          <UserRound /> Account
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/billing" />}>
          <CreditCard /> Billing
        </DropdownMenuItem>
        {user.role === "admin" ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield /> Admin
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOutAction()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileSheet({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
}) {
  const { user, openAuth, openUpgrade } = useApp()
  const close = () => onOpenChange(false)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(330px,88vw)] flex-col gap-2 border-l border-white/5 bg-panel p-4 duration-200 outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="sr-only">
              Menu
            </DialogPrimitive.Title>
            <Logo compact />
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="flex size-9 items-center justify-center rounded-full bg-white/5"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1">
            {navLinks().map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={link.match(pathname) ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3 py-3 text-base font-medium",
                  link.match(pathname)
                    ? "bg-white/5 text-lime"
                    : "text-foreground hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/assets"
                  onClick={close}
                  className="rounded-xl px-3 py-3 text-base font-medium hover:bg-white/5"
                >
                  Assets
                </Link>
                <Link
                  href="/account"
                  onClick={close}
                  className="rounded-xl px-3 py-3 text-base font-medium hover:bg-white/5"
                >
                  Account
                </Link>
              </>
            ) : null}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                className="btn-keycap h-12 rounded-xl text-base font-semibold"
                onClick={() => {
                  close()
                  openUpgrade()
                }}
              >
                Upgrade
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-keycap h-12 rounded-xl text-base font-semibold"
                  onClick={() => {
                    close()
                    openAuth({ mode: "signup" })
                  }}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  className="h-12 rounded-xl bg-white/5 text-base font-medium"
                  onClick={() => {
                    close()
                    openAuth({ mode: "login" })
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
