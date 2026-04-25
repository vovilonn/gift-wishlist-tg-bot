import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

import { ConfirmModal } from "../components/ConfirmModal";
import { SafeImage } from "../components/SafeImage";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { adminAction, cancelGiftReservation, getGiftById, reserveGift } from "../lib/api";
import type { Gift } from "../lib/types";

type ActionState =
  | { type: "reserve"; gift: Gift }
  | { type: "cancel"; gift: Gift }
  | { type: "admin"; gift: Gift; action: AdminAction }
  | null;

type AdminAction = "mark-purchased" | "mark-active" | "release-reservation" | "hide" | "archive" | "restore";

const statusLabel: Record<Gift["status"], string> = {
  ACTIVE: "Активен",
  RESERVED: "Забронирован",
  PURCHASED: "Куплен",
  HIDDEN: "Скрыт",
  ARCHIVED: "В архиве"
};

const adminActionTitle: Record<AdminAction, string> = {
  "mark-purchased": "Отметить подарок как купленный?",
  "mark-active": "Вернуть подарок в активные?",
  "release-reservation": "Снять бронирование с подарка?",
  hide: "Скрыть подарок из каталога?",
  archive: "Перенести подарок в архив?",
  restore: "Восстановить подарок из архива?"
};

const adminActionConfirmText: Record<AdminAction, string> = {
  "mark-purchased": "Отметить как купленный",
  "mark-active": "Вернуть в активные",
  "release-reservation": "Снять бронирование",
  hide: "Скрыть",
  archive: "Перенести в архив",
  restore: "Восстановить"
};

