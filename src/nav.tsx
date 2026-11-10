import { createContext, useContext, useState, type ReactNode } from "react";
import type { PageId } from "./types";

interface NavValue {
  page: PageId;
  farmId: string | null;
  go: (page: PageId, farmId?: string | null) => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [farmId, setFarmId] = useState<string | null>(null);

  const value: NavValue = {
    page,
    farmId,
    go: (nextPage, nextFarmId = null) => {
      setPage(nextPage);
      setFarmId(nextFarmId);
    },
  };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error("useNav must be used within NavigationProvider");
  return value;
}
