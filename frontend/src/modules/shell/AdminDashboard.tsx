import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api";

export function AdminDashboard() {
	// Fetch summary data for analytics
	const bikesQuery = useQuery({
		queryKey: ["bikes"],
		queryFn: async () => {
			const resp = await api.get("/fleet/bikes");
			return resp.data;
		},
	});

	const batteriesQuery = useQuery({
		queryKey: ["batteries"],
		queryFn: async () => {
			const resp = await api.get("/fleet/batteries");
			return resp.data;
		},
	});

	const driversQuery = useQuery({
		queryKey: ["drivers"],
		queryFn: async () => {
			const resp = await api.get("/fleet/drivers");
			return resp.data;
		},
	});

	const rentalsQuery = useQuery({
		queryKey: ["rentals"],
		queryFn: async () => {
			const resp = await api.get("/fleet/rentals");
			return resp.data;
		},
	});

	const isLoading = bikesQuery.isLoading || batteriesQuery.isLoading || driversQuery.isLoading || rentalsQuery.isLoading;
	const isError = bikesQuery.isError || batteriesQuery.isError || driversQuery.isError || rentalsQuery.isError;

	const bikes = bikesQuery.data ?? [];
	const batteries = batteriesQuery.data ?? [];
	const drivers = driversQuery.data ?? [];
	const rentals = rentalsQuery.data ?? [];

	const activeRentals = rentals.filter((r: any) => !r.end_date).length;
	const assignedBikes = bikes.filter((b: any) => b.assigned_profile_id).length;

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">Dashboard</h2>
			{isLoading ? (
				<p className="text-sm text-gray-600">Loading data…</p>
			) : isError ? (
				<p className="text-sm text-red-600">Failed to load data.</p>
			) : (
				<div className="space-y-6">
					{/* Summary Cards */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="border rounded-lg p-4 bg-white">
							<div className="text-sm text-gray-600">Total Bikes</div>
							<div className="text-2xl font-semibold mt-1">{bikes.length}</div>
							<div className="text-xs text-gray-500 mt-1">{assignedBikes} assigned</div>
						</div>
						<div className="border rounded-lg p-4 bg-white">
							<div className="text-sm text-gray-600">Total Batteries</div>
							<div className="text-2xl font-semibold mt-1">{batteries.length}</div>
						</div>
						<div className="border rounded-lg p-4 bg-white">
							<div className="text-sm text-gray-600">Total Drivers</div>
							<div className="text-2xl font-semibold mt-1">{drivers.length}</div>
						</div>
						<div className="border rounded-lg p-4 bg-white">
							<div className="text-sm text-gray-600">Active Rentals</div>
							<div className="text-2xl font-semibold mt-1">{activeRentals}</div>
							<div className="text-xs text-gray-500 mt-1">{rentals.length} total</div>
						</div>
					</div>

					{/* Analytics Placeholder */}
					<div className="border rounded-lg p-6 bg-white">
						<h3 className="font-semibold mb-4">Analytics & Reports</h3>
						<div className="text-sm text-gray-600 space-y-2">
							<p>Analytics and reporting features will be available here.</p>
							<p className="text-xs text-gray-500">
								Future features may include:
							</p>
							<ul className="text-xs text-gray-500 list-disc list-inside space-y-1 ml-2">
								<li>Rental trends and statistics</li>
								<li>Bike utilization reports</li>
								<li>Battery health monitoring</li>
								<li>Driver activity summaries</li>
								<li>Custom date range reports</li>
							</ul>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
