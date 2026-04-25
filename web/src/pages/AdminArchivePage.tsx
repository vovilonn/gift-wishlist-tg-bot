import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../hooks/useAuth";
import { adminAction, getGifts } from "../lib/api";

const statusLabel: Record<"HIDDEN" | "PURCHASED" | "ARCHIVED", string> = {
  HIDDEN: "Скрытые",
  PURCHASED: "Купленные",
  ARCHIVED: "Архив"
};

export const AdminArchivePage = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const hiddenQuery = useQuery({
    queryKey: ["admin-hidden"],
    queryFn: () => getGifts(token, { status: "HIDDEN" }),
    enabled: user.role === "ADMIN"
  });

  const purchasedQuery = useQuery({
    queryKey: ["admin-purchased"],
    queryFn: () => getGifts(token, { status: "PURCHASED" }),
    enabled: user.role === "ADMIN"
  });

  const archivedQuery = useQuery({
    queryKey: ["admin-archived"],
    queryFn: () => getGifts(token, { status: "ARCHIVED" }),
    enabled: user.role === "ADMIN"
  });

  const mutation = useMutation({
    mutationFn: ({ giftId, action }: { giftId: string; action: "mark-active" | "restore" }) => adminAction(token, giftId, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-hidden"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-purchased"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-archived"] }),
        queryClient.invalidateQueries({ queryKey: ["gifts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard-gifts"] })
      ]);
    }
  });

  if (user.role !== "ADMIN") {
    return <p className="ui-alert ui-alert--error">Недостаточно прав для доступа к этому разделу.</p>;
  }

  const sections = [
    { key: "HIDDEN" as const, data: hiddenQuery.data ?? [] },
    { key: "PURCHASED" as const, data: purchasedQuery.data ?? [] },
    { key: "ARCHIVED" as const, data: archivedQuery.data ?? [] }
  ];

  return (
    <section>
      <h2>Скрытые, купленные и архивные</h2>
      {sections.map((section) => (
        <div key={section.key} className="admin-section">
          <h3>{statusLabel[section.key]}</h3>
          {section.data.length ? (
            <div className="admin-list">
              {section.data.map((gift) => (
                <article key={gift.id} className="admin-list-item">
                  <div>
                    <strong>{gift.title}</strong>
                    <p>{gift.description ?? "Описание не указано"}</p>
                  </div>
                  <div className="admin-list-actions">
                    {section.key === "ARCHIVED" ? (
                      <button type="button" className="ui-button ui-button--default ui-button--md" onClick={() => mutation.mutate({ giftId: gift.id, action: "restore" })}>
                        Восстановить
                      </button>
                    ) : (
                      <button type="button" className="ui-button ui-button--secondary ui-button--md" onClick={() => mutation.mutate({ giftId: gift.id, action: "mark-active" })}>
                        Вернуть в активные
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-message">В этом разделе пока нет подарков.</p>
          )}
        </div>
      ))}
    </section>
  );
};
