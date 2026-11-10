import { ChartNoAxesCombined, Leaf, Lightbulb, ShieldCheck } from "lucide-react";
import { Card, EmptyState, SampleBadge } from "../../components";
import {
  EMPTY_FINANCIAL_DATA,
  estimatedSupplyByCrop,
  financingReadiness,
  selectedFarm,
} from "../../finance-model";
import { formatNumber } from "../../model";
import { useStore } from "../../store";
import type { FinancialRole } from "../../types";

export function CompetitiveIntelligence({ role }: { role: FinancialRole }) {
  const { data } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const supply = estimatedSupplyByCrop(financial);
  const demand = new Map<string, number>();
  const sampleDemand = new Map<string, number>();
  for (const request of financial.procurementRequests) {
    if (request.status !== "active") continue;
    const target = request.sample ? sampleDemand : demand;
    target.set(request.crop, (target.get(request.crop) ?? 0) + request.quantityKg);
  }
  const crops = [...new Set([...supply.keys(), ...demand.keys(), ...sampleDemand.keys()])].sort();
  const farmerView = role === "farmer";
  const farm = farmerView ? selectedFarm(data) : undefined;
  const performanceFarms =
    role === "admin"
      ? data.farms
      : farmerView && farm
        ? [farm]
        : [];
  const openListings = financial.listings.filter((listing) => listing.status === "open");
  const sampleListings = openListings.filter((listing) => listing.sample).length;
  const activeRequests = financial.procurementRequests.filter((request) => request.status === "active");
  const sampleRequests = activeRequests.filter((request) => request.sample).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-forest-900">EZA competitive intelligence</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Connect farm performance and financing preparation with expected crop supply and buyer
          requests. Summaries are descriptive and rely only on records available to the selected role.
        </p>
      </div>

      <div className="rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur-lg">
        <span className="font-semibold text-forest-900">Data sources</span> Supply and demand totals
        come from farmer listings and buyer requests recorded in this workspace. Prices are
        farmer-proposed; no live price or external demand feeds are included.
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open farmer listings" value={formatNumber(openListings.length)} />
        <Metric label="Expected supply listed" value={`${formatNumber([...supply.values()].reduce((sum, qty) => sum + qty, 0))} kg`} />
        <Metric label="Active procurement requests" value={formatNumber(activeRequests.length)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <ChartNoAxesCombined className="mt-0.5 h-5 w-5 text-forest-700" />
            <div>
              <h3 className="font-semibold text-forest-900">Supply and buyer demand by crop</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Listed expected quantities compared with active procurement requests. These are
                separate buyer and farmer records, not confirmed trades.
              </p>
            </div>
          </div>
          {crops.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Supply and request comparisons will appear after a farmer adds a listing or a buyer records a request.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {crops.map((crop) => (
                <div key={crop} className="rounded-xl bg-mist p-3">
                  <p className="font-semibold text-forest-900">{crop}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <p className="text-slate-600">
                      Expected supply:{" "}
                      <strong className="text-forest-900">{formatNumber(supply.get(crop) ?? 0)} kg</strong>
                    </p>
                    <p className="text-slate-600">
                      Entered requests:{" "}
                      <strong className="text-forest-900">
                        {formatNumber((demand.get(crop) ?? 0) + (sampleDemand.get(crop) ?? 0))} kg
                      </strong>
                    </p>
                  </div>
                  {sampleDemand.has(crop) ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Includes {formatNumber(sampleDemand.get(crop) ?? 0)} kg from example requests.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {sampleListings || sampleRequests ? (
            <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
              <SampleBadge />
              {sampleListings} example listing(s), {sampleRequests} example request(s) in this comparison.
            </p>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 text-forest-700" />
            <div>
              <h3 className="font-semibold text-forest-900">Market opportunity insights</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Simple comparisons from local listings and requests only; not a market-price prediction.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {crops.length === 0 ? (
              <li className="rounded-xl bg-mist p-3">No crop supply or demand records are available yet.</li>
            ) : (
              crops.map((crop) => {
                const kgSupply = supply.get(crop) ?? 0;
                const kgDemand = (demand.get(crop) ?? 0) + (sampleDemand.get(crop) ?? 0);
                const gap = kgDemand - kgSupply;
                return (
                  <li key={crop} className="rounded-xl bg-mist p-3">
                    <span className="font-semibold text-forest-900">{crop}: </span>
                    {kgDemand === 0
                      ? `${formatNumber(kgSupply)} kg listed, with no active buyer request recorded.`
                      : gap > 0
                        ? `Entered requests exceed listed expected supply by ${formatNumber(gap)} kg.`
                        : kgSupply > 0
                          ? `Listed expected supply exceeds entered requests by ${formatNumber(Math.abs(gap))} kg.`
                          : `${formatNumber(kgDemand)} kg of buyer requests are recorded; no expected listing is available.`}
                    {sampleDemand.has(crop) || openListings.some((listing) => listing.crop === crop && listing.sample)
                      ? " Example records are included."
                      : ""}
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>

      {performanceFarms.length ? (
        <Card>
          <div className="flex items-start gap-3">
            <Leaf className="mt-0.5 h-5 w-5 text-forest-700" />
            <div>
              <h3 className="font-semibold text-forest-900">Farm performance summaries</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Record coverage is shown separately from production consistency. EZA does not infer a
                stable yield from incomplete season history.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {performanceFarms.map((item) => {
              const harvests = data.harvests.filter((harvest) => harvest.farmId === item.id);
              const seasons = data.seasons.filter((season) => season.farmId === item.id);
              const seasonsWithHarvest = seasons.filter((season) =>
                harvests.some((harvest) => harvest.seasonId === season.id),
              ).length;
              const readiness = financingReadiness(data, item);
              const listed = financial.listings
                .filter((listing) => listing.farmId === item.id && listing.status === "open")
                .reduce((sum, listing) => sum + listing.quantityKg, 0);
              return (
                <li key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-forest-900">{item.name}</h4>
                    {item.sample ? <SampleBadge /> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.location} · {item.crop} · {formatNumber(item.sizeHa, 1)} ha</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-slate-600">
                      Harvest records: <strong className="text-forest-900">{harvests.length}</strong>
                    </p>
                    <p className="text-slate-600">
                      Recorded output:{" "}
                      <strong className="text-forest-900">
                        {formatNumber(harvests.reduce((sum, harvest) => sum + harvest.quantityKg, 0))} kg
                      </strong>
                    </p>
                    <p className="text-slate-600">
                      Seasons with harvests:{" "}
                      <strong className="text-forest-900">{seasonsWithHarvest} / {seasons.length}</strong>
                    </p>
                    <p className="text-slate-600">
                      Current listed supply: <strong className="text-forest-900">{formatNumber(listed)} kg</strong>
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-fresh-50 px-3 py-2 text-sm text-forest-800">
                    <ShieldCheck className="h-4 w-4" />
                    Financing preparation: {readiness.percent}% record completeness
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Production consistency is not assessed; season history may be incomplete.
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : role === "buyer" ? (
        <Card>
          <h3 className="font-semibold text-forest-900">Private farm performance records</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Buyers see only the farm, location, quality, and quantities that farmers explicitly
            publish in a listing. Historical harvest records and financing readiness are private.
          </p>
        </Card>
      ) : null}

      {!data.farms.length && !financial.listings.length ? (
        <EmptyState
          icon={<ChartNoAxesCombined className="h-5 w-5" />}
          title="Not enough farm records yet"
          body="Register a farm and add seasons, inputs, harvests, or a produce listing to build a performance summary."
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-forest-900">{value}</p>
    </Card>
  );
}
