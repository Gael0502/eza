import {
  ArrowUpRight,
  CalendarRange,
  Camera,
  Landmark,
  MapPin,
  Package,
  Ruler,
  ShoppingBasket,
  Sprout,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { Button, Card } from "../components";
import {
  acceptedListingQuantity,
  EMPTY_FINANCIAL_DATA,
  financingReadiness,
  remainingListingQuantity,
  selectedFarm,
} from "../finance-model";
import { useNav } from "../nav";
import {
  activeSeasonCount,
  activities,
  cropPerformance,
  formatDate,
  formatNumber,
  seasonProgress,
  seasonStatus,
  statusLabel,
  totalHarvestKg,
} from "../model";
import { useStore } from "../store";
import type { PageId } from "../types";

export function DashboardPage() {
  const { data } = useStore();
  const { go } = useNav();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const active = activeSeasonCount(data);
  const harvestKg = totalHarvestKg(data);
  const crops = cropPerformance(data);
  const maxCrop = Math.max(...crops.map((crop) => crop.quantityKg), 1);
  const recent = activities(data).slice(0, 6);
  const currentFarm = selectedFarm(data);
  const readiness = currentFarm ? financingReadiness(data, currentFarm).percent : 0;
  const openListings = financial.listings.filter((listing) => listing.status === "open");
  const expectedKg = openListings
    .filter((listing) => listing.availability === "expected")
    .reduce((sum, listing) => sum + listing.quantityKg, 0);
  const pendingOffers = financial.offers.filter(
    (offer) => offer.status === "pending" || offer.status === "countered",
  ).length;
  const committedKg = openListings.reduce(
    (sum, listing) => sum + acceptedListingQuantity(financial, listing.id),
    0,
  );
  const remainingKg = openListings.reduce(
    (sum, listing) => sum + remainingListingQuantity(financial, listing),
    0,
  );
  const seasons = data.seasons
    .map((season) => ({ season, status: seasonStatus(data, season), progress: seasonProgress(data, season) }))
    .filter((item) => item.status === "active" || item.status === "overdue")
    .sort((a, b) => b.progress - a.progress);
  const areaHa = data.farms.reduce((sum, farm) => sum + farm.sizeHa, 0);
  const inputCosts = ["Seeds", "Fertilizer", "Crop protection"].map((type) => ({
    type,
    cost: data.inputs
      .filter((input) => input.type === type && input.costRwf !== undefined)
      .reduce((sum, input) => sum + (input.costRwf ?? 0), 0),
  }));
  const maxInputCost = Math.max(...inputCosts.map((item) => item.cost), 1);
  const stats: { label: string; value: string; hint: string; page: PageId; icon: typeof Sprout }[] = [
    { label: "Registered farms", value: formatNumber(data.farms.length), hint: "Farm profiles", page: "farms", icon: Sprout },
    { label: "Active seasons", value: formatNumber(active), hint: "Currently growing", page: "seasons", icon: CalendarRange },
    { label: "Cultivated area", value: `${formatNumber(areaHa, 1)} ha`, hint: "Across registered farms", page: "farms", icon: Ruler },
    { label: "Recorded harvest", value: `${formatNumber(harvestKg)} kg`, hint: "Harvest records to date", page: "harvests", icon: Wheat },
    { label: "Expected supply", value: `${formatNumber(expectedKg)} kg`, hint: "Listed for pre-bulk sale", page: "marketplace", icon: TrendingUp },
  ];
  const farmerName = financial.farmerName?.trim();
  const greeting = farmerName ? `Welcome back, ${farmerName}` : "Welcome to your farm workspace";

  return (
    <div
      className="relative isolate space-y-6 rounded-[2rem]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(247, 249, 245, 0.18), rgba(247, 249, 245, 0.18)), url("https://static.wixstatic.com/media/fec29b8bee1944b7820b1207310d8224.jpg/v1/fill/w_980,h_653,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/fec29b8bee1944b7820b1207310d8224.jpg")',
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <section className="relative isolate min-h-[330px] overflow-hidden rounded-2xl bg-forest-900 text-white shadow-card sm:min-h-[370px]">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdna6oDV01M-e-QQ_ZUSKntI3SF8AYw42489S4CwhxDTYena2KT_yWj6p8&s=10"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/90 via-forest-950/65 to-forest-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/45 via-transparent to-forest-950/10" />
        <div className="relative z-10 flex min-h-[360px] max-w-4xl flex-col justify-center px-6 py-12 sm:min-h-[410px] sm:px-12 sm:py-14">
          <div className="max-w-2xl">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-forest-950/30 px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-fresh-300 backdrop-blur-sm">
              <Sprout className="h-3.5 w-3.5" /> FARM NETWORK OVERVIEW
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.04em] sm:text-5xl lg:text-6xl">{greeting}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              One clear view of your farm records, growing seasons, and opportunities ahead.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-forest-950/25 px-3.5 py-2 text-xs font-medium text-white/85 backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 text-fresh-300" /> Rwanda
              <span className="h-1 w-1 rounded-full bg-white/50" />
              {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
            </p>
            <div className="mt-5">
              <Button
                variant="secondary"
                className="!border-white/15 !bg-white !text-forest-900 hover:!bg-fresh-50"
                onClick={() => go("farms")}
              >
                <Sprout className="h-4 w-4" />
                Register new farm
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Farm statistics"
        className="rounded-3xl border border-sky-300/90 bg-sky-200/95 p-5 shadow-sm shadow-sky-900/[0.05] sm:p-7"
      >
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-900">At a glance</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-forest-900 sm:text-2xl">Your farm network</h2>
          </div>
          <span className="hidden rounded-full border border-sky-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-sky-900/70 sm:block">
            Updated from your saved records
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => go(stat.page)}
                className="group min-w-0 rounded-2xl border border-forest-700 bg-forest-900 p-4 text-left shadow-[0_8px_20px_rgba(13,43,30,0.16)] transition duration-200 hover:-translate-y-1 hover:border-fresh-500 hover:bg-forest-800 hover:shadow-xl hover:shadow-forest-950/25 focus-visible:border-fresh-400 sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium leading-5 text-white/80">{stat.label}</p>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fresh-400/15 text-fresh-300 ring-1 ring-inset ring-fresh-300/25 transition group-hover:bg-fresh-400/25">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <p className="mt-4 truncate text-[1.8rem] font-semibold leading-none tracking-[-0.045em] text-white">{stat.value}</p>
                <p className="mt-2 text-xs text-white/65">{stat.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5 rounded-3xl bg-forest-900/75 p-4 shadow-lg shadow-forest-950/10 backdrop-blur-sm sm:p-6">
        <div className="mb-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-fresh-300">Financial services</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">Prepare, plan, and find a market</h2>
          <p className="mt-1.5 text-sm text-white/65">Build a stronger farm profile and plan sales before harvest.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="relative overflow-hidden !bg-white/55 !p-0 backdrop-blur-lg">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fresh-50 text-forest-700">
                    <Landmark className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-forest-900">Access to finance</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Build a clear farm performance profile</p>
                  </div>
                </div>
                <span className="rounded-full bg-fresh-50 px-3 py-1.5 text-[11px] font-semibold text-forest-800">
                  {currentFarm ? `${readiness}% complete` : "Add a farm"}
                </span>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Farm record completeness</span>
                  <span className="font-semibold text-forest-800">{currentFarm ? `${readiness}%` : "—"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-forest-700 transition-all" style={{ width: `${readiness}%` }} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <p className="text-[13px] text-slate-500">Readiness supports preparation, not loan approval.</p>
              <button onClick={() => go("financial")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest-700 hover:text-forest-900">
                View financial profile <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>

          <Card className="relative overflow-hidden !bg-white/55 !p-0 backdrop-blur-lg">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fresh-50 text-forest-700">
                    <ShoppingBasket className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-forest-900">Pre-bulk marketplace</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Plan sales before produce is harvested</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                  {formatNumber(pendingOffers)} offers to review
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <MiniMetric label="Expected" value={`${formatNumber(expectedKg)} kg`} />
                <MiniMetric label="Committed" value={`${formatNumber(committedKg)} kg`} />
                <MiniMetric label="Remaining" value={`${formatNumber(remainingKg)} kg`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <p className="text-[13px] text-slate-500">Farmer listings and buyer offers in your workspace.</p>
              <button onClick={() => go("marketplace")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest-700 hover:text-forest-900">
                Open marketplace <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>
        </div>
      </section>

      <section aria-label="Farm performance and growing seasons" className="space-y-4 rounded-3xl bg-forest-900/75 p-4 shadow-lg shadow-forest-950/10 backdrop-blur-sm sm:space-y-5 sm:p-6">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-fresh-300">Production overview</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">See how your season is progressing</h2>
        <p className="mt-1.5 text-sm text-white/65">Harvest results and growing activity across your farms.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="h-fit !bg-white/55 backdrop-blur-lg xl:col-span-3">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-forest-600">Production</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-forest-950">Harvest performance</h3>
              <p className="mt-1 text-[13px] text-slate-500">Recorded output by crop</p>
            </div>
            <Button variant="ghost" className="px-2.5 py-2 text-xs" onClick={() => go("harvests")}>
              Harvest records <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {crops.length === 0 ? (
            <p className="rounded-xl bg-mist px-4 py-8 text-center text-sm text-slate-600">
              Harvest quantities will appear here once a harvest is recorded.
            </p>
          ) : (
            <div className="grid min-h-[290px] grid-cols-2 items-end gap-4 rounded-2xl bg-gradient-to-b from-fresh-50/80 to-white px-4 pb-4 pt-5 sm:grid-cols-3">
              {crops.slice(0, 6).map((crop) => {
                const bar = Math.max(12, (crop.quantityKg / maxCrop) * 100);
                return (
                  <div key={crop.crop} className="flex h-[250px] min-w-0 flex-col items-center justify-end">
                    <p className="mb-2 text-center text-sm font-bold tabular-nums text-forest-900">{formatNumber(crop.quantityKg)} <span className="text-[11px] font-medium text-slate-500">kg</span></p>
                    <div className="flex h-[72%] w-full items-end justify-center rounded-t-xl border-b border-slate-200/80 bg-white/45 px-3 pt-3 backdrop-blur-sm">
                      <div
                        className="w-full max-w-24 rounded-t-xl bg-gradient-to-t from-forest-800 to-fresh-500 shadow-sm transition-all duration-500"
                        style={{ height: `${bar}%` }}
                        title={`${crop.crop}: ${formatNumber(crop.quantityKg)} kg`}
                      />
                    </div>
                    <p className="mt-3 text-center text-sm font-semibold text-forest-950">{crop.crop}</p>
                    <p className="mt-1 rounded-full bg-fresh-50 px-2.5 py-1 text-[10px] font-semibold text-forest-700">
                      {crop.records} harvest {crop.records === 1 ? "record" : "records"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="min-w-0 !bg-white/55 backdrop-blur-lg xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-forest-600">In the field</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-forest-950">Growing seasons</h3>
              <p className="mt-1 text-[13px] text-slate-500">Progress across active farms</p>
            </div>
            <Button variant="ghost" className="px-2.5 py-2 text-xs" onClick={() => go("seasons")}>
              All seasons <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {seasons.length === 0 ? (
            <p className="text-sm leading-6 text-slate-600">No season is currently in the field.</p>
          ) : (
            <ul className="space-y-2.5">
              {seasons.slice(0, 5).map(({ season, progress, status }) => {
                const farm = data.farms.find((item) => item.id === season.farmId);
                return (
                  <li key={season.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition hover:border-fresh-200 hover:bg-fresh-50/50">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-forest-950">{farm?.name ?? "Farm"}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{season.name}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status === "overdue" ? "bg-amber-100 text-amber-800" : "bg-fresh-100 text-forest-800"}`}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${status === "overdue" ? "bg-amber-500" : "bg-gradient-to-r from-fresh-500 to-forest-600"}`}
                        style={{ width: `${status === "overdue" ? 100 : progress}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[10px] font-semibold tabular-nums text-slate-500">{Math.round(progress)}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      </section>

      <section aria-label="Farm inputs and recent activity" className="space-y-4 rounded-3xl bg-forest-900/75 p-4 shadow-lg shadow-forest-950/10 backdrop-blur-sm sm:space-y-5 sm:p-6">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-fresh-300">Farm activity</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">Keep track of day-to-day operations</h2>
        <p className="mt-1.5 text-sm text-white/65">Review recorded input costs and the latest farm updates.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="h-fit !bg-white/55 backdrop-blur-lg xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-forest-600">Farm costs</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-forest-950">Input expenditure</h3>
              <p className="mt-1 text-[13px] text-slate-500">Farmer-entered costs only</p>
            </div>
            <Button variant="ghost" className="px-2.5 py-2 text-xs" onClick={() => go("inputs")}>
              View inputs <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {inputCosts.some((item) => item.cost > 0) ? (
            <ul className="space-y-5 rounded-2xl bg-gradient-to-br from-fresh-50/55 to-white/40 p-4 backdrop-blur-sm">
              {inputCosts.map((item) => (
                <li key={item.type}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-[13px]">
                    <span className="font-medium text-slate-700">{item.type}</span>
                    <span className="font-semibold tabular-nums text-forest-950">{formatNumber(item.cost)} RWF</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                    <div className="h-full rounded-full bg-gradient-to-r from-fresh-500 to-forest-600" style={{ width: `${item.cost ? Math.max(4, item.cost / maxInputCost * 100) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-[230px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-gradient-to-br from-fresh-50/50 to-white/35 px-6 py-7 text-center backdrop-blur-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest-700 shadow-sm ring-1 ring-slate-200/70">
                <Package className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-forest-950">No costs recorded yet</p>
              <p className="mt-1 max-w-[230px] text-xs leading-5 text-slate-500">Add costs when recording farm inputs to see your spending breakdown here.</p>
              <Button variant="secondary" className="mt-4 px-3 py-2 text-xs" onClick={() => go("inputs")}>
                Record farm inputs <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>

        <Card className="min-w-0 !bg-white/55 backdrop-blur-lg xl:col-span-3">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-forest-600">Latest updates</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-forest-950">Recent farm activity</h3>
              <p className="mt-1 text-[13px] text-slate-500">The latest updates across your farms</p>
            </div>
            <Button variant="ghost" className="px-2.5 py-2 text-xs" onClick={() => go("monitoring")}>
              Crop monitoring <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-600">Activities appear here after farms, inputs, notes, or harvests are saved.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((activity) => (
                <li key={activity.id} className="flex gap-3 rounded-xl border border-white/70 bg-white/45 px-3.5 py-3 backdrop-blur-md transition hover:border-fresh-200 hover:bg-white/65 sm:gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fresh-50 text-forest-700 ring-1 ring-inset ring-fresh-100">
                    {activity.kind === "observation" ? (
                      <Camera className="h-4 w-4" />
                    ) : activity.kind === "harvest" ? (
                      <Wheat className="h-4 w-4" />
                    ) : activity.kind === "input" ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <Sprout className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="text-[13px] font-semibold text-forest-950">{activity.title}</p>
                      <p className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium tabular-nums text-slate-500">{formatDate(activity.date)}</p>
                    </div>
                    <p className="mt-1 text-xs font-medium text-forest-700">{activity.farmName}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{activity.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mist px-3 py-2.5">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-forest-900">{value}</p>
    </div>
  );
}
