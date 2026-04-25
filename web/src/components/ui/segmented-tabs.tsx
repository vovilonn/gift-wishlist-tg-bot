import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type SegmentedTabsProps<T extends string> = {
  value: T;
  items: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
};

export const SegmentedTabs = <T extends string>({ value, items, onChange, className }: SegmentedTabsProps<T>) => (
  <div className={cn("ui-segmented-tabs", className)}>
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        className={cn("ui-segmented-tabs__item", value === item.value && "ui-segmented-tabs__item--active")}
        onClick={() => onChange(item.value)}
      >
        {item.icon ? <span className="ui-segmented-tabs__icon">{item.icon}</span> : null}
        <span>{item.label}</span>
      </button>
    ))}
  </div>
);
