import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api";

type Bike = {
	id: string;
	serial_number: string;
	make?: string;
	model?: string;
	status?: string;
};
type Battery = {
	id: string;
	serial_number: string;
	charge_level?: number;
	status?: string;
};

export function AdminDashboard() {
	const queryClient = useQueryClient();

	// Create bike form state
	const [serialNumber, setSerialNumber] = React.useState("");
	const [make, setMake] = React.useState("");
	const [model, setModel] = React.useState("");
	const [status, setStatus] = React.useState("available");
	const [mileage, setMileage] = React.useState<number | "">("");

	// Fetch available bike statuses from API
	const statusesQuery = useQuery<string[]>({
		queryKey: ["bike-statuses"],
		queryFn: async () => {
			const resp = await api.get("/fleet/bike-statuses");
			return resp.data as string[];
		},
	});

	// Ensure selected status is valid when statuses load
	React.useEffect(() => {
		const statuses = statusesQuery.data;
		if (!statuses || statuses.length === 0) return;
		if (!statuses.includes(status)) {
			setStatus(statuses[0]);
		}
	}, [statusesQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

	const bikesQuery = useQuery<Bike[]>({
		queryKey: ["bikes"],
		queryFn: async () => {
			const resp = await api.get("/fleet/bikes");
			return resp.data as Bike[];
		},
	});

	const batteriesQuery = useQuery<Battery[]>({
		queryKey: ["batteries"],
		queryFn: async () => {
			const resp = await api.get("/fleet/batteries");
			return resp.data as Battery[];
		},
	});

	const createBikeMutation = useMutation({
		mutationFn: async () => {
			const payload: any = {
				serial_number: serialNumber.trim(),
				make: make.trim() || undefined,
				model: model.trim() || undefined,
				status: status || undefined,
			};
			if (mileage !== "" && typeof mileage === "number") {
				payload.mileage = mileage;
			}
			const resp = await api.post("/fleet/bikes", payload);
			return resp.data as Bike;
		},
		onSuccess: () => {
			setSerialNumber("");
			setMake("");
			setModel("");
			setStatus("available");
			setMileage("");
			queryClient.invalidateQueries({ queryKey: ["bikes"] });
		},
	});

	const isLoading = bikesQuery.isLoading || batteriesQuery.isLoading;
	const isError = bikesQuery.isError || batteriesQuery.isError;

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Admin dashboard</h2>
			{isLoading ? (
				<p className="text-sm text-gray-600">Loading data…</p>
			) : isError ? (
				<p className="text-sm text-red-600">Failed to load data.</p>
			) : (
				<>
					<section>
						<h3 className="font-semibold mb-2">Bikes ({bikesQuery.data?.length ?? 0})</h3>
						<div className="border rounded-md p-3 mb-3">
							<h4 className="font-medium mb-2 text-sm">Create Bike</h4>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (!serialNumber.trim()) {
										return;
									}
									createBikeMutation.mutate();
								}}
								className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
							>
								<label className="flex flex-col gap-1 md:col-span-2">
									<span className="text-xs text-gray-600">Serial number</span>
									<input
										type="text"
										value={serialNumber}
										onChange={(e) => setSerialNumber(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm"
										placeholder="SN-12345"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Make</span>
									<input
										type="text"
										value={make}
										onChange={(e) => setMake(e.target.value)}
										className="border rounded px-2 py-1 text-sm"
										placeholder="Brand"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Model</span>
									<input
										type="text"
										value={model}
										onChange={(e) => setModel(e.target.value)}
										className="border rounded px-2 py-1 text-sm"
										placeholder="Model"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Status</span>
									<select
										value={status}
										onChange={(e) => setStatus(e.target.value)}
										disabled={statusesQuery.isLoading || statusesQuery.isError}
										className="border rounded px-2 py-1 text-sm bg-white disabled:bg-gray-100"
									>
										{(statusesQuery.data ?? []).map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}
									</select>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Mileage</span>
									<input
										type="number"
										min={0}
										value={mileage}
										onChange={(e) => {
											const v = e.target.value;
											if (v === "") setMileage("");
											else setMileage(Number(v));
										}}
										className="border rounded px-2 py-1 text-sm"
										placeholder="0"
									/>
								</label>
								<div className="md:col-span-1">
									<button
										type="submit"
										disabled={createBikeMutation.isPending}
										className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded w-full"
									>
										{createBikeMutation.isPending ? "Creating…" : "Create"}
									</button>
								</div>
								{createBikeMutation.isError ? (
									<div className="md:col-span-6 text-xs text-red-600">
										Failed to create bike.
									</div>
								) : null}
								{createBikeMutation.isSuccess ? (
									<div className="md:col-span-6 text-xs text-green-700">
										Bike created.
									</div>
								) : null}
							</form>
						</div>
						<div className="border rounded-md divide-y">
							{(bikesQuery.data ?? []).map((b) => (
								<div key={b.id} className="px-3 py-2 text-sm flex items-center gap-3">
									<span className="font-mono text-xs text-gray-500">{b.id}</span>
									<span className="font-medium">{b.serial_number}</span>
									{b.status ? <span className="text-gray-600">({b.status})</span> : null}
								</div>
							))}
							{(bikesQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No bikes.</div>
							) : null}
						</div>
					</section>

					<section>
						<h3 className="font-semibold mb-2">Batteries ({batteriesQuery.data?.length ?? 0})</h3>
						<div className="border rounded-md divide-y">
							{(batteriesQuery.data ?? []).map((b) => (
								<div key={b.id} className="px-3 py-2 text-sm flex items-center gap-3">
									<span className="font-mono text-xs text-gray-500">{b.id}</span>
									<span className="font-medium">{b.serial_number}</span>
									{typeof b.charge_level === "number" ? (
										<span className="text-gray-600">{b.charge_level}%</span>
									) : null}
								</div>
							))}
							{(batteriesQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No batteries.</div>
							) : null}
						</div>
					</section>
				</>
			)}
		</div>
	);
}


