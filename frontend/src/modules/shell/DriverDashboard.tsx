import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api";
import { exportDriverDashboardToPDF, DriverDashboardData } from "../../shared/pdfExport";

type Battery = {
	id: string;
	serial_number: string;
	capacity_wh?: number;
	charge_level?: number;
	cycle_count?: number;
	health_status?: string;
	status?: string;
	last_service_at?: string;
};

type BikeWithBatteries = {
	id: string;
	serial_number: string;
	make?: string;
	model?: string;
	status?: string;
	mileage?: number;
	last_service_at?: string;
	batteries: Battery[];
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

export function DriverDashboard() {
	const myBikesQuery = useQuery<BikeWithBatteries[]>({
		queryKey: ["me", "bikes"],
		queryFn: async () => {
			const resp = await api.get("/fleet/me/bikes");
			return resp.data as BikeWithBatteries[];
		},
	});

	const myRentalsQuery = useQuery<Rental[]>({
		queryKey: ["rentals"],
		queryFn: async () => {
			const resp = await api.get("/fleet/rentals");
			return resp.data as Rental[];
		},
	});

	const isLoading = myBikesQuery.isLoading || myRentalsQuery.isLoading;
	const isError = myBikesQuery.isError || myRentalsQuery.isError;
	const bikes = myBikesQuery.data ?? [];
	const rentals = myRentalsQuery.data ?? [];

	const handleExportPDF = () => {
		const pdfData: DriverDashboardData = {
			bikes,
			rentals,
		};
		exportDriverDashboardToPDF(pdfData);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">My dashboard</h2>
				<button
					onClick={handleExportPDF}
					disabled={isLoading}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
				>
					Export PDF
				</button>
			</div>
			{isLoading ? (
				<p className="text-sm text-gray-600">Loading data…</p>
			) : isError ? (
				<p className="text-sm text-red-600">Failed to load data.</p>
			) : (
				<>
					<section>
						<h3 className="font-semibold mb-2">My Bikes ({bikes.length})</h3>
						<div className="space-y-4">
							{bikes.length === 0 ? (
								<div className="border rounded-md px-3 py-2 text-sm text-gray-600">No bikes assigned.</div>
							) : (
								bikes.map((bike) => (
									<div key={bike.id} className="border rounded-md">
										<div className="px-3 py-2 text-sm flex flex-wrap items-center gap-3">
											<span className="font-medium">{bike.serial_number}</span>
											{(bike.make || bike.model) ? (
												<span className="text-gray-600">
													{[bike.make, bike.model].filter(Boolean).join(" ")}
												</span>
											) : null}
											{bike.status ? (
												<span className="text-xs rounded bg-gray-100 px-2 py-0.5 text-gray-700">
													{bike.status}
												</span>
											) : null}
										</div>
										<div className="px-3 pb-2 text-xs text-gray-600 flex flex-wrap gap-4">
											{typeof bike.mileage === "number" ? <span>Mileage: {bike.mileage} km</span> : null}
											{bike.last_service_at ? (
												<span>Last service: {new Date(bike.last_service_at).toLocaleDateString()}</span>
											) : null}
											<span>Batteries: {bike.batteries.length}</span>
										</div>
										<div className="border-t divide-y">
											{bike.batteries.length === 0 ? (
												<div className="px-3 py-2 text-sm text-gray-600">No batteries.</div>
											) : (
												bike.batteries.map((bat) => (
													<div key={bat.id} className="px-3 py-2 text-sm flex items-center gap-3">
														<span className="font-medium">{bat.serial_number}</span>
														{typeof bat.charge_level === "number" ? (
															<span className="text-gray-600">{bat.charge_level}%</span>
														) : null}
														{typeof bat.capacity_wh === "number" ? (
															<span className="text-gray-600">{bat.capacity_wh} Wh</span>
														) : null}
														{bat.health_status ? (
															<span className="text-gray-600">{bat.health_status}</span>
														) : null}
														{typeof bat.cycle_count === "number" ? (
															<span className="text-gray-600">{bat.cycle_count} cycles</span>
														) : null}
														{bat.status ? <span className="text-gray-600">({bat.status})</span> : null}
													</div>
												))
											)}
										</div>
									</div>
								))
							)}
						</div>
					</section>
					<section>
						<h3 className="font-semibold mb-2">My Rentals ({rentals.length})</h3>
						<div className="space-y-4">
							{rentals.length === 0 ? (
								<div className="border rounded-md px-3 py-2 text-sm text-gray-600">No rentals.</div>
							) : (
								rentals.map((rental) => {
									const bike = bikes.find((b) => b.id === rental.bike_id);
									const isOngoing = !rental.end_date;
									const startDate = new Date(rental.start_date).toLocaleDateString();
									const endDate = rental.end_date ? new Date(rental.end_date).toLocaleDateString() : "Ongoing";

									return (
										<div key={rental.id} className="border rounded-md">
											<div className="px-3 py-2 text-sm">
												<div className="flex items-center gap-3 flex-wrap">
													<span className="font-medium">
														{bike?.serial_number ?? "Unknown bike"}
													</span>
													<span className="text-gray-600">
														{startDate} - {endDate}
													</span>
													{isOngoing ? (
														<span className="text-xs rounded bg-green-100 px-2 py-0.5 text-green-700">
															Active
														</span>
													) : (
														<span className="text-xs rounded bg-gray-100 px-2 py-0.5 text-gray-700">
															Completed
														</span>
													)}
												</div>
												{rental.notes ? (
													<div className="mt-1 text-xs text-gray-600">Notes: {rental.notes}</div>
												) : null}
											</div>
										</div>
									);
								})
							)}
						</div>
					</section>
				</>
			)}
		</div>
	);
}


