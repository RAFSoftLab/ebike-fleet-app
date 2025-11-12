import React from "react";
import { useCurrentUser } from "../users/useCurrentUser";
import { AdminDashboard } from "./AdminDashboard";
import { DriverDashboard } from "./DriverDashboard";

export function Dashboard() {
	const { data: me, isLoading, isError } = useCurrentUser();

	if (isLoading) {
		return <p className="text-sm text-gray-600">Loading…</p>;
	}
	if (isError || !me) {
		return <p className="text-sm text-red-600">Unable to load user.</p>;
	}

	if (me.role === "admin") {
		return <AdminDashboard />;
	}
	return <DriverDashboard />;
}

