import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmModal } from "../components/ConfirmModal";
import { GiftCard } from "../components/GiftCard";
import { useAuth } from "../hooks/useAuth";
import { cancelGiftReservation, getGifts, reserveGift } from "../lib/api";
import type { Gift } from "../lib/types";

export const MyReservationsPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [modalGift, setModalGift] = useState<{ gift: Gift; mode: "reserve" | "cancel" } | null>(null);

  const reservationsQuery = useQuery({
    queryKey: ["my-reservations"],
    queryFn: () => getGifts(token, { onlyMine: true })
  });

  const reserveMutation = useMutation({
    mutationFn: (giftId: string) => reserveGift(token, giftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (giftId: string) => cancelGiftReservation(token, giftId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
    }
  });

  return (
    <section>
      <h2>Мои бронирования</h2>
      {reservationsQuery.isLoading ? <p className="ui-alert">Загружаем ваши бронирования...</p> : null}
      {reservationsQuery.isError ? <p className="ui-alert ui-alert--error">Не удалось загрузить список бронирований.</p> : null}
      {reservationsQuery.data?.length ? (
        <div className="gift-grid">
          {reservationsQuery.data.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              role={user.role}
              onReserve={(targetGift) => setModalGift({ gift: targetGift, mode: "reserve" })}
              onCancel={(targetGift) => setModalGift({ gift: targetGift, mode: "cancel" })}
            />
          ))}
        </div>
      ) : null}
      {reservationsQuery.data?.length === 0 ? <p className="empty-message">У вас пока нет активных бронирований.</p> : null}

      <ConfirmModal
        open={modalGift?.mode === "reserve"}
        title="Подтвердите бронирование"
        description="После подтверждения подарок станет недоступен для бронирования другими участниками."
        confirmText="Забронировать"
        onClose={() => setModalGift(null)}
        onConfirm={() => {
          if (!modalGift) return;
          reserveMutation.mutate(modalGift.gift.id);
          setModalGift(null);
        }}
      />

      <ConfirmModal
        open={modalGift?.mode === "cancel"}
        title="Отменить бронирование"
        description="После отмены подарок снова станет доступен для бронирования."
        confirmText="Отменить бронирование"
        onClose={() => setModalGift(null)}
        onConfirm={() => {
          if (!modalGift) return;
          cancelMutation.mutate(modalGift.gift.id);
          setModalGift(null);
        }}
      />
    </section>
  );
};
