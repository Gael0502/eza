import {
  AlertTriangle,
  Bell,
  Camera,
  CalendarRange,
  ChevronRight,
  Landmark,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBasket,
  Sprout,
  Wheat,
  X,
} from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "./components";
import { buildInsights } from "./model";
import { useNav } from "./nav";
import santosPortrait from "./assets/santos-karake.png";
import { DashboardPage } from "./pages/Dashboard";
import { FarmsPage } from "./pages/Farms";
import { FinancialServicesPage } from "./pages/FinancialServices";
import { HarvestsPage } from "./pages/Harvests";
import { InputsPage } from "./pages/Inputs";
import { IntelligencePage } from "./pages/Intelligence";
import { MonitoringPage } from "./pages/Monitoring";
import { SeasonsPage } from "./pages/Seasons";
import { useStore } from "./store";
import type { PageId } from "./types";

type NavItem = { id: PageId; label: string; icon: typeof LayoutDashboard };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Farm operations",
    items: [
      { id: "farms", label: "My farms", icon: Sprout },
      { id: "seasons", label: "Growing seasons", icon: CalendarRange },
      { id: "monitoring", label: "Crop monitoring", icon: Camera },
      { id: "inputs", label: "Farm inputs", icon: Package },
      { id: "harvests", label: "Harvest records", icon: Wheat },
    ],
  },
  { label: "Intelligence", items: [{ id: "intelligence", label: "EZA Intelligence", icon: Lightbulb }] },
  {
    label: "Financial services",
    items: [
      { id: "financial", label: "Access to finance", icon: Landmark },
      { id: "marketplace", label: "Pre-bulk marketplace", icon: ShoppingBasket },
    ],
  },
];
const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

type SearchResult =
  | { kind: "page"; id: PageId; label: string; detail: string }
  | { kind: "farm"; id: string; label: string; detail: string };

