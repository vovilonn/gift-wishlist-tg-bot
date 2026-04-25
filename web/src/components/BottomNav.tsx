import { LayoutGrid, ListChecks, Shield, ShoppingBag } from "lucide-react";
import { NavLink } from "react-router-dom";

import type { UserRole } from "../lib/types";

type BottomNavProps = {
  role: UserRole;
};

export const BottomNav = ({ role }: BottomNavProps) => {
  const links =
    role === "ADMIN"
      ? [
          { to: "/", label: "Каталог", icon: <LayoutGrid size={16} />, end: true },
          { to: "/admin/reservations", label: "Брони", icon: <ListChecks size={16} />, end: true },
          { to: "/admin", label: "Панель", icon: <Shield size={16} />, end: true }
        ]
      : [
          { to: "/", label: "Каталог", icon: <LayoutGrid size={16} />, end: true },
          { to: "/my-reservations", label: "Мои", icon: <ShoppingBag size={16} />, end: true }
        ];

  return (
    <nav className="bottom-nav">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `bottom-nav-link ${isActive ? "active" : ""}`}>
          <span className="bottom-nav-link__icon">{link.icon}</span>
          <span>{link.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
