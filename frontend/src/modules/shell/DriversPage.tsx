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

export function DriversPage() {
	const queryClient = useQueryClient();

	// Create driver form state
	const [driverUsername, setDriverUsername] = React.useState("");
	const [driverEmail, setDriverEmail] = React.useState("");
	const [driverPassword, setDriverPassword] = React.useState("");
	const [driverFirstName, setDriverFirstName] = React.useState("");
	const [driverLastName, setDriverLastName] = React.useState("");
	const [driverPhoneNumber, setDriverPhoneNumber] = React.useState("");
	const [driverAddressLine, setDriverAddressLine] = React.useState("");

	// Manage driver-side assignment
	const [editingDriverId, setEditingDriverId] = React.useState<string | null>(null);
	const [assignBikeIdForDriver, setAssignBikeIdForDriver] = React.useState<string | "">("");

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

	const isLoading = bikesQuery.isLoading || driversQuery.isLoading;
	const isError = bikesQuery.isError || driversQuery.isError;

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Drivers</h2>
			{isLoading ? (
				<p className="text-sm text-gray-600">Loading data…</p>
			) : isError ? (
				<p className="text-sm text-red-600">Failed to load data.</p>
			) : (
				<div className="space-y-4">
					<section>
						<h3 className="font-semibold mb-2">Create Driver</h3>
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
					</section>
					<section>
						<h3 className="font-semibold mb-2">All Drivers ({driversQuery.data?.length ?? 0})</h3>
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
				</div>
			)}
		</div>
	);
}

