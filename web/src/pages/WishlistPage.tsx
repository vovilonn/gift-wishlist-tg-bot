import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift as GiftIcon, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ConfirmModal } from "../components/ConfirmModal";
import { GiftCard } from "../components/GiftCard";
import { SegmentedTabs } from "../components/ui/segmented-tabs";
import { useAuth } from "../hooks/useAuth";
import { ApiClientError, cancelGiftReservation, getGifts, reserveGift } from "../lib/api";
import type { Gift, GiftStatus } from "../lib/types";

type TabKey = "all" | "free";

const statusFromTab = (tab: TabKey): GiftStatus | undefined => {
  if (tab === "free") return "ACTIVE";
  return undefined;
};

export const WishlistPage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get("tab") as TabKey | null) ?? "all";
  const availableTabs: TabKey[] = ["all", "free"];
  const activeTab = availableTabs.includes(currentTab) ? currentTab : "all";
  const [modalState, setModalState] = useState<{ mode: "reserve" | "cancel"; gift: Gift } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const giftQuery = useQuery({
    queryKey: ["gifts", activeTab, user.role],
    queryFn: () =>
      getGifts(token, {
        status: statusFromTab(activeTab)
      })
  });

  const reserveMutation = useMutation({
    mutationFn: (giftId: string) => reserveGift(token, giftId),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["gift-details"] });
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiClientError && mutationError.statusCode === 409) {
        setError("Подарок уже забронирован другим участником.");
      } else {
        setError("Не удалось оформить бронирование. Проверьте подключение и повторите попытку.");
      }
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (giftId: string) => cancelGiftReservation(token, giftId),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["gift-details"] });
    },
    onError: () => {
      setError("Не удалось отменить бронирование.");
    }
  });

  const emptyText = useMemo(() => {
    if (activeTab === "free") return "Свободных подарков пока нет.";
    return user.role === "ADMIN"
      ? "Список подарков пока пуст. Добавьте первый подарок."
      : "Список подарков пока пуст.";
  }, [activeTab, user.role]);

  const primaryTabItems = [
    { value: "all" as TabKey, label: "Все", icon: <Sparkles size={14} /> },
    { value: "free" as TabKey, label: "Свободные", icon: <GiftIcon size={14} /> }
  ];

  return (
    <section className="wishlist-section">
      <div className="wishlist-toolbar">
        <div className="wishlist-toolbar__header">
          <h3>Каталог подарков</h3>
          <p>Используйте фильтры, чтобы быстро найти подходящий подарок.</p>
        </div>
        <SegmentedTabs
          value={activeTab}
          items={primaryTabItems}
          className="wishlist-primary-tabs"
          onChange={(value) => setSearchParams(value === "all" ? {} : { tab: value })}
        />
      </div>

      {error ? <p className="ui-alert ui-alert--error">{error}</p> : null}

      {giftQuery.isLoading ? <p className="ui-alert">Загружаем каталог...</p> : null}
      {giftQuery.isError ? <p className="ui-alert ui-alert--error">Не удалось загрузить каталог подарков.</p> : null}

      {giftQuery.data?.length ? (
        <div className="gift-grid">
          {giftQuery.data.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              role={user.role}
              onReserve={(targetGift) => setModalState({ mode: "reserve", gift: targetGift })}
              onCancel={(targetGift) => setModalState({ mode: "cancel", gift: targetGift })}
            />
          ))}
        </div>
      ) : null}

      {giftQuery.data?.length === 0 ? <p className="empty-message">{emptyText}</p> : null}

      <ConfirmModal
        open={Boolean(modalState?.mode === "reserve")}
        title="Подтвердите бронирование"
        description="После подтверждения подарок станет недоступен для бронирования другими участниками."
        confirmText="Забронировать"
        onClose={() => setModalState(null)}
        onConfirm={() => {
          if (!modalState) return;
          reserveMutation.mutate(modalState.gift.id);
          setModalState(null);
        }}
      />
      <ConfirmModal
        open={Boolean(modalState?.mode === "cancel")}
        title="Отменить бронирование"
        description="После отмены подарок снова станет доступен для бронирования."
        confirmText="Отменить бронирование"
        onClose={() => setModalState(null)}
        onConfirm={() => {
          if (!modalState) return;
          cancelMutation.mutate(modalState.gift.id);
          setModalState(null);
        }}
      />
    </section>
  );
};
