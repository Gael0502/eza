import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FarmFilter, useFarmSelection } from "../filters";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Modal,
  PageHeader,
  SampleBadge,
  SelectField,
  TableLabel,
  TextField,
} from "../components";
import { INPUT_TYPES, INPUT_UNITS, farmById, formatDate, formatNumber, seasonById, uid } from "../model";
import { useStore } from "../store";
import type { InputRecord, InputType } from "../types";

interface InputForm {
  farmId: string;
  seasonId: string;
  type: InputType;
  product: string;
  quantity: string;
  costRwf: string;
  unit: string;
  applicationDate: string;
  supplier: string;
}

const emptyForm: InputForm = {
  farmId: "",
  seasonId: "",
  type: "Seeds",
  product: "",
  quantity: "",
  costRwf: "",
  unit: "kg",
  applicationDate: "",
  supplier: "",
};

export function InputsPage() {
  const { data, saveInput, deleteInput } = useStore();
  const [farmFilter, setFarmFilter] = useFarmSelection();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<InputRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InputRecord | null>(null);
  const [form, setForm] = useState<InputForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof InputForm, string>>>({});

  const records = useMemo(() => {
    return data.inputs
      .filter((input) => farmFilter === "all" || input.farmId === farmFilter)
      .filter((input) => typeFilter === "all" || input.type === typeFilter)
      .sort((a, b) => (a.applicationDate < b.applicationDate ? 1 : -1));
  }, [data.inputs, farmFilter, typeFilter]);

  const seasonOptions = data.seasons.filter((season) => season.farmId === form.farmId);

  function openCreate() {
    setEditing(null);
    setErrors({});
    const farmId = farmFilter !== "all" ? farmFilter : data.farms[0]?.id ?? "";
    setForm({ ...emptyForm, farmId });
    setCreating(true);
  }

  function openEdit(input: InputRecord) {
    setEditing(input);
    setErrors({});
    setForm({
      farmId: input.farmId,
      seasonId: input.seasonId ?? "",
      type: input.type,
      product: input.product,
      quantity: String(input.quantity),
      costRwf: input.costRwf === undefined ? "" : String(input.costRwf),
      unit: input.unit,
      applicationDate: input.applicationDate,
      supplier: input.supplier,
    });
    setCreating(true);
  }

  function submit() {
    const nextErrors: Partial<Record<keyof InputForm, string>> = {};
    const quantity = Number(form.quantity);
    const cost = form.costRwf.trim() ? Number(form.costRwf) : undefined;
    if (!form.farmId) nextErrors.farmId = "Choose a farm.";
    if (!form.product.trim()) nextErrors.product = "Enter the product name.";
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.quantity = "Enter a quantity greater than zero.";
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
      nextErrors.costRwf = "Enter a non-negative cost in RWF.";
    }
    if (!form.applicationDate) nextErrors.applicationDate = "Enter the application date.";
    if (!form.supplier.trim()) nextErrors.supplier = "Enter the supplier.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    saveInput({
      id: editing?.id ?? uid(),
      farmId: form.farmId,
      seasonId: form.seasonId || null,
      type: form.type,
      product: form.product.trim(),
      quantity,
      costRwf: cost,
      unit: form.unit,
      applicationDate: form.applicationDate,
      supplier: form.supplier.trim(),
      sample: editing?.sample ?? false,
    });
    setCreating(false);
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Inputs"
        description="Record seeds, fertilizer, and crop protection products, including quantity, application date, and supplier."
        action={
          <Button onClick={openCreate} disabled={data.farms.length === 0}>
            <Plus className="h-4 w-4" />
            Record input
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <FarmFilter value={farmFilter} onChange={setFarmFilter} />
        <label className="block min-w-[180px]">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            {INPUT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>

      {data.farms.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="Register a farm first"
          body="Inputs are stored against a farm so each cooperative can see what was applied where."
        />
      ) : data.inputs.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="No inputs recorded"
          body="Add seeds, fertilizer, or a crop protection product to start an input history."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Record input
            </Button>
          }
        />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title="No inputs match these filters"
          body="Choose another farm or input type to see the history."
        />
      ) : (
        <DataTable className="min-w-[860px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Farm</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((input) => {
                  const farm = farmById(data, input.farmId);
                  const season = seasonById(data, input.seasonId);
                  return (
                    <tr key={input.id}>
                      <td className="px-4 py-3"><TableLabel>{formatDate(input.applicationDate)}</TableLabel></td>
                      <td className="px-4 py-3">
                        <div><TableLabel className="eza-table-label--strong">{farm?.name ?? "Unknown farm"}</TableLabel></div>
                        <div className="mt-1"><TableLabel>{season ? season.name : "Not linked to a season"}</TableLabel></div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <TableLabel className="eza-table-label--strong">{input.type}</TableLabel>
                          {input.sample ? <SampleBadge /> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3"><TableLabel>{input.product}</TableLabel></td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        <TableLabel>{formatNumber(input.quantity, Number.isInteger(input.quantity) ? 0 : 1)} {input.unit}</TableLabel>
                      </td>
                      <td className="px-4 py-3"><TableLabel>{input.supplier || "—"}</TableLabel></td>
                      <td className="px-4 py-3">
                        <div className="flex w-max items-center gap-2">
                          <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => openEdit(input)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="danger" className="min-h-9 px-3 text-xs" onClick={() => setPendingDelete(input)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
        </DataTable>
      )}

      <Modal
        open={creating}
        title={editing ? "Edit input" : "Record an input"}
        subtitle="Link the product to a farm and, if useful, to a growing season."
        onClose={() => setCreating(false)}
      >
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
            onChange={(event) => setForm({ ...form, farmId: event.target.value, seasonId: "" })}
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
          <SelectField
            label="Input type"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as InputType })}
          >
            {INPUT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </SelectField>
          <TextField
            label="Product"
            value={form.product}
            error={errors.product}
            onChange={(event) => setForm({ ...form, product: event.target.value })}
            placeholder="NPK 17-17-17"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Quantity"
              type="number"
              min="0"
              step="0.1"
              value={form.quantity}
              error={errors.quantity}
              onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            />
            <SelectField label="Unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
              {INPUT_UNITS.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
              {form.unit && !INPUT_UNITS.includes(form.unit as (typeof INPUT_UNITS)[number]) ? (
                <option>{form.unit}</option>
              ) : null}
            </SelectField>
          </div>
          <TextField
            label="Application date"
            type="date"
            value={form.applicationDate}
            error={errors.applicationDate}
            onChange={(event) => setForm({ ...form, applicationDate: event.target.value })}
          />
          <TextField
            label="Supplier"
            value={form.supplier}
            error={errors.supplier}
            onChange={(event) => setForm({ ...form, supplier: event.target.value })}
            placeholder="Cooperative store or agro-dealer"
          />
          <TextField
            label="Total input cost (RWF, optional)"
            type="number"
            min="0"
            step="1"
            value={form.costRwf}
            error={errors.costRwf}
            onChange={(event) => setForm({ ...form, costRwf: event.target.value })}
            placeholder="Add a farmer-recorded cost"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Save input"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this input?"
        body="The product record will be removed from this farm's input history."
        confirmLabel="Delete input"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteInput(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
