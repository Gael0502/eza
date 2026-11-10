import { Download, FileText, Landmark, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  SampleBadge,
  TextField,
} from "../../components";
import {
  buildFarmerReport,
  EMPTY_FINANCIAL_DATA,
  estimatedListingRevenue,
  FINANCING_OPPORTUNITIES,
  financingReadiness,
  knownInputExpenditure,
  newFinanceApplication,
  selectedFarm,
  statusLabel,
} from "../../finance-model";
import { formatDate, formatNumber } from "../../model";
import { useStore } from "../../store";
import type { FinanceApplication, FinanceApplicationStatus, FinancialRole } from "../../types";

const APPLICATION_STATUSES: FinanceApplicationStatus[] = [
  "submitted",
  "under_review",
  "needs_information",
  "approved_demo",
  "declined_demo",
];

function downloadReport(report: string, farmName: string) {
  const file = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${farmName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-eza-performance-report.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function FinanceDashboard({ role }: { role: FinancialRole }) {
  const {
    data,
    updateFinanceApplicationStatus,
  } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const farm = selectedFarm(data);

  if (role === "institution") {
    const applications = financial.applications.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return (
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-forest-900">Financial institution portal</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Applications saved on this device appear here. Only reports expressly included by a
            farmer are visible; applications and status updates are not sent to an external lender.
          </p>
        </div>
        {applications.length === 0 ? (
          <EmptyState
            icon={<Landmark className="h-5 w-5" />}
            title="No applications yet"
            body="Applications saved on this device will appear here. Farm records remain private unless a farmer chooses to include a report."
          />
        ) : (
          <div className="space-y-4">
            {applications.map((application) => {
              const opportunity = FINANCING_OPPORTUNITIES.find(
                (item) => item.id === application.opportunityId,
              );
              return (
                <Card key={application.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-forest-900">
                          {opportunity?.type ?? "Financing application"}
                        </h3>
                        {application.sample ? <SampleBadge /> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Recorded {formatDate(application.submittedAt)} ·{" "}
                        {formatNumber(application.requestedAmountRwf)} RWF requested
                      </p>
                      {application.reportShared && application.sharedReport ? (
                        <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-forest-700">
                          <ShieldCheck className="h-4 w-4" />
                          Farmer-authorized report included
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          Applicant report not shared · farm records are not visible
                        </p>
                      )}
                    </div>
                    <label className="block min-w-48">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Workspace status
                      </span>
                      <select
                        value={application.status}
                        onChange={(event) =>
                          updateFinanceApplicationStatus(
                            application.id,
                            event.target.value as FinanceApplicationStatus,
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {application.reportShared && application.sharedReport ? (
                    <details className="mt-4 rounded-xl border border-slate-200 bg-mist p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-forest-800">
                        Review shared report
                      </summary>
                      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-700">
                        {application.sharedReport}
                      </pre>
                    </details>
                  ) : null}
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Status changes are saved on this device and do not represent a lender decision or loan approval.
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!farm) {
    return (
      <EmptyState
        icon={<Landmark className="h-5 w-5" />}
        title="Register a farm to build a financial profile"
        body="Farm details, production, inputs, and harvest history will be combined here after you add a farm."
      />
    );
  }

  return <FarmerProfile role={role} farmId={farm.id} />;
}

function FarmerProfile({ role, farmId }: { role: FinancialRole; farmId: string }) {
  const { data, saveFinanceApplication, setFarmerProfile } = useStore();
  const financial = data.financial ?? EMPTY_FINANCIAL_DATA;
  const farm = data.farms.find((item) => item.id === farmId);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [shareReport, setShareReport] = useState(false);
  const [error, setError] = useState("");
  const selectedOpportunity = FINANCING_OPPORTUNITIES.find((item) => item.id === opportunityId);
  const readiness = farm ? financingReadiness(data, farm) : null;
  const farmInputs = data.inputs.filter((item) => item.farmId === farmId);
  const farmHarvests = data.harvests
    .filter((item) => item.farmId === farmId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const farmSeasons = data.seasons
    .filter((item) => item.farmId === farmId)
    .sort((a, b) => b.plantingDate.localeCompare(a.plantingDate));
  const applications = financial.applications
    .filter((item) => role === "admin" || item.farmId === farmId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const knownCosts = farmInputs.filter((item) => item.costRwf !== undefined).length;
  const report = useMemo(() => (farm ? buildFarmerReport(data, farm) : ""), [data, farm]);

  if (!farm || !readiness) return null;

  function startApplication(id: string) {
    setOpportunityId(id);
    setAmount("");
    setShareReport(false);
    setError("");
  }

  function submitApplication() {
    if (!selectedOpportunity || !farm) return;
    const requestedAmountRwf = Number(amount);
    if (
      !Number.isFinite(requestedAmountRwf) ||
      requestedAmountRwf < selectedOpportunity.minimumRwf ||
      requestedAmountRwf > selectedOpportunity.maximumRwf
    ) {
      setError(
        `Enter an amount between ${formatNumber(selectedOpportunity.minimumRwf)} and ${formatNumber(selectedOpportunity.maximumRwf)} RWF.`,
      );
      return;
    }
    saveFinanceApplication(
      newFinanceApplication(
        farm.id,
        selectedOpportunity.id,
        requestedAmountRwf,
        shareReport,
        shareReport ? report : undefined,
      ),
    );
    setOpportunityId(null);
  }

  function changeSharing(application: FinanceApplication, shared: boolean) {
    saveFinanceApplication({
      ...application,
      reportShared: shared,
      sharedReport: shared ? report : undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-forest-900">Access to finance</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Prepare a transparent farm performance summary and review indicative financing options.
          EZA does not guarantee loans or make credit decisions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Registered farm profiles" value={formatNumber(data.farms.length)} hint="Based on saved farm records" />
        <Metric label="Known input expenditure" value={`${formatNumber(knownInputExpenditure(data, farmId))} RWF`} hint={`${knownCosts} of ${farmInputs.length} input costs recorded`} />
        <Metric label="Recorded harvests" value={formatNumber(farmHarvests.length)} hint={`${formatNumber(farmHarvests.reduce((sum, item) => sum + item.quantityKg, 0))} kg in this profile`} />
        <Metric label="Estimated listed revenue" value={`${formatNumber(estimatedListingRevenue(financial, farmId))} RWF`} hint="At farmer-proposed prices; not guaranteed" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-forest-900">Farmer financial profile</h3>
            <p className="mt-1 text-sm text-slate-600">
              {farm.name} · {farm.location} · {formatNumber(farm.sizeHa, 1)} ha · {farm.crop}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Contact details are farmer-provided and saved on this device. Input expenditure
              includes only entered costs; unpriced inputs are not estimated.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => downloadReport(report, farm.name)}
            disabled={!report}
          >
            <Download className="h-4 w-4" />
            Download performance report
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ProfileStat label="Growing seasons" value={farmSeasons.length} />
          <ProfileStat label="Input records" value={farmInputs.length} />
          <ProfileStat label="Observation records" value={data.observations.filter((item) => item.farmId === farmId).length} />
        </div>
      </Card>

      <FarmerContactForm
        initialName={financial.farmerName ?? ""}
        initialContact={financial.farmerContact ?? ""}
        onSave={setFarmerProfile}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-forest-900">Financing preparation</h3>
              <span className="rounded-full bg-fresh-100 px-2.5 py-1 text-xs font-semibold text-forest-800">
                {readiness.percent}% records complete
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              A transparent checklist of available records, not a credit score or eligibility decision.
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 sm:max-w-52">
            <div className="h-full rounded-full bg-forest-700" style={{ width: `${readiness.percent}%` }} />
          </div>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {readiness.checks.map((check) => (
            <li
              key={check.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                check.complete ? "bg-fresh-50 text-forest-800" : "bg-amber-50 text-amber-950"
              }`}
            >
              <span aria-hidden="true">{check.complete ? "✓" : "○"}</span>
              {check.label}
              {!check.complete ? <span className="ml-auto text-xs">Missing</span> : null}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-forest-900">Production history</h3>
          {farmHarvests.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No harvests have been recorded for this farm.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {farmHarvests.map((harvest) => (
                <li key={harvest.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-700">
                    {harvest.crop} · {formatDate(harvest.date)}
                    {harvest.sample ? <span className="ml-2"><SampleBadge /></span> : null}
                  </span>
                  <span className="font-medium text-forest-900">{formatNumber(harvest.quantityKg)} kg</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-forest-900">Financial records</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Known input expenditure: <strong>{formatNumber(knownInputExpenditure(data, farmId))} RWF</strong>.
            {knownCosts < farmInputs.length
              ? ` ${farmInputs.length - knownCosts} input record(s) have no cost entered.`
              : " All input records have a recorded cost."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Expected sales estimate: <strong>{formatNumber(estimatedListingRevenue(financial, farmId))} RWF</strong>.
            {" "}Calculated only from open expected-produce listings at the farmer's proposed prices.
          </p>
          {farmInputs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Input purchases have not been recorded.</p>
          ) : null}
        </Card>
      </div>

      <section>
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-forest-900">Financing opportunities</h3>
          <p className="mt-1 text-sm text-slate-600">
            Illustrative financing types and ranges for planning. These are not provider offers;
            confirm current terms and eligibility directly with a financial institution.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {FINANCING_OPPORTUNITIES.map((opportunity) => (
            <Card key={opportunity.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-forest-900">{opportunity.type}</h4>
                <SampleBadge />
              </div>
              <p className="mt-1 text-sm text-slate-600">{opportunity.institution}</p>
              <p className="mt-3 text-sm font-medium text-forest-800">
                {formatNumber(opportunity.minimumRwf)}–{formatNumber(opportunity.maximumRwf)} RWF
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Example requirements
              </p>
              <ul className="mt-1 flex-1 space-y-1 text-sm text-slate-600">
                {opportunity.requirements.map((requirement) => (
                  <li key={requirement}>· {requirement}</li>
                ))}
              </ul>
              {role === "farmer" ? (
                <Button className="mt-4" onClick={() => startApplication(opportunity.id)}>
                  <Landmark className="h-4 w-4" />
                  Prepare application
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <h3 className="font-semibold text-forest-900">
          {role === "admin" ? "Local financing applications" : "Your applications"}
        </h3>
        {applications.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Applications saved on this device will appear here. Contact the institution directly to apply.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {applications.map((application) => {
              const opportunity = FINANCING_OPPORTUNITIES.find(
                (item) => item.id === application.opportunityId,
              );
              return (
                <li key={application.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-forest-900">
                        {opportunity?.type ?? "Financing opportunity"}
                      </span>
                      {application.sample ? <SampleBadge /> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatNumber(application.requestedAmountRwf)} RWF · Saved{" "}
                      {formatDate(application.submittedAt)} · {statusLabel(application.status)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {application.reportShared ? "Report included with application" : "Report not included"}
                    </p>
                  </div>
                  {role === "farmer" ? (
                    <Button
                      variant="secondary"
                      onClick={() => changeSharing(application, !application.reportShared)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {application.reportShared ? "Remove included report" : "Include current report"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(selectedOpportunity)}
        title="Prepare financing application"
        subtitle={selectedOpportunity?.institution}
        onClose={() => setOpportunityId(null)}
      >
        {selectedOpportunity ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitApplication();
            }}
          >
            <TextField
              label={`Requested amount (RWF) · ${formatNumber(selectedOpportunity.minimumRwf)}–${formatNumber(selectedOpportunity.maximumRwf)}`}
              type="number"
              min={selectedOpportunity.minimumRwf}
              max={selectedOpportunity.maximumRwf}
              step="1000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter an amount"
            />
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm leading-5 text-slate-700">
              <input
                type="checkbox"
                checked={shareReport}
                onChange={(event) => setShareReport(event.target.checked)}
                className="mt-1 accent-forest-700"
              />
              <span>
                I authorize including the current farm performance report with this application.
                I can remove it later.
              </span>
            </label>
            <p className="text-xs leading-5 text-slate-500">
              {shareReport
                ? "The report will be saved with this application on this device; it will not be sent automatically."
                : "No farm report will be included unless you select this option."}
            </p>
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpportunityId(null)}>
                Cancel
              </Button>
              <Button type="submit">
                <FileText className="h-4 w-4" />
                Save application
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-forest-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </Card>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-mist px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-forest-900">{formatNumber(value)}</p>
    </div>
  );
}

function FarmerContactForm({
  initialName,
  initialContact,
  onSave,
}: {
  initialName: string;
  initialContact: string;
  onSave: (name: string, contact: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [contact, setContact] = useState(initialContact);
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <h3 className="font-semibold text-forest-900">Farmer information</h3>
      <p className="mt-1 text-sm text-slate-600">
        Your contact details are saved on this device and included in your report. The report is not sent externally.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <TextField label="Farmer or contact person" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} placeholder="Name" />
        <TextField label="Phone or contact details" value={contact} onChange={(event) => { setContact(event.target.value); setSaved(false); }} placeholder="Optional local contact" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => { onSave(name.trim(), contact.trim()); setSaved(true); }}>
          Save farmer information
        </Button>
        {saved ? <span role="status" className="text-sm text-forest-700">Saved on this device.</span> : null}
      </div>
    </Card>
  );
}
