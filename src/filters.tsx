import { useState } from "react";
import { useNav } from "./nav";
import { useStore } from "./store";

export function FarmFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data } = useStore();
  return (
    <label className="block min-w-[220px]">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Farm</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="all">All farms</option>
        {data.farms
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
      </select>
    </label>
  );
}

export function useFarmSelection(): [string, (value: string) => void] {
  const { farmId } = useNav();
  const [value, setValue] = useState(farmId ?? "all");
  const [seen, setSeen] = useState(farmId);
  if (farmId !== seen) {
    setSeen(farmId);
    if (farmId) setValue(farmId);
  }
  return [value, setValue];
}
