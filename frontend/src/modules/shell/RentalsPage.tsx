import React from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "../../shared/api";
import { useCurrency } from "../../shared/CurrencyContext";

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
type Rental = {
	id: string;
	bike_id: string;
	profile_id: string;
	start_date: string;
	end_date?: string | null;
	notes?: string | null;
	created_at: string;
	updated_at: string;
};

export function RentalsPage() {
	const queryClient = useQueryClient();
	const { getCurrencySymbol } = useCurrency();

	// Create rental form state
	const [rentalBikeId, setRentalBikeId] = React.useState<string | "">("");
	const [rentalProfileId, setRentalProfileId] = React.useState<string | "">("");
	const [rentalStartDate, setRentalStartDate] = React.useState("");
	const [rentalEndDate, setRentalEndDate] = React.useState("");
	const [rentalNotes, setRentalNotes] = React.useState("");

	// Edit rental state
	const [editingRentalId, setEditingRentalId] = React.useState<string | null>(null);
	const [editRentalBikeId, setEditRentalBikeId] = React.useState<string | "">("");
	const [editRentalProfileId, setEditRentalProfileId] = React.useState<string | "">("");
	const [editRentalStartDate, setEditRentalStartDate] = React.useState("");
	const [editRentalEndDate, setEditRentalEndDate] = React.useState("");
	const [editRentalNotes, setEditRentalNotes] = React.useState("");

	// Search state - separate input value from debounced search query
	const [searchInput, setSearchInput] = React.useState("");
	const [searchQuery, setSearchQuery] = React.useState("");

	// Debounce search input - reduced to 200ms for more responsive feel
	React.useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(searchInput);
		}, 200); // 200ms debounce for smoother experience

		return () => clearTimeout(timer);
	}, [searchInput]);

	// Income transaction form state
	const { availableCurrencies } = useCurrency();
	const [showIncomeForm, setShowIncomeForm] = React.useState<string | null>(null);
	const [incomeAmount, setIncomeAmount] = React.useState<number | "">("");
	const [incomeCurrency, setIncomeCurrency] = React.useState("RSD");
	const [incomeDate, setIncomeDate] = React.useState("");
	const [incomeDescription, setIncomeDescription] = React.useState("");

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

	const rentalsQuery = useQuery<Rental[]>({
		queryKey: ["rentals", searchQuery],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (searchQuery.trim()) {
				params.append("search", searchQuery.trim());
			}
			const resp = await api.get(`/fleet/rentals?${params.toString()}`);
			return resp.data as Rental[];
		},
		refetchOnWindowFocus: false,
		staleTime: 0,
		placeholderData: keepPreviousData,
	});

	const createRentalMutation = useMutation({
		mutationFn: async () => {
			const payload: any = {
				bike_id: rentalBikeId,
				profile_id: rentalProfileId,
				start_date: rentalStartDate,
			};
			if (rentalEndDate) {
				payload.end_date = rentalEndDate;
			}
			if (rentalNotes.trim()) {
				payload.notes = rentalNotes.trim();
			}
			const resp = await api.post("/fleet/rentals", payload);
			return resp.data as Rental;
		},
		onSuccess: () => {
			setRentalBikeId("");
			setRentalProfileId("");
			setRentalStartDate("");
			setRentalEndDate("");
			setRentalNotes("");
			queryClient.invalidateQueries({ queryKey: ["rentals"] });
		},
	});

	const updateRentalMutation = useMutation({
		mutationFn: async (args: { rentalId: string }) => {
			const payload: any = {};
			if (editRentalBikeId) payload.bike_id = editRentalBikeId;
			if (editRentalProfileId) payload.profile_id = editRentalProfileId;
			if (editRentalStartDate) payload.start_date = editRentalStartDate;
			if (editRentalEndDate) payload.end_date = editRentalEndDate;
			if (editRentalNotes !== undefined) payload.notes = editRentalNotes.trim() || null;
			const resp = await api.put(`/fleet/rentals/${args.rentalId}`, payload);
			return resp.data as Rental;
		},
		onSuccess: () => {
			setEditingRentalId(null);
			queryClient.invalidateQueries({ queryKey: ["rentals"] });
		},
	});

	const deleteRentalMutation = useMutation({
		mutationFn: async (rentalId: string) => {
			await api.delete(`/fleet/rentals/${rentalId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rentals"] });
		},
	});

	const createIncomeMutation = useMutation({
		mutationFn: async (rentalId: string) => {
			const payload: any = {
				transaction_type: "income",
				amount: incomeAmount,
				currency: incomeCurrency,
				rental_id: rentalId,
				transaction_date: incomeDate,
			};
			if (incomeDescription.trim()) {
				payload.description = incomeDescription.trim();
			}
			const resp = await api.post("/fleet/transactions", payload);
			return resp.data;
		},
		onSuccess: () => {
			setShowIncomeForm(null);
			setIncomeAmount("");
			setIncomeCurrency("RSD");
			setIncomeDate("");
			setIncomeDescription("");
			queryClient.invalidateQueries({ queryKey: ["financial-analytics"] });
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
		},
	});

	const isLoading = bikesQuery.isLoading || driversQuery.isLoading || rentalsQuery.isLoading;
	const isError = bikesQuery.isError || driversQuery.isError || rentalsQuery.isError;

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Rentals</h2>
			{isLoading ? (
				<p className="text-sm text-gray-600">Loading data…</p>
			) : isError ? (
				<p className="text-sm text-red-600">Failed to load data.</p>
			) : (
				<div className="space-y-4">
					<section>
						<h3 className="font-semibold mb-2">Create Rental</h3>
						<div className="border rounded-md p-3 mb-3">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (!rentalBikeId || !rentalProfileId || !rentalStartDate) {
										return;
									}
									createRentalMutation.mutate();
								}}
								className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
							>
								<label className="flex flex-col gap-1 md:col-span-2">
									<span className="text-xs text-gray-600">Bike</span>
									<select
										value={rentalBikeId}
										onChange={(e) => setRentalBikeId(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm bg-white"
									>
										<option value="">Select bike…</option>
										{(bikesQuery.data ?? []).map((bike) => (
											<option key={bike.id} value={bike.id}>
												{bike.serial_number}
											</option>
										))}
									</select>
								</label>
								<label className="flex flex-col gap-1 md:col-span-2">
									<span className="text-xs text-gray-600">Driver</span>
									<select
										value={rentalProfileId}
										onChange={(e) => setRentalProfileId(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm bg-white"
									>
										<option value="">Select driver…</option>
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
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">Start date</span>
									<input
										type="date"
										value={rentalStartDate}
										onChange={(e) => setRentalStartDate(e.target.value)}
										required
										className="border rounded px-2 py-1 text-sm"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<span className="text-xs text-gray-600">End date (optional)</span>
									<input
										type="date"
										value={rentalEndDate}
										onChange={(e) => setRentalEndDate(e.target.value)}
										min={rentalStartDate}
										className="border rounded px-2 py-1 text-sm"
									/>
								</label>
								<label className="flex flex-col gap-1 md:col-span-4">
									<span className="text-xs text-gray-600">Notes (optional)</span>
									<input
										type="text"
										value={rentalNotes}
										onChange={(e) => setRentalNotes(e.target.value)}
										className="border rounded px-2 py-1 text-sm"
										placeholder="Additional notes..."
									/>
								</label>
								<div className="md:col-span-1">
									<button
										type="submit"
										disabled={createRentalMutation.isPending}
										className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded w-full"
									>
										{createRentalMutation.isPending ? "Creating…" : "Create"}
									</button>
								</div>
								{createRentalMutation.isError ? (
									<div className="md:col-span-6 text-xs text-red-600">
										Failed to create rental. Check for date conflicts.
									</div>
								) : null}
								{createRentalMutation.isSuccess ? (
									<div className="md:col-span-6 text-xs text-green-700">
										Rental created.
									</div>
								) : null}
							</form>
						</div>
					</section>
					<section>
						<div className="flex items-center justify-between mb-2">
							<h3 className="font-semibold">All Rentals ({rentalsQuery.data?.length ?? 0})</h3>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									placeholder="Search rentals..."
									className="border rounded px-2 py-1 text-sm w-64"
								/>
								{searchInput && (
									<button
										type="button"
										onClick={() => {
											setSearchInput("");
											setSearchQuery("");
										}}
										className="text-gray-500 hover:text-gray-700 text-sm"
									>
										Clear
									</button>
								)}
							</div>
						</div>
						<div className="border rounded-md divide-y">
							{(rentalsQuery.data ?? []).map((rental) => {
								const bike = (bikesQuery.data ?? []).find((b) => b.id === rental.bike_id);
								const driver = (driversQuery.data ?? []).find((d) => d.id === rental.profile_id);
								const driverName = driver
									? `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() || "Unnamed driver"
									: "Unknown";
								const isOngoing = !rental.end_date;
								const startDate = new Date(rental.start_date).toLocaleDateString();
								const endDate = rental.end_date ? new Date(rental.end_date).toLocaleDateString() : "Ongoing";

								return (
									<div key={rental.id} className="px-3 py-2 text-sm">
										<div className="flex items-center gap-3 flex-wrap">
											<span className="font-medium">
												{bike?.serial_number ?? "Unknown bike"} → {driverName}
											</span>
											<span className="text-gray-600">
												{startDate} - {endDate}
											</span>
											{isOngoing ? (
												<span className="text-xs rounded bg-green-100 px-2 py-0.5 text-green-700">
													Active
												</span>
											) : null}
											{editingRentalId !== rental.id && showIncomeForm !== rental.id ? (
												<div className="ml-auto flex gap-2">
													<button
														type="button"
														onClick={() => {
															setShowIncomeForm(rental.id);
															setIncomeDate(new Date().toISOString().split("T")[0]);
															setIncomeDescription(`Rental income for ${bike?.serial_number ?? "bike"} - ${driverName}`);
														}}
														className="bg-green-100 hover:bg-green-200 text-green-800 text-xs px-2 py-1 rounded"
													>
														Add Income
													</button>
													<button
														type="button"
														onClick={() => {
															setEditingRentalId(rental.id);
															setEditRentalBikeId(rental.bike_id);
															setEditRentalProfileId(rental.profile_id);
															setEditRentalStartDate(rental.start_date.split("T")[0]);
															setEditRentalEndDate(rental.end_date?.split("T")[0] || "");
															setEditRentalNotes(rental.notes || "");
														}}
														className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={() => {
															if (confirm("Delete this rental?")) {
																deleteRentalMutation.mutate(rental.id);
															}
														}}
														disabled={deleteRentalMutation.isPending}
														className="bg-red-100 hover:bg-red-200 text-red-800 text-xs px-2 py-1 rounded disabled:bg-red-50"
													>
														Delete
													</button>
												</div>
											) : null}
										</div>
										{rental.notes ? (
											<div className="mt-1 text-xs text-gray-600">Notes: {rental.notes}</div>
										) : null}
										{showIncomeForm === rental.id ? (
											<div className="mt-2 border-t pt-2">
												<h4 className="text-xs font-semibold mb-2">Add Income Transaction</h4>
												<form
													onSubmit={(e) => {
														e.preventDefault();
														if (!incomeDate || incomeAmount === "" || incomeAmount <= 0) {
															return;
														}
														createIncomeMutation.mutate(rental.id);
													}}
													className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
												>
													<label className="flex flex-col gap-1">
														<span className="text-xs text-gray-600">Date</span>
														<input
															type="date"
															value={incomeDate}
															onChange={(e) => setIncomeDate(e.target.value)}
															required
															className="border rounded px-2 py-1 text-sm"
														/>
													</label>
													<label className="flex flex-col gap-1">
														<span className="text-xs text-gray-600">Amount</span>
														<input
															type="number"
															min={0}
															step="0.01"
															value={incomeAmount}
															onChange={(e) => {
																const v = e.target.value;
																if (v === "") setIncomeAmount("");
																else setIncomeAmount(Number(v));
															}}
															required
															className="border rounded px-2 py-1 text-sm"
															placeholder="0.00"
														/>
													</label>
													<label className="flex flex-col gap-1">
														<span className="text-xs text-gray-600">Currency</span>
														<select
															value={incomeCurrency}
															onChange={(e) => setIncomeCurrency(e.target.value)}
															className="border rounded px-2 py-1 text-sm bg-white"
														>
															{availableCurrencies.map((curr) => (
																<option key={curr.code} value={curr.code}>
																	{curr.code} - {curr.name}
																</option>
															))}
														</select>
													</label>
													<label className="flex flex-col gap-1 md:col-span-2">
														<span className="text-xs text-gray-600">Description (optional)</span>
														<input
															type="text"
															value={incomeDescription}
															onChange={(e) => setIncomeDescription(e.target.value)}
															className="border rounded px-2 py-1 text-sm"
															placeholder="Income description"
														/>
													</label>
													<div className="md:col-span-2 flex gap-2">
														<button
															type="submit"
															disabled={createIncomeMutation.isPending}
															className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm px-3 py-2 rounded"
														>
															{createIncomeMutation.isPending ? "Saving…" : "Save"}
														</button>
														<button
															type="button"
														onClick={() => {
															setShowIncomeForm(null);
															setIncomeAmount("");
															setIncomeCurrency("RSD");
															setIncomeDate("");
															setIncomeDescription("");
														}}
															className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
														>
															Cancel
														</button>
													</div>
													{createIncomeMutation.isError ? (
														<div className="md:col-span-6 text-xs text-red-600">Failed to create income transaction.</div>
													) : null}
													{createIncomeMutation.isSuccess ? (
														<div className="md:col-span-6 text-xs text-green-700">Income transaction created.</div>
													) : null}
												</form>
											</div>
										) : null}
										{editingRentalId === rental.id ? (
											<div className="mt-2">
												<form
													onSubmit={(e) => {
														e.preventDefault();
														updateRentalMutation.mutate({ rentalId: rental.id });
													}}
													className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
												>
													<label className="flex flex-col gap-1 md:col-span-2">
														<span className="text-xs text-gray-600">Bike</span>
														<select
															value={editRentalBikeId}
															onChange={(e) => setEditRentalBikeId(e.target.value)}
															className="border rounded px-2 py-1 text-sm bg-white"
														>
															{(bikesQuery.data ?? []).map((b) => (
																<option key={b.id} value={b.id}>
																	{b.serial_number}
																</option>
															))}
														</select>
													</label>
													<label className="flex flex-col gap-1 md:col-span-2">
														<span className="text-xs text-gray-600">Driver</span>
														<select
															value={editRentalProfileId}
															onChange={(e) => setEditRentalProfileId(e.target.value)}
															className="border rounded px-2 py-1 text-sm bg-white"
														>
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
													<label className="flex flex-col gap-1">
														<span className="text-xs text-gray-600">Start date</span>
														<input
															type="date"
															value={editRentalStartDate}
															onChange={(e) => setEditRentalStartDate(e.target.value)}
															className="border rounded px-2 py-1 text-sm"
														/>
													</label>
													<label className="flex flex-col gap-1">
														<span className="text-xs text-gray-600">End date (optional)</span>
														<input
															type="date"
															value={editRentalEndDate}
															onChange={(e) => setEditRentalEndDate(e.target.value)}
															min={editRentalStartDate}
															className="border rounded px-2 py-1 text-sm"
														/>
													</label>
													<label className="flex flex-col gap-1 md:col-span-4">
														<span className="text-xs text-gray-600">Notes (optional)</span>
														<input
															type="text"
															value={editRentalNotes}
															onChange={(e) => setEditRentalNotes(e.target.value)}
															className="border rounded px-2 py-1 text-sm"
															placeholder="Additional notes..."
														/>
													</label>
													<div className="md:col-span-1 flex gap-2">
														<button
															type="submit"
															disabled={updateRentalMutation.isPending}
															className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm px-3 py-2 rounded"
														>
															{updateRentalMutation.isPending ? "Saving…" : "Save"}
														</button>
														<button
															type="button"
															onClick={() => {
																setEditingRentalId(null);
															}}
															className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
														>
															Cancel
														</button>
													</div>
													{updateRentalMutation.isError ? (
														<div className="md:col-span-6 text-xs text-red-600">
															Failed to update rental. Check for date conflicts.
														</div>
													) : null}
													{updateRentalMutation.isSuccess ? (
														<div className="md:col-span-6 text-xs text-green-700">
															Rental updated.
														</div>
													) : null}
												</form>
											</div>
										) : null}
									</div>
								);
							})}
							{(rentalsQuery.data ?? []).length === 0 ? (
								<div className="px-3 py-2 text-sm text-gray-600">No rentals.</div>
							) : null}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

