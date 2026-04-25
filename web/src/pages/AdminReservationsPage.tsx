import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { adminAction, getAdminReservations } from "../lib/api";

const reserveName = (reservation: {
  reservedBy: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    telegramId: string;
  } | null;
}) => {
  if (!reservation.reservedBy) return "Не указан";
  const fullName = [reservation.reservedBy.firstName, reservation.reservedBy.lastName].filter(Boolean).join(" ").trim();
  return fullName || reservation.reservedBy.username || reservation.reservedBy.telegramId;
};

export const AdminReservationsPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const reservationsQuery = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => getAdminReservations(token),
    enabled: user.role === "ADMIN"
  });

  const mutation = useMutation({
    mutationFn: ({ giftId, action }: { giftId: string; action: "release-reservation" | "mark-purchased" }) =>
      adminAction(token, giftId, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["gift-details"] });
    }
  });

  if (user.role !== "ADMIN") {
    return <p className="ui-alert ui-alert--error">Недостаточно прав для доступа к этому разделу.</p>;
  }

  return (
    <section>
      <h2>Активные бронирования</h2>
      {reservationsQuery.isLoading ? <p className="ui-alert">Загружаем список бронирований...</p> : null}
      {reservationsQuery.isError ? <p className="ui-alert ui-alert--error">Не удалось загрузить список бронирований.</p> : null}
      {reservationsQuery.data?.length ? (
        <div className="reservation-list">
          {reservationsQuery.data.map((reservation) => (
            <article key={reservation.gift.id} className="reservation-card">
              <h3>{reservation.gift.title}</h3>
              <p>Пользователь: {reserveName(reservation)}</p>
              <p>Telegram ID: {reservation.reservedBy?.telegramId ?? "-"}</p>
              <p>Дата бронирования: {reservation.reservedAt ? new Date(reservation.reservedAt).toLocaleString("ru-RU") : "-"}</p>
              <div className="reservation-actions">
                <Link to={`/gift/${reservation.gift.id}`} className="ui-button ui-button--secondary ui-button--md">
                  Открыть карточку
                </Link>
                <button
                  type="button"
                  className="ui-button ui-button--destructive ui-button--md"
                  onClick={() => mutation.mutate({ giftId: reservation.gift.id, action: "release-reservation" })}
                >
                  Снять бронирование
                </button>
                <button type="button" className="ui-button ui-button--default ui-button--md" onClick={() => mutation.mutate({ giftId: reservation.gift.id, action: "mark-purchased" })}>
                  Отметить как купленный
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {reservationsQuery.data?.length === 0 ? <p className="empty-message">Активных бронирований пока нет.</p> : null}
    </section>
  );
};