export const GiftDetailsPage = () => {
  const { token, user } = useAuth();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionState, setActionState] = useState<ActionState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const giftQuery = useQuery({
    queryKey: ["gift-details", id],
    queryFn: () => getGiftById(token, id)
  });

  const reserveMutation = useMutation({
    mutationFn: (giftId: string) => reserveGift(token, giftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["gift-details", id] });
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Не удалось оформить бронирование. Повторите попытку.")
  });

  const cancelMutation = useMutation({
    mutationFn: (giftId: string) => cancelGiftReservation(token, giftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["gift-details", id] });
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Не удалось отменить бронирование.")
  });

  const adminMutation = useMutation({
    mutationFn: ({ giftId, action }: { giftId: string; action: AdminAction }) => adminAction(token, giftId, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["gift-details", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      setErrorMessage(null);
    },
    onError: () => setErrorMessage("Не удалось выполнить действие. Повторите попытку.")
  });

  if (giftQuery.isLoading) {
    return <p className="ui-alert">Загружаем карточку подарка...</p>;
  }

  if (giftQuery.isError || !giftQuery.data) {
    return <p className="ui-alert ui-alert--error">Не удалось загрузить подарок.</p>;
  }

  const gift = giftQuery.data;

  return (
    <Card className="details-card">
      <Button type="button" variant="ghost" size="sm" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} />
        К каталогу
      </Button>
      <div className="details-image-wrap">
        <SafeImage imageUrl={gift.imageUrl} alt={gift.title} className="details-image" fallbackClassName="details-image details-image-placeholder" />
      </div>
      <h2>{gift.title}</h2>
      <StatusBadge gift={gift} />
      {gift.description ? <p>{gift.description}</p> : null}
      {gift.price ? (
        <p className="gift-price">
          {gift.price} {gift.currency ?? ""}
        </p>
      ) : null}

      <div className="details-primary-actions">
        {gift.linkUrl ? (
          <a className="ui-button ui-button--secondary ui-button--md" href={gift.linkUrl} target="_blank" rel="noreferrer">
            Перейти к товару
          </a>
        ) : null}
        {gift.status === "ACTIVE" ? (
          <Button type="button" onClick={() => setActionState({ type: "reserve", gift })}>
            Забронировать
          </Button>
        ) : null}
        {gift.status === "RESERVED" && gift.isReservedByCurrentUser ? (
          <Button type="button" variant="destructive" onClick={() => setActionState({ type: "cancel", gift })}>
            Отменить бронирование
          </Button>
        ) : null}
      </div>

      {user.role === "ADMIN" ? (
        <div className="admin-block">
          <h3>Администрирование</h3>
          <div className="admin-meta-grid">
            <div className="admin-meta-item">
              <ShieldCheck size={16} />
              <div>
                <span>Статус</span>
                <strong>{statusLabel[gift.status]}</strong>
              </div>
            </div>
            <div className="admin-meta-item">
              <UserRound size={16} />
              <div>
                <span>Бронь</span>
                <strong>
                  {gift.reservedByUser
                    ? gift.reservedByUser.firstName ?? gift.reservedByUser.username ?? gift.reservedByUser.telegramId
                    : "Не указано"}
                </strong>
              </div>
            </div>
            <div className="admin-meta-item">
              <CalendarClock size={16} />
              <div>
                <span>Обновлено</span>
                <strong>{new Date(gift.updatedAt).toLocaleString("ru-RU")}</strong>
              </div>
            </div>
          </div>
          <div className="admin-actions">
            <Link to={`/admin/gifts/${gift.id}/edit`} className="ui-button ui-button--secondary ui-button--md">
              Редактировать
            </Link>
            {gift.status === "RESERVED" ? (
              <Button type="button" variant="secondary" onClick={() => setActionState({ type: "admin", gift, action: "release-reservation" })}>
                Снять бронирование
              </Button>
            ) : null}
            {gift.status === "ACTIVE" || gift.status === "RESERVED" ? (
              <Button type="button" onClick={() => setActionState({ type: "admin", gift, action: "mark-purchased" })}>
                Отметить как купленный
              </Button>
            ) : null}
            {gift.status !== "ACTIVE" ? (
              <Button type="button" variant="secondary" onClick={() => setActionState({ type: "admin", gift, action: "mark-active" })}>
                Вернуть в активные
              </Button>
            ) : null}
            {gift.status === "ACTIVE" ? (
              <Button type="button" variant="secondary" onClick={() => setActionState({ type: "admin", gift, action: "hide" })}>
                Скрыть
              </Button>
            ) : null}
            {gift.status !== "ARCHIVED" ? (
              <Button type="button" variant="destructive" onClick={() => setActionState({ type: "admin", gift, action: "archive" })}>
                Архивировать
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setActionState({ type: "admin", gift, action: "restore" })}>
                Восстановить
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {errorMessage ? <p className="ui-alert ui-alert--error">{errorMessage}</p> : null}

      <ConfirmModal
        open={actionState?.type === "reserve"}
        title="Подтвердите бронирование"
        description="После подтверждения подарок станет недоступен для бронирования другими участниками."
        confirmText="Забронировать"
        onClose={() => setActionState(null)}
        onConfirm={() => {
          if (!actionState || actionState.type !== "reserve") return;
          reserveMutation.mutate(actionState.gift.id);
          setActionState(null);
        }}
      />
      <ConfirmModal
        open={actionState?.type === "cancel"}
        title="Отменить бронирование"
        description="После отмены подарок снова станет доступен для бронирования."
        confirmText="Отменить бронирование"
        onClose={() => setActionState(null)}
        onConfirm={() => {
          if (!actionState || actionState.type !== "cancel") return;
          cancelMutation.mutate(actionState.gift.id);
          setActionState(null);
        }}
      />
      <ConfirmModal
        open={actionState?.type === "admin"}
        title={actionState?.type === "admin" ? adminActionTitle[actionState.action] : ""}
        description="Подтвердите выполнение действия."
        confirmText={actionState?.type === "admin" ? adminActionConfirmText[actionState.action] : "Подтвердить действие"}
        onClose={() => setActionState(null)}
        onConfirm={() => {
          if (!actionState || actionState.type !== "admin") return;
          adminMutation.mutate({
            giftId: actionState.gift.id,
            action: actionState.action
          });
          setActionState(null);
        }}
      />
    </Card>
  );
};