export function Shell() {
  const { page, go } = useNav();
  const { data, persistError, restoreSample, clearAll } = useStore();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"restore" | "clear" | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => item.id === page) ?? NAV_ITEMS[0];
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const notifications = buildInsights(data).length;
  const results = useMemo((): SearchResult[] => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    const pages = NAV_ITEMS
      .filter((item) => item.label.toLowerCase().includes(text))
      .map((item) => ({ kind: "page" as const, id: item.id, label: item.label, detail: "Open section" }));
    const farms = data.farms
      .filter((farm) =>
        [farm.name, farm.location, farm.crop].some((value) => value.toLowerCase().includes(text)),
      )
      .map((farm) => ({
        kind: "farm" as const,
        id: farm.id,
        label: farm.name,
        detail: `${farm.crop} · ${farm.location}`,
      }));
    return [...farms, ...pages].slice(0, 6);
  }, [data.farms, query]);

  function navigate(next: PageId) {
    go(next, null);
    setOpen(false);
  }

  function selectResult(result: SearchResult) {
    if (result.kind === "farm") go("farms", result.id);
    else go(result.id, null);
    setQuery("");
    setSearchOpen(false);
    setOpen(false);
  }

  function submitSearch(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results[0]) selectResult(results[0]);
    if (event.key === "Escape") setSearchOpen(false);
  }

  let content: ReactNode;
  switch (page) {
    case "farms":
      content = <FarmsPage />;
      break;
    case "seasons":
      content = <SeasonsPage />;
      break;
    case "inputs":
      content = <InputsPage />;
      break;
    case "monitoring":
      content = <MonitoringPage />;
      break;
    case "harvests":
      content = <HarvestsPage />;
      break;
    case "intelligence":
      content = <IntelligencePage />;
      break;
    case "financial":
      content = <FinancialServicesPage initialSection="finance" />;
      break;
    case "marketplace":
      content = <FinancialServicesPage initialSection="market" />;
      break;
    default:
      content = <DashboardPage />;
  }

  return (
    <div className="min-h-full bg-mist text-ink">
      {open ? (
        <button
          className="fixed inset-0 z-30 bg-forest-950/45 backdrop-blur-[2px] md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-forest-900 text-white shadow-2xl shadow-forest-950/15 transition-transform duration-300 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-white/[0.08] px-5 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <button
              type="button"
              onClick={() => navigate("dashboard")}
              aria-label="Go to EZA home dashboard"
              aria-current={page === "dashboard" ? "page" : undefined}
              className="group flex items-center gap-3 rounded-xl text-left transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fresh-300"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fresh-500 text-white shadow-lg shadow-black/10">
                <Leaf className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold tracking-[0.12em]">EZA</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-fresh-300">
                  Farm intelligence
                </p>
              </div>
            </button>
            <button
              className="rounded-lg p-1 text-white/75 hover:bg-white/10 md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 max-w-[215px]">
            <p className="text-xs font-medium leading-5 text-white/85">Agriculture, intelligently connected.</p>
            <p className="mt-1 text-[10px] leading-4 text-white/50">Empowering farmers. Connecting finance. Unlocking markets.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Primary">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = page === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition duration-200 ${
                        active
                          ? "bg-fresh-500 text-white shadow-md shadow-black/10 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-white"
                          : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      <Icon className={`h-[17px] w-[17px] ${active ? "text-white" : "text-white/45 group-hover:text-fresh-300"}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fresh-100 text-xs font-bold text-forest-900">
              RW
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/90">Farmer workspace</p>
              <p className="mt-0.5 text-[11px] text-white/50">Rwanda · Saved on this device</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              className="rounded-lg px-2 py-2 text-left text-[11px] font-medium text-white/50 transition hover:bg-white/[0.06] hover:text-white"
              onClick={() => setConfirm("restore")}
            >
              Load examples
            </button>
            <button
              className="rounded-lg px-2 py-2 text-left text-[11px] font-medium text-white/50 transition hover:bg-red-400/10 hover:text-red-100"
              onClick={() => setConfirm("clear")}
            >
              Clear records
            </button>
          </div>
        </div>
      </aside>

      <div className={`md:pl-[264px] ${page === "dashboard" ? "min-h-[calc(100vh-72px)] bg-sky-200/95" : "min-h-[calc(100vh-72px)] bg-mist"}`}>
        <header className="sticky top-0 z-20 border-b border-white/10 bg-forest-900 text-white shadow-sm shadow-forest-950/10 backdrop-blur-xl">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-xl border border-white/15 bg-white/10 p-2 text-white shadow-sm transition hover:bg-white/15 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="hidden items-center gap-1.5 text-[11px] text-white/50 sm:flex">
                  <span>EZA</span><ChevronRight className="h-3 w-3" /><span>Workspace</span><ChevronRight className="h-3 w-3" />
                </div>
                <p className="truncate text-sm font-semibold text-white">{current.label}</p>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-5 lg:flex">
              <div className="relative w-full max-w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={submitSearch}
                  placeholder="Search farms, crops, or sections"
                  aria-label="Search EZA"
                  aria-expanded={searchOpen && Boolean(query.trim())}
                  className="w-full rounded-xl border border-slate-200 bg-mist py-2.5 pl-9 pr-3 text-xs text-ink outline-none transition placeholder:text-slate-400 focus:border-fresh-500 focus:bg-white focus:ring-4 focus:ring-fresh-500/10"
                />
                {searchOpen && query.trim() ? (
                  <>
                    <button className="fixed inset-0 z-10 cursor-default" aria-label="Close search results" onClick={() => setSearchOpen(false)} />
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-forest-950/10">
                      {results.length ? results.map((result) => (
                        <button
                          key={`${result.kind}-${result.id}`}
                          onClick={() => selectResult(result)}
                          className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-fresh-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-forest-900">{result.label}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">{result.detail}</span>
                          </span>
                          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </button>
                      )) : (
                        <p className="px-3 py-4 text-center text-xs text-slate-500">No matching farms or sections.</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 xl:inline-flex">
                <MapPin className="h-3.5 w-3.5 text-forest-700" />
                Rwanda
              </span>
              <button
                className="relative rounded-xl p-2.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                onClick={() => navigate("intelligence")}
                aria-label={`${notifications} agricultural alerts`}
              >
                <Bell className="h-[18px] w-[18px]" />
                {notifications > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-fresh-500 ring-2 ring-white" /> : null}
              </button>
              <span className="hidden text-[11px] text-white/65 xl:block">{today}</span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-fresh-100 text-xs font-bold tracking-wide text-forest-900 ring-1 ring-inset ring-fresh-200"
                onClick={() => navigate("financial")}
                aria-label="Open farmer profile and financial services"
              >
                EZ
              </button>
              <button
                className="hidden rounded-xl bg-forest-700 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-forest-800 sm:inline-flex"
                onClick={() => navigate("farms")}
              >
                Register a farm
              </button>
            </div>
          </div>
        </header>

        <main className={`mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${page === "dashboard" ? "" : "text-ink"}`}>
          {persistError ? (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-white px-4 py-3.5 text-sm text-red-900 shadow-card">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{persistError}</p>
            </div>
          ) : null}
          {content}
        </main>
        <EzaFooter />
      </div>

      <ConfirmDialog
        open={confirm === "restore"}
        title="Load example records?"
        body="This replaces all records currently saved on this device with EZA's example farm, season, input, photograph, harvest, and market records."
        confirmLabel="Load example records"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          restoreSample();
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === "clear"}
        title="Clear all records?"
        body="This permanently deletes every farm, season, input, photograph, harvest, financial application, market listing, and offer saved on this device. You can load the example records again afterwards."
        confirmLabel="Clear all records"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          clearAll();
          setConfirm(null);
        }}
      />
    </div>
  );
}

function EzaFooter() {
  const founders = [
    { initials: "IK", name: "Ismael Kaleeba", image: "https://www.siliconinstitute.org/images/Kaleeba.jpeg" },
    { initials: "SK", name: "Santos Karake", image: santosPortrait },
  ];

  return (
    <footer className="bg-[#123D2B] text-white">
      <div className="mx-auto max-w-[1440px] px-4 pb-5 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#91C96B] text-[#123D2B] shadow-lg shadow-black/10">
                <Leaf className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold tracking-[0.14em]">EZA</p>
                <p className="mt-0.5 text-xs font-medium text-white/65">Agriculture, intelligently connected.</p>
              </div>
            </div>
            <h2 className="mt-8 text-xs font-bold tracking-[0.2em] text-[#91C96B]">THE EZA VISIONARIES</h2>
            <p className="mt-3 max-w-lg text-lg font-medium leading-7 text-white sm:text-xl">
              Built on a vision of a smarter, more connected and financially inclusive agricultural future.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">
              Building a future where every farmer has the intelligence, opportunities and connections to thrive.
            </p>
          </div>

          <div className="grid content-start gap-3 sm:grid-cols-2">
            {founders.map((founder) => (
              <section
                key={founder.name}
                className="flex min-h-[112px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5 transition-colors hover:border-[#91C96B]/35 hover:bg-white/[0.09]"
              >
                {founder.image ? (
                  <img
                    src={founder.image}
                    alt={founder.name}
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 rounded-full border border-[#91C96B]/40 object-cover object-center"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#91C96B]/35 bg-[#91C96B]/15 text-sm font-bold tracking-wide text-[#B8E398]">
                    {founder.initials}
                  </span>
                )}
                <div>
                  <h3 className="text-base font-semibold leading-6 text-white">{founder.name}</h3>
                  <p className="mt-1 text-xs font-medium text-[#91C96B]">Co-Founder</p>
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-4 text-xs text-white/50 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 EZA. All rights reserved.</span>
          <span className="font-medium tracking-wide text-white/65">Agriculture, intelligently connected.</span>
        </div>
      </div>
    </footer>
  );
}
