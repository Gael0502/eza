import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { Button, EmptyState, PageHeader } from "../components";
import { buildInsights } from "../model";
import { useNav } from "../nav";
import { useStore } from "../store";

export function IntelligencePage() {
  const { data } = useStore();
  const { go } = useNav();
  const insights = buildInsights(data);

  return (
    <div>
      <PageHeader
        title="EZA Intelligence"
        description="Timely alerts based on your farm, season, and activity records."
      />
      <div className="mb-5 rounded-2xl border border-border bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
        <p className="font-semibold text-forest-900">Record-based alerts</p>
        <p className="mt-1">
          Alerts use clear rules to highlight upcoming harvests, overdue activities, and missing updates. Yield comparisons use a non-official reference and are not agronomic advice or a prediction.
        </p>
      </div>

      {data.farms.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-5 w-5" />}
          title="No records to review"
          body="Register a farm and add a season, input, or harvest. Alerts appear when a rule matches those records."
        />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-5 w-5" />}
          title="No current alerts"
          body="Your records have no upcoming harvests, overdue activities, or missing updates to review."
        />
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const styles = {
              attention: "border-red-200 bg-white",
              warning: "border-amber-200 bg-white",
              info: "border-fresh-300 bg-white",
            }[insight.severity];
            const Icon = insight.severity === "info" ? Info : AlertTriangle;
            const iconColor = insight.severity === "info" ? "text-forest-700" : insight.severity === "warning" ? "text-amber-700" : "text-red-700";
            return (
              <li key={insight.id} className={`rounded-2xl border p-4 shadow-card ${styles}`}>
                <div className="flex gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-forest-900">{insight.title}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Record-based alert
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-forest-800">{insight.farmName}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{insight.detail}</p>
                    <div className="mt-3">
                      <Button variant="secondary" onClick={() => go("farms", insight.farmId)}>
                        View farm
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
