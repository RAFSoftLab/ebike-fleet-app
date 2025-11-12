import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api";

type Battery = {
	id: string;
	serial_number: string;
	charge_level?: number;
	status?: string;
};

type BikeWithBatteries = {
	id: string;
	serial_number: string;
	status?: string;
	batteries: Battery[];
};

export function DriverDashboard() {
	const myBikesQuery = useQuery<BikeWithBatteries[]>({
		queryKey: ["me", "bikes"],
		queryFn: async () => {
			const resp = await api.get("/fleet/me/bikes");
			return resp.data as BikeWithBatteries[];
		},
	});

	const isLoading = myBikesQuery.isLoading;
	const isError = myBikesQuery.isError;
	const bikes = myBikesQuery.data ?? [];

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">My dashboard</h2>
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
										<div className="px-3 py-2 text-sm flex items-center gap-3">
											<span className="font-mono text-xs text-gray-500">{bike.id}</span>
											<span className="font-medium">{bike.serial_number}</span>
											{bike.status ? <span className="text-gray-600">({bike.status})</span> : null}
										</div>
										<div className="border-t divide-y">
											{bike.batteries.length === 0 ? (
												<div className="px-3 py-2 text-sm text-gray-600">No batteries.</div>
											) : (
												bike.batteries.map((bat) => (
													<div key={bat.id} className="px-3 py-2 text-sm flex items-center gap-3">
														<span className="font-mono text-xs text-gray-500">{bat.id}</span>
														<span className="font-medium">{bat.serial_number}</span>
														{typeof bat.charge_level === "number" ? (
															<span className="text-gray-600">{bat.charge_level}%</span>
														) : null}
													</div>
												))
											)}
										</div>
									</div>
								))
							)}
						</div>
					</section>
				</>
			)}
		</div>
	);
}


