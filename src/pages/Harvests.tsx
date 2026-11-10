import { ChartNoAxesCombined, ClipboardList, Pencil, Plus, Trash2, Wheat } from "lucide-react";
import { useMemo, useState } from "react";
import { FarmFilter, useFarmSelection } from "../filters";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  SampleBadge,
  SelectField,
  TextField,
} from "../components";
import { CROPS, cropPerformance, farmById, formatDate, formatNumber, seasonById, totalHarvestKg, uid, yieldKgHa } from "../model";
import { useStore } from "../store";
import type { Harvest } from "../types";

interface HarvestForm {
  farmId: string;
  seasonId: string;
  date: string;
  crop: string;
  quantityKg: string;
}

export function HarvestsPage() {
  const { data, saveHarvest, deleteHarvest } = useStore();
  const [farmFilter, setFarmFilter] = useFarmSelection();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Harvest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Harvest | null>(null);
  const [form, setForm] = useState<HarvestForm>({
    farmId: "",
    seasonId: "",
    date: "",
    crop: "Maize",
    quantityKg: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof HarvestForm, string>>>({});

  const records = useMemo(() => {
    return data.harvests
      .filter((harvest) => farmFilter === "all" || harvest.farmId === farmFilter)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data.harvests, farmFilter]);

  const visibleData = useMemo(
    () => ({
      ...data,
      harvests: records,
    }),
    [data, records],
  );
  const performance = cropPerformance(visibleData);
  const seasonOptions = data.seasons.filter((season) => season.farmId === form.farmId);

  function openCreate() {
    setEditing(null);
    setErrors({});
    const farmId = farmFilter !== "all" ? farmFilter : data.farms[0]?.id ?? "";
    const farm = data.farms.find((item) => item.id === farmId);
    setForm({
      farmId,
      seasonId: "",
      date: "",
      crop: farm?.crop ?? "Maize",
      quantityKg: "",
    });
    setCreating(true);
  }

  function openEdit(harvest: Harvest) {
    setEditing(harvest);
    setErrors({});
    setForm({
      farmId: harvest.farmId,
      seasonId: harvest.seasonId ?? "",
      date: harvest.date,
      crop: harvest.crop,
      quantityKg: String(harvest.quantityKg),
    });
    setCreating(true);
  }

  function submit() {
    const nextErrors: Partial<Record<keyof HarvestForm, string>> = {};
    const quantity = Number(form.quantityKg);
    if (!form.farmId) nextErrors.farmId = "Choose a farm.";
    if (!form.date) nextErrors.date = "Enter the harvest date.";
    if (!form.crop) nextErrors.crop = "Choose a crop.";
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.quantityKg = "Enter a quantity greater than zero.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    saveHarvest({
      id: editing?.id ?? uid(),
      farmId: form.farmId,
      seasonId: form.seasonId || null,
      date: form.date,
      crop: form.crop,
      quantityKg: quantity,
      sample: editing?.sample ?? false,
    });
    setCreating(false);
    setEditing(null);
  }

  const yields = records
    .map((harvest) => yieldKgHa(data, harvest))
    .filter((value): value is number => value !== null);
  const averageYield = yields.length ? yields.reduce((sum, value) => sum + value, 0) / yields.length : 0;

  return (
    <div>
      <PageHeader
        title="Harvests"
        description="Record the harvest date, crop, and quantity. Totals update the performance view for each crop."
        action={
          <Button onClick={openCreate} disabled={data.farms.length === 0}>
            <Plus className="h-4 w-4" />
            Record harvest
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="!border-forest-800 !bg-forest-900 !p-5 text-white shadow-lg shadow-forest-950/15 sm:!p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">Total quantity</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{formatNumber(farmFilter === "all" ? totalHarvestKg(data) : records.reduce((sum, harvest) => sum + harvest.quantityKg, 0))}<span className="ml-1.5 text-base font-medium text-fresh-300">kg</span></p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-fresh-300 ring-1 ring-inset ring-white/10"><Wheat className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="!border-forest-800 !bg-forest-900 !p-5 text-white shadow-lg shadow-forest-950/15 sm:!p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">Harvest records</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{formatNumber(records.length)}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-fresh-300 ring-1 ring-inset ring-white/10"><ClipboardList className="h-5 w-5" /></span>
          </div>
        </Card>
        <Card className="!border-forest-800 !bg-forest-900 !p-5 text-white shadow-lg shadow-forest-950/15 sm:!p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">Average recorded yield</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{yields.length ? formatNumber(averageYield) : "—"}{yields.length ? <span className="ml-1.5 text-base font-medium text-fresh-300">kg/ha</span> : null}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-fresh-300 ring-1 ring-inset ring-white/10"><ChartNoAxesCombined className="h-5 w-5" /></span>
          </div>
        </Card>
      </div>

      {performance.length > 0 ? (
        <Card className="mb-5 !bg-white !p-5 shadow-lg shadow-forest-950/[0.07] sm:!p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fresh-50 text-forest-700"><Wheat className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-forest-950">Performance by crop</h2>
              <p className="mt-0.5 text-xs text-slate-500">Total harvest recorded for each crop</p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {performance.map((crop) => (
              <li key={crop.crop} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 transition hover:border-fresh-300 hover:bg-fresh-50/60">
                <span className="text-sm font-semibold text-forest-900">{crop.crop}</span>
                <span className="text-base font-semibold tabular-nums text-forest-900">{formatNumber(crop.quantityKg)} <span className="text-xs font-medium text-slate-500">kg</span></span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-4">
        <FarmFilter value={farmFilter} onChange={setFarmFilter} />
      </div>

      {data.farms.length === 0 ? (
        <EmptyState
          icon={<Wheat className="h-5 w-5" />}
          title="Register a farm first"
          body="Harvest records are linked to a farm so quantity can be compared with the area under crop."
        />
      ) : data.harvests.length === 0 ? (
        <EmptyState
          icon={<Wheat className="h-5 w-5" />}
          title="No harvests recorded"
          body="Add a harvest date, crop, and quantity to start the performance record."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Record harvest
            </Button>
          }
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Wheat className="h-5 w-5" />}
          title="No harvests for this farm"
          body="Choose another farm, or record a harvest for the one selected."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-forest-950/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-forest-900 text-[10px] uppercase tracking-[0.14em] text-white/75">
                <tr>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Farm</th>
                  <th className="px-5 py-4 font-semibold">Crop</th>
                  <th className="px-5 py-4 text-right font-semibold">Quantity</th>
                  <th className="px-5 py-4 text-right font-semibold">Yield</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((harvest, index) => {
                  const farm = farmById(data, harvest.farmId);
                  const season = seasonById(data, harvest.seasonId);
                  const perHa = yieldKgHa(data, harvest);
                  return (
                    <tr key={harvest.id} className={`group transition-colors hover:bg-fresh-50/70 ${index % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                      <td className="whitespace-nowrap px-5 py-4 text-[13px] font-medium tabular-nums text-slate-600">{formatDate(harvest.date)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-forest-950">
                          <span>{farm?.name ?? "Unknown farm"}</span>
                          {harvest.sample ? <SampleBadge /> : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{season ? season.name : "Not linked to a season"}</div>
                      </td>
                      <td className="px-5 py-4"><span className="inline-flex rounded-full bg-fresh-50 px-3 py-1 text-xs font-semibold text-forest-800">{harvest.crop}</span></td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-[13px] font-semibold tabular-nums text-forest-950">{formatNumber(harvest.quantityKg)} kg</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-[13px] font-medium tabular-nums text-slate-600">{perHa === null ? "—" : `${formatNumber(perHa)} kg/ha`}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" onClick={() => openEdit(harvest)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="ghost" onClick={() => setPendingDelete(harvest)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={creating} title={editing ? "Edit harvest" : "Record a harvest"} onClose={() => setCreating(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <SelectField
            label="Farm"
            value={form.farmId}
            error={errors.farmId}
            onChange={(event) => {
              const farmId = event.target.value;
              const farm = data.farms.find((item) => item.id === farmId);
              setForm({
                ...form,
                farmId,
                seasonId: "",
                crop: editing ? form.crop : farm?.crop ?? form.crop,
              });
            }}
          >
            <option value="">Select a farm</option>
            {data.farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Season"
            value={form.seasonId}
            onChange={(event) => setForm({ ...form, seasonId: event.target.value })}
          >
            <option value="">Not linked to a season</option>
            {seasonOptions.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Harvest date"
            type="date"
            value={form.date}
            error={errors.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <SelectField label="Crop" value={form.crop} error={errors.crop} onChange={(event) => setForm({ ...form, crop: event.target.value })}>
            {CROPS.map((crop) => (
              <option key={crop}>{crop}</option>
            ))}
            {form.crop && !CROPS.includes(form.crop as (typeof CROPS)[number]) ? <option>{form.crop}</option> : null}
          </SelectField>
          <TextField
            label="Quantity (kg)"
            type="number"
            min="0"
            step="1"
            value={form.quantityKg}
            error={errors.quantityKg}
            onChange={(event) => setForm({ ...form, quantityKg: event.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Save harvest"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this harvest?"
        body="The quantity will be removed from harvest performance totals."
        confirmLabel="Delete harvest"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteHarvest(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
