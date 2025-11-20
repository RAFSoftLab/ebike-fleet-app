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

	const financialAnalyticsQuery = useQuery({
		queryKey: ["financial-analytics"],
		queryFn: async () => {
			const resp = await api.get("/fleet/analytics/financial");
			return resp.data;
		},
	});

	const maintenanceQuery = useQuery({
		queryKey: ["maintenance"],
		queryFn: async () => {
			const resp = await api.get("/fleet/maintenance");
			return resp.data;
		},
	});

	const isLoading = bikesQuery.isLoading || batteriesQuery.isLoading || driversQuery.isLoading || rentalsQuery.isLoading || financialAnalyticsQuery.isLoading || maintenanceQuery.isLoading;
	const isError = bikesQuery.isError || batteriesQuery.isError || driversQuery.isError || rentalsQuery.isError || financialAnalyticsQuery.isError || maintenanceQuery.isError;

	const bikes = bikesQuery.data ?? [];
	const batteries = batteriesQuery.data ?? [];
	const drivers = driversQuery.data ?? [];
	const rentals = rentalsQuery.data ?? [];
	const financialAnalytics = financialAnalyticsQuery.data;
	const maintenanceRecords = maintenanceQuery.data ?? [];

	const activeRentals = rentals.filter((r: any) => !r.end_date).length;
	const assignedBikes = bikes.filter((b: any) => b.assigned_profile_id).length;
	
	// Financial summary
	const totalIncome = financialAnalytics?.summary?.total_income ?? "0";
	const totalExpenses = financialAnalytics?.summary?.total_expenses ?? "0";
	const netProfit = financialAnalytics?.summary?.net_profit ?? "0";
	const incomeCount = financialAnalytics?.summary?.income_count ?? 0;
	const expenseCount = financialAnalytics?.summary?.expense_count ?? 0;

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

					{/* Financial Analytics */}
					<div className="border rounded-lg p-6 bg-white">
						<h3 className="font-semibold mb-4">Financial Overview</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							<div className="border rounded-lg p-4 bg-green-50">
								<div className="text-sm text-gray-600">Total Income</div>
								<div className="text-2xl font-semibold mt-1 text-green-700">
									${parseFloat(totalIncome).toFixed(2)}
								</div>
								<div className="text-xs text-gray-500 mt-1">{incomeCount} transactions</div>
							</div>
							<div className="border rounded-lg p-4 bg-red-50">
								<div className="text-sm text-gray-600">Total Expenses</div>
								<div className="text-2xl font-semibold mt-1 text-red-700">
									${parseFloat(totalExpenses).toFixed(2)}
								</div>
								<div className="text-xs text-gray-500 mt-1">{expenseCount} transactions</div>
							</div>
							<div className={`border rounded-lg p-4 ${parseFloat(netProfit) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
								<div className="text-sm text-gray-600">Net Profit</div>
								<div className={`text-2xl font-semibold mt-1 ${parseFloat(netProfit) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
									${parseFloat(netProfit).toFixed(2)}
								</div>
								<div className="text-xs text-gray-500 mt-1">All time</div>
							</div>
						</div>
						{financialAnalytics?.transactions && financialAnalytics.transactions.length > 0 && (
							<div className="mt-4">
								<h4 className="text-sm font-semibold mb-2">Recent Transactions</h4>
								<div className="overflow-x-auto">
									<table className="min-w-full text-sm">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-4 py-2 text-left">Date</th>
												<th className="px-4 py-2 text-left">Type</th>
												<th className="px-4 py-2 text-left">Description</th>
												<th className="px-4 py-2 text-right">Amount</th>
											</tr>
										</thead>
										<tbody>
											{financialAnalytics.transactions.slice(0, 10).map((tx: any) => (
												<tr key={tx.id} className="border-t">
													<td className="px-4 py-2">{new Date(tx.transaction_date).toLocaleDateString()}</td>
													<td className="px-4 py-2">
														<span className={`px-2 py-1 rounded text-xs ${
															tx.transaction_type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
														}`}>
															{tx.transaction_type}
														</span>
													</td>
													<td className="px-4 py-2">{tx.description || '-'}</td>
													<td className={`px-4 py-2 text-right font-semibold ${
														tx.transaction_type === 'income' ? 'text-green-700' : 'text-red-700'
													}`}>
														{tx.transaction_type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>

					{/* Maintenance Records */}
					<div className="border rounded-lg p-6 bg-white">
						<h3 className="font-semibold mb-4">Recent Maintenance</h3>
						{maintenanceRecords.length > 0 ? (
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50">
										<tr>
											<th className="px-4 py-2 text-left">Date</th>
											<th className="px-4 py-2 text-left">Item</th>
											<th className="px-4 py-2 text-left">Description</th>
											<th className="px-4 py-2 text-left">Performed By</th>
											<th className="px-4 py-2 text-right">Cost</th>
										</tr>
									</thead>
									<tbody>
										{maintenanceRecords.slice(0, 10).map((record: any) => (
											<tr key={record.id} className="border-t">
												<td className="px-4 py-2">{new Date(record.service_date).toLocaleDateString()}</td>
												<td className="px-4 py-2">
													{record.bike_id ? 'Bike' : record.battery_id ? 'Battery' : '-'}
												</td>
												<td className="px-4 py-2">{record.description}</td>
												<td className="px-4 py-2 text-right font-semibold text-red-700">
													${parseFloat(record.cost).toFixed(2)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-sm text-gray-600">No maintenance records found.</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
