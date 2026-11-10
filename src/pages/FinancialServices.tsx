import { Building2, ChartNoAxesCombined, Info, Landmark, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, SelectField } from "../components";
import { EMPTY_FINANCIAL_DATA } from "../finance-model";
import { useStore } from "../store";
import type { FinancialRole } from "../types";
import { CompetitiveIntelligence } from "./financial/CompetitiveIntelligence";
import { FinanceDashboard } from "./financial/FinanceDashboard";
import { MarketAccess } from "./financial/MarketAccess";

type Section = "finance" | "market" | "intelligence" | "institution";

const ROLE_LABELS: Record<FinancialRole, string> = {
  farmer: "Farmer",
  institution: "Financial institution",
  buyer: "Bulk buyer",
  admin: "Administrator",
};

const SECTION_LABELS: Record<Section, string> = {
  finance: "Access to finance",
  market: "Pre-bulk market",
  intelligence: "Competitive intelligence",
  institution: "Institution portal",
};

export function FinancialServicesPage({
  initialSection = "finance",
}: {
  initialSection?: Section;
}) {
  const { data, setFinancialRole, setSelectedFarmId } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const [section, setSection] = useState<Section>(initialSection);
  useEffect(() => setSection(initialSection), [initialSection]);
  const sections: Section[] =
    financial.role === "institution"
      ? ["institution"]
      : financial.role === "buyer"
        ? ["market", "intelligence"]
        : financial.role === "admin"
          ? ["finance", "market", "institution", "intelligence"]
          : ["finance", "market", "intelligence"];
  const activeSection = sections.includes(section) ? section : sections[0];

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-forest-800 bg-forest-900 px-5 py-5 text-white shadow-card sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-fresh-300">Financial services</p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
            {activeSection === "market" ? "Pre-bulk marketplace" : activeSection === "finance" ? "Access to finance" : SECTION_LABELS[activeSection]}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            Use farm records to prepare for finance and connect expected produce with buyers.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <SelectField
            label="Viewing as"
            value={financial.role}
            onChange={(event) => setFinancialRole(event.target.value as FinancialRole)}
          >
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-border bg-white px-3.5 py-3 text-xs leading-5 text-slate-600 shadow-sm">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
        <p>
          Role selection changes this device's view; it does not sign users in. Applications,
          listings, and offers are saved locally and are not delivered to institutions or buyers.
          Farmers choose when to include a report with an application or publish listing details.
        </p>
      </div>

      {financial.role === "farmer" || financial.role === "admin" ? (
        <div className="mb-4 max-w-sm">
          <SelectField
            label="Farm profile"
            value={financial.selectedFarmId}
            onChange={(event) => setSelectedFarmId(event.target.value)}
          >
            {data.farms.length === 0 ? <option value="">No farms registered</option> : null}
            {data.farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} · {farm.location}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      <nav
        className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-3 shadow-sm"
        aria-label="Financial services sections"
      >
        {sections.map((item) => {
          const Icon =
            item === "finance"
              ? Landmark
              : item === "market"
                ? ShoppingBasket
                : item === "institution"
                  ? Building2
                  : ChartNoAxesCombined;
          return (
            <Button
              key={item}
              variant={activeSection === item ? "primary" : "secondary"}
              onClick={() => setSection(item)}
              aria-current={activeSection === item ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              {SECTION_LABELS[item]}
            </Button>
          );
        })}
      </nav>

      {activeSection === "finance" ? (
        <FinanceDashboard role={financial.role} />
      ) : activeSection === "market" ? (
        <MarketAccess role={financial.role} />
      ) : activeSection === "institution" ? (
        <FinanceDashboard role="institution" />
      ) : (
        <CompetitiveIntelligence role={financial.role} />
      )}

      {financial.role === "admin" ? (
        <Card className="mt-5 border-forest-200 bg-fresh-50">
          <h2 className="font-semibold text-forest-900">Administrator overview</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            The administrator view includes records saved on this device. Institution and buyer
            views show only application reports and listings available in this workspace.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
