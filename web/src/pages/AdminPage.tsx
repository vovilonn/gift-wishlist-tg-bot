import { useQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2, EyeOff, Gift, Layers3, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getGifts } from "../lib/api";

export const AdminPage = () => {
  const { token, user } = useAuth();

  const giftsQuery = useQuery({
    queryKey: ["admin-dashboard-gifts"],
    queryFn: () => Promise.all([getGifts(token), getGifts(token, { status: "ARCHIVED" })]),
    enabled: user.role === "ADMIN"
  });

  if (user.role !== "ADMIN") {
    return <p className="ui-alert ui-alert--error">Недостаточно прав для доступа к этому разделу.</p>;
  }

  const all = giftsQuery.data?.[0] ?? [];
  const archived = giftsQuery.data?.[1] ?? [];

  const stats = {
    total: all.length + archived.length,
    active: all.filter((gift) => gift.status === "ACTIVE").length,
    reserved: all.filter((gift) => gift.status === "RESERVED").length,
    purchased: all.filter((gift) => gift.status === "PURCHASED").length,
    hidden: all.filter((gift) => gift.status === "HIDDEN").length,
    archived: archived.length
  };

  const statCards = [
    {
      key: "total",
      label: "Всего",
      value: stats.total,
      icon: <Layers3 size={18} />,
      tone: "total"
    },
    {
      key: "active",
      label: "Свободно",
      value: stats.active,
      icon: <Gift size={18} />,
      tone: "active"
    },
    {
      key: "reserved",
      label: "Забронировано",
      value: stats.reserved,
      icon: <ShoppingCart size={18} />,
      tone: "reserved"
    },
    {
      key: "purchased",
      label: "Куплено",
      value: stats.purchased,
      icon: <CheckCircle2 size={18} />,
      tone: "purchased"
    },
    {
      key: "hidden",
      label: "Скрыто",
      value: stats.hidden,
      icon: <EyeOff size={18} />,
      tone: "hidden"
    },
    {
      key: "archived",
      label: "Архив",
      value: stats.archived,
      icon: <Archive size={18} />,
      tone: "archived"
    }
  ] as const;

  return (
    <section className="admin-dashboard">
      <h2>Панель администратора</h2>
      <div className="admin-dashboard-summary">
        <h3>Сводка по списку подарков</h3>
        <p>Отслеживайте статусы подарков и переходите к нужным действиям в один клик.</p>
      </div>
      <div className="stats-grid stats-grid--modern">
        {statCards.map((card) => (
          <div key={card.key} className={`stat-card stat-card--${card.tone}`}>
            <div className="stat-card__icon">{card.icon}</div>
            <div className="stat-card__meta">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="admin-links">
        <Link className="ui-button ui-button--default ui-button--md" to="/admin/gifts/new">
          Добавить подарок
        </Link>
        <Link className="ui-button ui-button--secondary ui-button--md" to="/admin/reservations">
          Активные бронирования
        </Link>
        <Link className="ui-button ui-button--outline ui-button--md" to="/admin/archive">
          Скрытые, купленные и архивные
        </Link>
      </div>
    </section>
  );
};
