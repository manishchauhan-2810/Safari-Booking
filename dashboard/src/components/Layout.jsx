import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Icon } from "./Icons";

const LINKS = [
  { to: "/", label: "Overview", icon: "home", end: true },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
  { to: "/bookings", label: "Bookings", icon: "bookings" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const Sidebar = ({ onNavigate }) => {
  const { admin, logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-green-950 p-5 text-green-50">
      <div className="mb-8 flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-lg font-extrabold text-green-950">C</span>
        <div className="leading-tight">
          <p className="font-bold">Corbett Admin</p>
          <p className="text-xs text-green-300">Safari bookings</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isActive ? "bg-green-800 text-white shadow-inner" : "text-green-100 hover:bg-green-900"
              }`
            }
          >
            <Icon name={l.icon} />
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-green-900 pt-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-800 text-sm font-bold uppercase">{admin?.name?.[0] || "A"}</span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{admin?.name}</p>
            <p className="truncate text-xs text-green-300">{admin?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-800 px-3 py-2 text-sm text-green-100 transition hover:bg-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <Icon name="logout" className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  );
};

export const Layout = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64"><Sidebar /></div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-green-950 px-4 py-3 text-white lg:hidden">
        <span className="font-bold">Corbett Admin</span>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="rounded p-1.5 hover:bg-green-900">
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-64"><Sidebar onNavigate={() => setOpen(false)} /></div>
        </div>
      )}

      <main className="min-w-0 flex-1 bg-earth-50 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl"><Outlet /></div>
      </main>
    </div>
  );
};