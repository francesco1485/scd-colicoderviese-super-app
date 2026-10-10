import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/calendario", label: "Calendario" },
  { to: "/allenamenti", label: "Allenamenti" },
  { to: "/entra", label: "Gioca con noi" },
  { to: "/sponsor", label: "Sponsor" },
  { to: "/community", label: "Tifosi" },
  { to: "/eventi", label: "Eventi" },
  { to: "/contatti", label: "Contatti" },
  { to: "/aree", label: "Entra" },
] as const;

const footerLinks = [
  { to: "/societa", label: "Società avversarie" },
  { to: "/shop", label: "Shop & membership" },
  { to: "/fornitori", label: "Fornitori" },
  { to: "/safeguarding", label: "Safeguarding" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 surface-deep">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="surface-sun flex size-9 items-center justify-center rounded-lg font-display text-sm font-bold">
            CD
          </span>
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold tracking-wide">
              S.D.C. ColicoDerviese
            </span>
            <span className="block text-[0.65rem] uppercase tracking-[0.2em] opacity-75">
              Super App
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium opacity-85 transition-opacity hover:opacity-100"
              activeProps={{ className: "text-accent opacity-100" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          className="lg:hidden"
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 lg:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-2 text-sm font-medium opacity-90"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="surface-deep mt-16 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm">
        <p className="font-display text-lg font-bold">S.D.C. ColicoDerviese</p>
        <p className="opacity-75">Colico (LC) · Alto Lago di Como · PEC calciocolicoderviese@pec.it</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {[...nav.slice(1), ...footerLinks].map((n) => (
            <Link key={n.to + n.label} to={n.to} className="opacity-80 hover:opacity-100">{n.label}</Link>
          ))}
        </nav>
        <p className="text-xs opacity-60">
          © {new Date().getFullYear()} S.D.C. ColicoDerviese — Super App ufficiale.
        </p>
      </div>
    </footer>
  );
}
