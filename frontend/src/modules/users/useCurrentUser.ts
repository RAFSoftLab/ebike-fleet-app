import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api";

export type CurrentUser = {
	id: string;
	role: "admin" | "driver";
	name?: string;
};

export function useCurrentUser() {
	return useQuery<CurrentUser>({
		queryKey: ["me"],
		queryFn: async () => {
			const resp = await api.get("/auth/me/profile");
			return resp.data as CurrentUser;
		},
		staleTime: 60_000,
	});
}


