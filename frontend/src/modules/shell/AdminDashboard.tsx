import React from "react";
import { useQuery } from "@tanstack/react-query";
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


