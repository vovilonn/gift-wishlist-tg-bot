import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Input, Select, Textarea } from "../components/ui/field";
import { useAuth } from "../hooks/useAuth";
import { createGift, getGiftById, updateGift } from "../lib/api";
import type { GiftPriority } from "../lib/types";

type GiftForm = {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  price: string;
  currency: string;
  priority: GiftPriority | "";
};

const initialForm: GiftForm = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  price: "",
  currency: "EUR",
  priority: ""
};

export const AdminGiftFormPage = () => {
  const { token, user } = useAuth();
  const params = useParams();
  const giftId = params.id;
  const isEdit = Boolean(giftId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GiftForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const giftQuery = useQuery({
    queryKey: ["gift-details", giftId],
    queryFn: () => getGiftById(token, giftId!),
    enabled: isEdit
  });

  useEffect(() => {
    if (!giftQuery.data) {
      return;
    }
    setForm({
      title: giftQuery.data.title,
      description: giftQuery.data.description ?? "",
      imageUrl: giftQuery.data.imageUrl ?? "",
      linkUrl: giftQuery.data.linkUrl ?? "",
      price: giftQuery.data.price ?? "",
      currency: giftQuery.data.currency ?? "EUR",
      priority: giftQuery.data.priority ?? ""
    });
  }, [giftQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        linkUrl: form.linkUrl.trim() || null,
        price: form.price.trim() || null,
        currency: form.currency.trim() || null,
        priority: form.priority || null
      };
      if (isEdit && giftId) {
        return updateGift(token, giftId, payload);
      }
      return createGift(token, payload);
    },
    onSuccess: async (gift) => {
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-dashboard-gifts"] });
      navigate(`/gift/${gift.id}`);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось сохранить изменения. Повторите попытку.");
    }
  });

  const formTitle = useMemo(() => (isEdit ? "Редактирование подарка" : "Новый подарок"), [isEdit]);
  const submitText = useMemo(() => {
    if (mutation.isPending) {
      return isEdit ? "Сохраняем изменения..." : "Создаём подарок...";
    }
    return isEdit ? "Сохранить изменения" : "Создать подарок";
  }, [isEdit, mutation.isPending]);

  if (user.role !== "ADMIN") {
    return <p className="ui-alert ui-alert--error">Недостаточно прав для доступа к этому разделу.</p>;
  }

  if (isEdit && giftQuery.isLoading) {
    return <p className="ui-alert">Загружаем данные подарка...</p>;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 2) {
      setErrorMessage("Название должно содержать не менее 2 символов.");
      return;
    }
    setErrorMessage(null);
    mutation.mutate();
  };

  return (
    <section>
      <h2>{formTitle}</h2>
      <form className="gift-form" onSubmit={onSubmit}>
        <label>
          Название
          <Input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Например: LEGO, книга или наушники"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
        <label>
          Описание
          <Textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Укажите важные детали: модель, цвет, размер, предпочтения"
            maxLength={2000}
          />
        </label>
        <label>
          Ссылка на товар
          <Input
            type="url"
            value={form.linkUrl}
            onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))}
            placeholder="https://..."
          />
        </label>
        <label>
          Ссылка на изображение
          <Input
            type="url"
            value={form.imageUrl}
            onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
            placeholder="https://..."
          />
        </label>
        <label>
          Цена
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            placeholder="50"
          />
        </label>
        <label>
          Валюта
          <Select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="MDL">MDL</option>
            <option value="RUB">RUB</option>
            <option value="RON">RON</option>
            <option value="Other">Другая</option>
          </Select>
        </label>
        <label>
          Приоритет
          <Select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as GiftPriority | "" }))}>
            <option value="">Не указан</option>
            <option value="LOW">Низкий</option>
            <option value="MEDIUM">Средний</option>
            <option value="HIGH">Высокий</option>
          </Select>
        </label>
        {errorMessage ? <p className="ui-alert ui-alert--error">{errorMessage}</p> : null}
        <div className="gift-form-actions">
          <Button type="submit" disabled={mutation.isPending}>
            {submitText}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Отменить
          </Button>
        </div>
      </form>
    </section>
  );
};
