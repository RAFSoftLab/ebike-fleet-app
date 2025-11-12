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

	// Create driver form state
	const [driverUsername, setDriverUsername] = React.useState("");
	const [driverEmail, setDriverEmail] = React.useState("");
	const [driverPassword, setDriverPassword] = React.useState("");
	const [driverFirstName, setDriverFirstName] = React.useState("");
	const [driverLastName, setDriverLastName] = React.useState("");
	const [driverPhoneNumber, setDriverPhoneNumber] = React.useState("");
	const [driverAddressLine, setDriverAddressLine] = React.useState("");

	// Manage battery inline edit state
	const [editingBatteryId, setEditingBatteryId] = React.useState<string | null>(null);
	const [editCapacityWh, setEditCapacityWh] = React.useState<number | "">("");
	const [editChargeLevel, setEditChargeLevel] = React.useState<number | "">("");
	const [editAssignedBikeId, setEditAssignedBikeId] = React.useState<string | "">("");
	// Manage bike-driver assignment inline edit state
	const [editingBikeId, setEditingBikeId] = React.useState<string | null>(null);
	const [editAssignedProfileId, setEditAssignedProfileId] = React.useState<string | "">("");
	// Manage driver-side assignment
	const [editingDriverId, setEditingDriverId] = React.useState<string | null>(null);
	const [assignBikeIdForDriver, setAssignBikeIdForDriver] = React.useState<string | "">("");

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

	const assignBikeToDriverMutation = useMutation({
		mutationFn: async (args: { bikeId: string; profileId: string }) => {
			const { bikeId, profileId } = args;
			await api.post(`/fleet/bikes/${bikeId}/assign-profile/${profileId}`);
		},
		onSuccess: () => {
			setEditingDriverId(null);
			setAssignBikeIdForDriver("");
			queryClient.invalidateQueries({ queryKey: ["bikes"] });
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
		},
	});

	const createDriverMutation = useMutation({
		mutationFn: async () => {
			const payload = {
				username: driverUsername.trim(),
				email: driverEmail.trim(),
				password: driverPassword,
				first_name: driverFirstName.trim() || undefined,
				last_name: driverLastName.trim() || undefined,
				phone_number: driverPhoneNumber.trim() || undefined,
				address_line: driverAddressLine.trim() || undefined,
			};
			const resp = await api.post("/fleet/drivers", payload);
			return resp.data;
		},
		onSuccess: () => {
			setDriverUsername("");
			setDriverEmail("");
			setDriverPassword("");
			setDriverFirstName("");
			setDriverLastName("");
			setDriverPhoneNumber("");
			setDriverAddressLine("");
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
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
				<div className="divide-y divide-gray-200">
					<section className="py-4">
						<h3 className="font-semibold mb-2">Drivers ({driversQuery.data?.length ?? 0})</h3>
						<h4 className="font-medium mb-2 text-sm">Create Driver</h4>
						<div className="border rounded-md p-3 mb-3">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (!driverUsername.trim() || !driverEmail.trim() || !driverPassword) {
										return;
									}
									createDriverMutation.mutate();
								}}
								className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
							>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Username</span>
									<input
										type="text"
										value={driverUsername}
										onChange={(e) => setDriverUsername(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm"
										placeholder="driver123"
									/>
								</label>
								<label className="flex flex-col gap-1 md:col-span-2">
									<span className="text-xs text-gray-600">Email</span>
									<input
										type="email"
										value={driverEmail}
										onChange={(e) => setDriverEmail(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm"
										placeholder="driver@example.com"
									/>
								</label>
								<label className="flex flex-col gap-1 md:col-span-2">
									<span className="text-xs text-gray-600">Temporary password</span>
									<input
										type="password"
										value={driverPassword}
										onChange={(e) => setDriverPassword(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm"
										placeholder="Choose a password"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">First name</span>
									<input
										type="text"
										value={driverFirstName}
										onChange={(e) => setDriverFirstName(e.target.value)}
										className="border rounded px-2 py-1 text-sm"
										placeholder="Jane"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Last name</span>
									<input
										type="text"
										value={driverLastName}
										onChange={(e) => setDriverLastName(e.target.value)}
										className="border rounded px-2 py-1 text-sm"
										placeholder="Doe"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Phone number</span>
									<input
										type="tel"
										value={driverPhoneNumber}
										onChange={(e) => setDriverPhoneNumber(e.target.value)}
										className="border rounded px-2 py-1 text-sm"
										placeholder="+1 555 123 4567"
									/>
								</label>
								<label className="flex flex-col gap-1 md:col-span-2">
                                    <span className="text-xs text-gray-600">Address</span>
                                    <input
                                        type="text"
                                        value={driverAddressLine}
                                        onChange={(e) => setDriverAddressLine(e.target.value)}
                                        className="border rounded px-2 py-1 text-sm"
                                        placeholder="123 Main St"
                                    />
                                </label>
								<div className="md:col-span-1">
									<button
										type="submit"
										disabled={createDriverMutation.isPending}
										className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded w-full"
									>
										{createDriverMutation.isPending ? "Creating…" : "Create"}
									</button>
								</div>
								{createDriverMutation.isError ? (
									<div className="md:col-span-6 text-xs text-red-600">
										Failed to create driver. Check username/email uniqueness.
									</div>
								) : null}
								{createDriverMutation.isSuccess ? (
									<div className="md:col-span-6 text-xs text-green-700">
										Driver created.
									</div>
								) : null}
							</form>
						</div>
						<div className="border rounded-md divide-y">
							{(driversQuery.data ?? []).map((d) => {
								const hasName = (d.first_name ?? "").trim() || (d.last_name ?? "").trim();
								const displayName = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unnamed driver";
								const assignedCount = (bikesQuery.data ?? []).filter((b) => b.assigned_profile_id === d.id).length;
								return (
									<div key={d.id} className="px-3 py-2 text-sm">
										<div className="flex items-center gap-3">
											<span className="font-medium">{displayName}</span>
											<span className="text-gray-600">(role: {d.role})</span>
											{editingDriverId !== d.id ? (
												<button
													type="button"
													onClick={() => {
														setEditingDriverId(d.id);
														setAssignBikeIdForDriver("");
													}}
													className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
												>
													Manage
												</button>
											) : null}
										</div>
										<div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
											{d.phone_number ? <span>Phone: {d.phone_number}</span> : null}
											{d.address_line ? <span>Address: {d.address_line}</span> : null}
											<span>Assigned bike: {assignedCount > 0 ? "Yes" : "No"}</span>
											{!hasName ? <span className="italic">No profile name set</span> : null}
										</div>
										{editingDriverId === d.id ? (
											<div className="mt-2">
												<form
													onSubmit={(e) => {
														e.preventDefault();
														if (!assignBikeIdForDriver) return;
														assignBikeToDriverMutation.mutate({
															bikeId: assignBikeIdForDriver,
															profileId: d.id,
														});
													}}
													className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
												>
													<label className="flex flex-col gap-1 md:col-span-3">
														<span className="text-xs text-gray-600">Assign an unassigned bike</span>
														<select
															value={assignBikeIdForDriver}
															onChange={(e) => setAssignBikeIdForDriver(e.target.value)}
															className="border rounded px-2 py-1 text-sm bg-white"
														>
															<option value="">Select bike…</option>
															{(bikesQuery.data ?? [])
																.filter((bike) => !bike.assigned_profile_id)
																.map((bike) => (
																	<option key={bike.id} value={bike.id}>
																		{bike.serial_number}
																	</option>
																))}
														</select>
													</label>
													<div className="md:col-span-2 flex gap-2">
														<button
															type="submit"
															disabled={assignBikeToDriverMutation.isPending || !assignBikeIdForDriver}
															className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded"
														>
															{assignBikeToDriverMutation.isPending ? "Assigning…" : "Assign"}
														</button>
														<button
															type="button"
															onClick={() => {
																setEditingDriverId(null);
																setAssignBikeIdForDriver("");
															}}
															className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
														>
															Close
														</button>
													</div>
													{assignBikeToDriverMutation.isError ? (
														<div className="md:col-span-6 text-xs text-red-600">Failed to assign bike.</div>
													) : null}
													{assignBikeToDriverMutation.isSuccess ? (
														<div className="md:col-span-6 text-xs text-green-700">Bike assigned.</div>
													) : null}
												</form>
											</div>
										) : null}
									</div>
								);
							})}
							{(driversQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No drivers.</div>
							) : null}
						</div>
					</section>
					<section className="py-4">
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
									{editingBikeId !== b.id ? (
										<button
											type="button"
											onClick={() => {
												setEditingBikeId(b.id);
												setEditAssignedProfileId(b.assigned_profile_id ?? "");
											}}
											className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
										>
											Manage
										</button>
									) : null}
									{editingBikeId === b.id ? (
										<div className="w-full mt-2">
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

					<section className="py-4">
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
									{editingBatteryId !== b.id ? (
										<button
											type="button"
											onClick={() => {
												setEditingBatteryId(b.id);
												setEditCapacityWh(typeof b.capacity_wh === "number" ? b.capacity_wh : "");
												setEditChargeLevel(typeof b.charge_level === "number" ? b.charge_level : "");
												setEditAssignedBikeId(b.assigned_bike_id ?? "");
											}}
											className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
										>
											Manage
										</button>
									) : null}
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
														Close
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

					
				</div>
			)}
		</div>
	);
}


