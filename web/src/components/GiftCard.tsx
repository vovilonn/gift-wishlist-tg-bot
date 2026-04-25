import { Link } from "react-router-dom";

import type { Gift, UserRole } from "../lib/types";
import { SafeImage } from "./SafeImage";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type GiftCardProps = {
  gift: Gift;
  role: UserRole;
  onReserve: (gift: Gift) => void;
  onCancel: (gift: Gift) => void;
};

const mainAction = (gift: Gift, onReserve: (gift: Gift) => void, onCancel: (gift: Gift) => void) => {
  if (gift.status === "ACTIVE") {
    return (
      <Button type="button" size="sm" onClick={() => onReserve(gift)}>
        Забронировать
      </Button>
    );
  }

  if (gift.status === "RESERVED" && gift.isReservedByCurrentUser) {
    return (
      <Button type="button" size="sm" variant="destructive" onClick={() => onCancel(gift)}>
        Отменить бронирование
      </Button>
    );
  }

  if (gift.status === "RESERVED") {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        Уже забронирован
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled>
      Недоступен
    </Button>
  );
};

export const GiftCard = ({ gift, role, onReserve, onCancel }: GiftCardProps) => (
  <Card className="gift-card">
    <div className="gift-image-wrap">
      <SafeImage imageUrl={gift.imageUrl} alt={gift.title} className="gift-image" fallbackClassName="gift-image gift-image-placeholder" />
    </div>
    <div className="gift-content">
      <div className="gift-head">
        <h3>{gift.title}</h3>
        <StatusBadge gift={gift} />
      </div>
      {gift.description ? <p className="gift-description">{gift.description}</p> : null}
      <div className="gift-meta">
        {gift.price ? (
          <span className="gift-price">
            {gift.price} {gift.currency ?? ""}
          </span>
        ) : null}
      </div>
      {role === "ADMIN" && gift.reservedByUser ? (
        <p className="gift-reserver">
          Забронировал: {gift.reservedByUser.firstName ?? gift.reservedByUser.username ?? gift.reservedByUser.telegramId}
        </p>
      ) : null}
      <div className="gift-actions">
        {mainAction(gift, onReserve, onCancel)}
        <Link to={`/gift/${gift.id}`} className="ui-button ui-button--secondary ui-button--sm">
          Подробнее
        </Link>
      </div>
    </div>
  </Card>
);
