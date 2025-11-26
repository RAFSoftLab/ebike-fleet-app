import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api";

export type UserProfile = {
	id: string;
	user_id: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	address_line?: string;
	role: "admin" | "driver";
};

export type UserProfileUpdate = {
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	address_line?: string;
};

export function useProfile() {
	return useQuery<UserProfile>({
		queryKey: ["profile"],
		queryFn: async () => {
			const resp = await api.get("/auth/me/profile");
			return resp.data as UserProfile;
		},
		staleTime: 60_000,
	});
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();
	
	return useMutation<UserProfile, Error, UserProfileUpdate>({
		mutationFn: async (update: UserProfileUpdate) => {
			const resp = await api.put("/auth/me/profile", update);
			return resp.data as UserProfile;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			queryClient.invalidateQueries({ queryKey: ["me"] });
		},
	});
}

