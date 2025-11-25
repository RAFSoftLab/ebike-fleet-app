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
type DriverProfile = {
	id: string;
	user_id: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	address_line?: string;
	role: "admin" | "driver";
};

export function BikesPage() {
	const queryClient = useQueryClient();

	// Create bike form state
	const [serialNumber, setSerialNumber] = React.useState("");
	const [make, setMake] = React.useState("");
	const [model, setModel] = React.useState("");
	const [status, setStatus] = React.useState("available");
	const [mileage, setMileage] = React.useState<number | "">("");

	// Manage bike-driver assignment inline edit state
	const [editingBikeId, setEditingBikeId] = React.useState<string | null>(null);
	const [editAssignedProfileId, setEditAssignedProfileId] = React.useState<string | "">("");

	// Maintenance record form state
	const [showMaintenanceForm, setShowMaintenanceForm] = React.useState<string | null>(null);
	const [maintenanceServiceDate, setMaintenanceServiceDate] = React.useState("");
	const [maintenanceDescription, setMaintenanceDescription] = React.useState("");
	const [maintenanceCost, setMaintenanceCost] = React.useState<number | "">("");
	const [maintenanceNotes, setMaintenanceNotes] = React.useState("");

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

	const manageBikeAssignmentMutation = useMutation({
		mutationFn: async (args: { bike: Bike; assignedProfileId: string | "" }) => {
			const { bike, assignedProfileId } = args;
			const currentAssigned = bike.assigned_profile_id ?? "";
			if ((assignedProfileId || "") === (currentAssigned || "")) {
				return;
			}
			if (assignedProfileId === "") {
				await api.post(`/fleet/bikes/${bike.id}/unassign-profile`);
			} else {
				await api.post(`/fleet/bikes/${bike.id}/assign-profile/${assignedProfileId}`);
			}
		},
		onSuccess: () => {
			setEditingBikeId(null);
			queryClient.invalidateQueries({ queryKey: ["bikes"] });
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
		},
	});

	const createMaintenanceMutation = useMutation({
		mutationFn: async (bikeId: string) => {
			const payload: any = {
				bike_id: bikeId,
				service_date: maintenanceServiceDate,
				description: maintenanceDescription.trim(),
				cost: maintenanceCost,
			};
			if (maintenanceNotes.trim()) {
				payload.notes = maintenanceNotes.trim();
			}
			const resp = await api.post("/fleet/maintenance", payload);
			return resp.data;
		},
		onSuccess: () => {
			setShowMaintenanceForm(null);
			setMaintenanceServiceDate("");
			setMaintenanceDescription("");
			setMaintenanceCost("");
			setMaintenanceNotes("");
			queryClient.invalidateQueries({ queryKey: ["maintenance"] });
			queryClient.invalidateQueries({ queryKey: ["financial-analytics"] });
			queryClient.invalidateQueries({ queryKey: ["bikes"] });
		},
	});

	const isLoading = bikesQuery.isLoading || driversQuery.isLoading || statusesQuery.isLoading;
	const isError = bikesQuery.isError || driversQuery.isError || statusesQuery.isError;

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Bikes</h2>
			{isLoading ? (
				<p className="text-sm text-gray-600">Loading data…</p>
			) : isError ? (
				<p className="text-sm text-red-600">Failed to load data.</p>
			) : (
				<div className="space-y-4">
					<section>
						<h3 className="font-semibold mb-2">Create Bike</h3>
						<div className="border rounded-md p-3 mb-3">
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
					</section>
					<section>
						<h3 className="font-semibold mb-2">All Bikes ({bikesQuery.data?.length ?? 0})</h3>
						<div className="border rounded-md divide-y">
							{(bikesQuery.data ?? []).map((b) => (
								<div key={b.id} className="px-3 py-2 text-sm flex items-center gap-3">
									<span className="font-medium">{b.serial_number}</span>
									{b.status ? <span className="text-gray-600">({b.status})</span> : null}
									{typeof b.mileage === "number" ? (
										<span className="text-gray-600">• Mileage: {b.mileage}</span>
									) : null}
									{b.assigned_profile_id ? (
										<span className="text-gray-600">
											• Driver:{" "}
											{(() => {
												const d = (driversQuery.data ?? []).find((x) => x.id === b.assigned_profile_id);
												if (!d) return "Unknown";
												const displayName = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unnamed driver";
												return displayName;
											})()}
										</span>
									) : (
										<span className="text-gray-600">• Unassigned</span>
									)}
									{editingBikeId !== b.id && showMaintenanceForm !== b.id ? (
										<div className="ml-auto flex gap-2">
											<button
												type="button"
												onClick={() => {
													setShowMaintenanceForm(b.id);
													setMaintenanceServiceDate(new Date().toISOString().split("T")[0]);
												}}
												className="bg-green-100 hover:bg-green-200 text-green-800 text-xs px-2 py-1 rounded"
											>
												Add Maintenance
											</button>
											<button
												type="button"
												onClick={() => {
													setEditingBikeId(b.id);
													setEditAssignedProfileId(b.assigned_profile_id ?? "");
												}}
												className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
											>
												Manage
											</button>
										</div>
									) : null}
									{showMaintenanceForm === b.id ? (
										<div className="w-full mt-2 border-t pt-2">
											<h4 className="text-xs font-semibold mb-2">Add Maintenance Record</h4>
											<form
												onSubmit={(e) => {
													e.preventDefault();
													if (!maintenanceServiceDate || !maintenanceDescription.trim() || maintenanceCost === "" || maintenanceCost <= 0) {
														return;
													}
													createMaintenanceMutation.mutate(b.id);
												}}
												className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
											>
												<label className="flex flex-col gap-1">
													<span className="text-xs text-gray-600">Service Date</span>
													<input
														type="date"
														value={maintenanceServiceDate}
														onChange={(e) => setMaintenanceServiceDate(e.target.value)}
														required
														className="border rounded px-2 py-1 text-sm"
													/>
												</label>
												<label className="flex flex-col gap-1 md:col-span-2">
													<span className="text-xs text-gray-600">Description</span>
													<input
														type="text"
														value={maintenanceDescription}
														onChange={(e) => setMaintenanceDescription(e.target.value)}
														required
														className="border rounded px-2 py-1 text-sm"
														placeholder="What was done?"
													/>
												</label>
												<label className="flex flex-col gap-1">
													<span className="text-xs text-gray-600">Cost ($)</span>
													<input
														type="number"
														min={0}
														step="0.01"
														value={maintenanceCost}
														onChange={(e) => {
															const v = e.target.value;
															if (v === "") setMaintenanceCost("");
															else setMaintenanceCost(Number(v));
														}}
														required
														className="border rounded px-2 py-1 text-sm"
														placeholder="0.00"
													/>
												</label>
												<label className="flex flex-col gap-1 md:col-span-1">
													<span className="text-xs text-gray-600">Notes (optional)</span>
													<input
														type="text"
														value={maintenanceNotes}
														onChange={(e) => setMaintenanceNotes(e.target.value)}
														className="border rounded px-2 py-1 text-sm"
														placeholder="Additional notes"
													/>
												</label>
												<div className="md:col-span-1 flex gap-2">
													<button
														type="submit"
														disabled={createMaintenanceMutation.isPending}
														className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm px-3 py-2 rounded"
													>
														{createMaintenanceMutation.isPending ? "Saving…" : "Save"}
													</button>
													<button
														type="button"
														onClick={() => {
															setShowMaintenanceForm(null);
															setMaintenanceServiceDate("");
															setMaintenanceDescription("");
															setMaintenanceCost("");
															setMaintenanceNotes("");
														}}
														className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
													>
														Cancel
													</button>
												</div>
												{createMaintenanceMutation.isError ? (
													<div className="md:col-span-6 text-xs text-red-600">Failed to create maintenance record.</div>
												) : null}
												{createMaintenanceMutation.isSuccess ? (
													<div className="md:col-span-6 text-xs text-green-700">Maintenance record created.</div>
												) : null}
											</form>
										</div>
									) : null}
									{editingBikeId === b.id ? (
										<div className="w-full mt-2 border-t pt-2">
											<form
												onSubmit={(e) => {
													e.preventDefault();
													manageBikeAssignmentMutation.mutate({
														bike: b,
														assignedProfileId: editAssignedProfileId,
													});
												}}
												className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
											>
												<label className="flex flex-col gap-1 md:col-span-3">
													<span className="text-xs text-gray-600">Assign to driver</span>
													<select
														value={editAssignedProfileId}
														onChange={(e) => setEditAssignedProfileId(e.target.value)}
														className="border rounded px-2 py-1 text-sm bg-white"
													>
														<option value="">Unassigned</option>
														{(driversQuery.data ?? []).map((driver) => {
															const name = `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() || "Unnamed driver";
															return (
																<option key={driver.id} value={driver.id}>
																	{name}
																</option>
															);
														})}
													</select>
												</label>
												<div className="md:col-span-2 flex gap-2">
													<button
														type="submit"
														disabled={manageBikeAssignmentMutation.isPending}
														className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded"
													>
														{manageBikeAssignmentMutation.isPending ? "Saving…" : "Save"}
													</button>
													<button
														type="button"
														onClick={() => setEditingBikeId(null)}
														className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
													>
														Close
													</button>
												</div>
												{manageBikeAssignmentMutation.isError ? (
													<div className="md:col-span-6 text-xs text-red-600">Failed to save changes.</div>
												) : null}
												{manageBikeAssignmentMutation.isSuccess ? (
													<div className="md:col-span-6 text-xs text-green-700">Changes saved.</div>
												) : null}
											</form>
										</div>
									) : null}
								</div>
							))}
							{(bikesQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No bikes.</div>
							) : null}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

