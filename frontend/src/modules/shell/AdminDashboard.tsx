import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api";

type Bike = {
	id: string;
	serial_number: string;
	make?: string;
	model?: string;
	status?: string;
	mileage?: number;
	assigned_profile_id?: string | null;
};
type Battery = {
	id: string;
	serial_number: string;
	capacity_wh?: number;
	charge_level?: number;
	status?: string;
	assigned_bike_id?: string | null;
};
type DriverProfile = {
	id: string;
	user_id: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	address_line?: string;
	role: "admin" | "driver";
};

export function AdminDashboard() {
	const queryClient = useQueryClient();

	// Create bike form state
	const [serialNumber, setSerialNumber] = React.useState("");
	const [make, setMake] = React.useState("");
	const [model, setModel] = React.useState("");
	const [status, setStatus] = React.useState("available");
	const [mileage, setMileage] = React.useState<number | "">("");

	// Create battery form state
	const [batterySerialNumber, setBatterySerialNumber] = React.useState("");
	const [batteryCapacityWh, setBatteryCapacityWh] = React.useState<number | "">("");
	const [batteryChargeLevel, setBatteryChargeLevel] = React.useState<number | "">("");

	// Manage battery inline edit state
	const [editingBatteryId, setEditingBatteryId] = React.useState<string | null>(null);
	const [editCapacityWh, setEditCapacityWh] = React.useState<number | "">("");
	const [editChargeLevel, setEditChargeLevel] = React.useState<number | "">("");
	const [editAssignedBikeId, setEditAssignedBikeId] = React.useState<string | "">("");

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

	const driversQuery = useQuery<DriverProfile[]>({
		queryKey: ["drivers"],
		queryFn: async () => {
			const resp = await api.get("/fleet/drivers");
			return resp.data as DriverProfile[];
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

	const createBatteryMutation = useMutation({
		mutationFn: async () => {
			const payload: any = {
				serial_number: batterySerialNumber.trim(),
			};
			if (batteryCapacityWh !== "" && typeof batteryCapacityWh === "number") {
				payload.capacity_wh = batteryCapacityWh;
			}
			if (batteryChargeLevel !== "" && typeof batteryChargeLevel === "number") {
				payload.charge_level = batteryChargeLevel;
			}
			const resp = await api.post("/fleet/batteries", payload);
			return resp.data as Battery;
		},
		onSuccess: () => {
			setBatterySerialNumber("");
			setBatteryCapacityWh("");
			setBatteryChargeLevel("");
			queryClient.invalidateQueries({ queryKey: ["batteries"] });
		},
	});

	const manageBatteryMutation = useMutation({
		mutationFn: async (args: {
			battery: Battery;
			capacityWh: number | "";
			chargeLevel: number | "";
			assignedBikeId: string | "";
		}) => {
			const { battery, capacityWh, chargeLevel, assignedBikeId } = args;
			// 1) Update battery fields if provided
			const updatePayload: any = {};
			if (capacityWh !== "" && capacityWh !== battery.capacity_wh) {
				updatePayload.capacity_wh = capacityWh;
			}
			if (chargeLevel !== "" && chargeLevel !== battery.charge_level) {
				updatePayload.charge_level = chargeLevel;
			}
			if (Object.keys(updatePayload).length > 0) {
				await api.put(`/fleet/batteries/${battery.id}`, updatePayload);
			}
			// 2) Assign/unassign if changed
			const currentAssigned = battery.assigned_bike_id ?? "";
			if ((assignedBikeId || "") !== (currentAssigned || "")) {
				if (assignedBikeId === "") {
					// Unassign if currently assigned
					if (currentAssigned) {
						await api.post(`/fleet/bikes/${currentAssigned}/unassign-battery/${battery.id}`);
					}
				} else {
					// Assign to selected bike
					await api.post(`/fleet/bikes/${assignedBikeId}/assign-battery/${battery.id}`);
				}
			}
		},
		onSuccess: () => {
			setEditingBatteryId(null);
			queryClient.invalidateQueries({ queryKey: ["batteries"] });
			queryClient.invalidateQueries({ queryKey: ["bikes"] });
		},
	});

	const isLoading = bikesQuery.isLoading || batteriesQuery.isLoading || driversQuery.isLoading;
	const isError = bikesQuery.isError || batteriesQuery.isError || driversQuery.isError;

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
									<span className="font-medium">{b.serial_number}</span>
									{b.status ? <span className="text-gray-600">({b.status})</span> : null}
									{typeof b.mileage === "number" ? (
										<span className="text-gray-600">• Mileage: {b.mileage}</span>
									) : null}
									<span className="text-gray-600">
										• Assigned: {b.assigned_profile_id ? "Yes" : "No"}
									</span>
								</div>
							))}
							{(bikesQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No bikes.</div>
							) : null}
						</div>
					</section>

					<section>
						<h3 className="font-semibold mb-2">Batteries ({batteriesQuery.data?.length ?? 0})</h3>
						<div className="border rounded-md p-3 mb-3">
							<h4 className="font-medium mb-2 text-sm">Create Battery</h4>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (!batterySerialNumber.trim()) {
										return;
									}
									createBatteryMutation.mutate();
								}}
								className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
							>
								<label className="flex flex-col gap-1 md:col-span-2">
									<span className="text-xs text-gray-600">Serial number</span>
									<input
										type="text"
										value={batterySerialNumber}
										onChange={(e) => setBatterySerialNumber(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm"
										placeholder="BAT-12345"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Capacity (Wh)</span>
									<input
										type="number"
										min={0}
										value={batteryCapacityWh}
										onChange={(e) => {
											const v = e.target.value;
											if (v === "") setBatteryCapacityWh("");
											else setBatteryCapacityWh(Number(v));
										}}
										className="border rounded px-2 py-1 text-sm"
										placeholder="500"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Charge level (%)</span>
									<input
										type="number"
										min={0}
										max={100}
										value={batteryChargeLevel}
										onChange={(e) => {
											const v = e.target.value;
											if (v === "") setBatteryChargeLevel("");
											else setBatteryChargeLevel(Number(v));
										}}
										className="border rounded px-2 py-1 text-sm"
										placeholder="100"
									/>
								</label>
								<div className="md:col-span-1">
									<button
										type="submit"
										disabled={createBatteryMutation.isPending}
										className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded w-full"
									>
										{createBatteryMutation.isPending ? "Creating…" : "Create"}
									</button>
								</div>
								{createBatteryMutation.isError ? (
									<div className="md:col-span-6 text-xs text-red-600">
										Failed to create battery.
									</div>
								) : null}
								{createBatteryMutation.isSuccess ? (
									<div className="md:col-span-6 text-xs text-green-700">
										Battery created.
									</div>
								) : null}
							</form>
						</div>
						<div className="border rounded-md divide-y">
							{(batteriesQuery.data ?? []).map((b) => (
								<div key={b.id} className="px-3 py-2 text-sm flex items-center gap-3">
									<span className="font-medium">{b.serial_number}</span>
									{typeof b.capacity_wh === "number" ? (
										<span className="text-gray-600">• Capacity: {b.capacity_wh} Wh</span>
									) : null}
									{typeof b.charge_level === "number" ? (
										<span className="text-gray-600">• {b.charge_level}%</span>
									) : null}
									{b.assigned_bike_id
										? (() => {
												const bike = (bikesQuery.data ?? []).find((x) => x.id === b.assigned_bike_id);
												return bike ? (
													<span className="text-gray-600">• Bike: {bike.serial_number}</span>
												) : null;
										  })()
										: null}
									<button
										type="button"
										onClick={() => {
											if (editingBatteryId === b.id) {
												setEditingBatteryId(null);
												return;
											}
											setEditingBatteryId(b.id);
											setEditCapacityWh(typeof b.capacity_wh === "number" ? b.capacity_wh : "");
											setEditChargeLevel(typeof b.charge_level === "number" ? b.charge_level : "");
											setEditAssignedBikeId(b.assigned_bike_id ?? "");
										}}
										className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
									>
										{editingBatteryId === b.id ? "Close" : "Manage"}
									</button>
									{editingBatteryId === b.id ? (
										<div className="w-full mt-2">
											<form
												onSubmit={(e) => {
													e.preventDefault();
													manageBatteryMutation.mutate({
														battery: b,
														capacityWh: editCapacityWh,
														chargeLevel: editChargeLevel,
														assignedBikeId: editAssignedBikeId,
													});
												}}
												className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
											>
												<label className="flex flex-col gap-1">
													<span className="text-xs text-gray-600">Capacity (Wh)</span>
													<input
														type="number"
														min={0}
														value={editCapacityWh}
														onChange={(e) => {
															const v = e.target.value;
															if (v === "") setEditCapacityWh("");
															else setEditCapacityWh(Number(v));
														}}
														className="border rounded px-2 py-1 text-sm"
														placeholder="500"
													/>
												</label>
												<label className="flex flex-col gap-1">
													<span className="text-xs text-gray-600">Charge level (%)</span>
													<input
														type="number"
														min={0}
														max={100}
														value={editChargeLevel}
														onChange={(e) => {
															const v = e.target.value;
															if (v === "") setEditChargeLevel("");
															else setEditChargeLevel(Number(v));
														}}
														className="border rounded px-2 py-1 text-sm"
														placeholder="100"
													/>
												</label>
												<label className="flex flex-col gap-1 md:col-span-2">
													<span className="text-xs text-gray-600">Assign to bike</span>
													<select
														value={editAssignedBikeId}
														onChange={(e) => setEditAssignedBikeId(e.target.value)}
														className="border rounded px-2 py-1 text-sm bg-white"
													>
														<option value="">Unassigned</option>
														{(bikesQuery.data ?? []).map((bike) => (
															<option key={bike.id} value={bike.id}>
																{bike.serial_number}
															</option>
														))}
													</select>
												</label>
												<div className="md:col-span-1 flex gap-2">
													<button
														type="submit"
														disabled={manageBatteryMutation.isPending}
														className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded"
													>
														{manageBatteryMutation.isPending ? "Saving…" : "Save"}
													</button>
													<button
														type="button"
														onClick={() => setEditingBatteryId(null)}
														className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
													>
														Cancel
													</button>
												</div>
												{manageBatteryMutation.isError ? (
													<div className="md:col-span-6 text-xs text-red-600">
														Failed to save changes.
													</div>
												) : null}
												{manageBatteryMutation.isSuccess ? (
													<div className="md:col-span-6 text-xs text-green-700">
														Changes saved.
													</div>
												) : null}
											</form>
										</div>
									) : null}
								</div>
							))}
							{(batteriesQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No batteries.</div>
							) : null}
						</div>
					</section>

					<section>
						<h3 className="font-semibold mb-2">Drivers ({driversQuery.data?.length ?? 0})</h3>
						<div className="border rounded-md divide-y">
							{(driversQuery.data ?? []).map((d) => {
								const hasName = (d.first_name ?? "").trim() || (d.last_name ?? "").trim();
								const displayName = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unnamed driver";
								return (
									<div key={d.id} className="px-3 py-2 text-sm">
										<div className="flex items-center gap-3">
											<span className="font-medium">{displayName}</span>
											<span className="text-gray-600">(role: {d.role})</span>
										</div>
										<div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
											<span>Profile ID: <span className="font-mono">{d.id}</span></span>
											<span>User ID: <span className="font-mono">{d.user_id}</span></span>
											{d.phone_number ? <span>Phone: {d.phone_number}</span> : null}
											{d.address_line ? <span>Address: {d.address_line}</span> : null}
											{!hasName ? <span className="italic">No profile name set</span> : null}
										</div>
									</div>
								);
							})}
							{(driversQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No drivers.</div>
							) : null}
						</div>
					</section>
				</>
			)}
		</div>
	);
}


