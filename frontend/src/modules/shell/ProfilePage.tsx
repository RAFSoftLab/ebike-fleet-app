import React from "react";
import { useProfile, useUpdateProfile } from "../users/useProfile";

export function ProfilePage() {
	const profileQuery = useProfile();
	const updateProfileMutation = useUpdateProfile();

	const [isEditing, setIsEditing] = React.useState(false);
	const [firstName, setFirstName] = React.useState("");
	const [lastName, setLastName] = React.useState("");
	const [phoneNumber, setPhoneNumber] = React.useState("");
	const [addressLine, setAddressLine] = React.useState("");

	// Initialize form fields when profile data loads
	React.useEffect(() => {
		if (profileQuery.data && !isEditing) {
			setFirstName(profileQuery.data.first_name || "");
			setLastName(profileQuery.data.last_name || "");
			setPhoneNumber(profileQuery.data.phone_number || "");
			setAddressLine(profileQuery.data.address_line || "");
		}
	}, [profileQuery.data, isEditing]);

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleCancel = () => {
		setIsEditing(false);
		// Reset form fields to current profile data
		if (profileQuery.data) {
			setFirstName(profileQuery.data.first_name || "");
			setLastName(profileQuery.data.last_name || "");
			setPhoneNumber(profileQuery.data.phone_number || "");
			setAddressLine(profileQuery.data.address_line || "");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await updateProfileMutation.mutateAsync({
			first_name: firstName.trim() || undefined,
			last_name: lastName.trim() || undefined,
			phone_number: phoneNumber.trim() || undefined,
			address_line: addressLine.trim() || undefined,
		});
		setIsEditing(false);
	};

	const isLoading = profileQuery.isLoading;
	const isError = profileQuery.isError;
	const profile = profileQuery.data;

	const displayName = profile
		? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "No name set"
		: "";

	if (isLoading) {
		return <p className="text-sm text-gray-600">Loading profile…</p>;
	}

	if (isError || !profile) {
		return <p className="text-sm text-red-600">Failed to load profile.</p>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">My Profile</h2>
				{!isEditing && (
					<button
						onClick={handleEdit}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
					>
						Edit Profile
					</button>
				)}
			</div>

			{isEditing ? (
				<form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label className="flex flex-col gap-1">
							<span className="text-xs text-gray-600 font-medium">First Name</span>
							<input
								type="text"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								className="border rounded px-3 py-2 text-sm"
								placeholder="Enter first name"
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span className="text-xs text-gray-600 font-medium">Last Name</span>
							<input
								type="text"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								className="border rounded px-3 py-2 text-sm"
								placeholder="Enter last name"
							/>
						</label>
					</div>

					<label className="flex flex-col gap-1">
						<span className="text-xs text-gray-600 font-medium">Phone Number</span>
						<input
							type="tel"
							value={phoneNumber}
							onChange={(e) => setPhoneNumber(e.target.value)}
							className="border rounded px-3 py-2 text-sm"
							placeholder="+1 555 123 4567"
						/>
					</label>

					<label className="flex flex-col gap-1">
						<span className="text-xs text-gray-600 font-medium">Address</span>
						<input
							type="text"
							value={addressLine}
							onChange={(e) => setAddressLine(e.target.value)}
							className="border rounded px-3 py-2 text-sm"
							placeholder="123 Main St, City, State"
						/>
					</label>

					<div className="flex gap-2 pt-2">
						<button
							type="submit"
							disabled={updateProfileMutation.isPending}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm font-medium"
						>
							{updateProfileMutation.isPending ? "Saving…" : "Save Changes"}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={updateProfileMutation.isPending}
							className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
						>
							Cancel
						</button>
					</div>

					{updateProfileMutation.isError && (
						<div className="text-xs text-red-600">
							Failed to update profile. Please try again.
						</div>
					)}
					{updateProfileMutation.isSuccess && (
						<div className="text-xs text-green-700">Profile updated successfully.</div>
					)}
				</form>
			) : (
				<div className="border rounded-md divide-y">
					<div className="px-4 py-3">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
								<span className="text-blue-600 font-semibold text-lg">
									{displayName.charAt(0).toUpperCase()}
								</span>
							</div>
							<div>
								<div className="font-semibold text-base">{displayName}</div>
								<div className="text-sm text-gray-600 capitalize">{profile.role}</div>
							</div>
						</div>
					</div>

					<div className="px-4 py-3 space-y-3">
						<div>
							<span className="text-xs text-gray-600 font-medium">First Name</span>
							<div className="text-sm mt-1">
								{profile.first_name || <span className="text-gray-400 italic">Not set</span>}
							</div>
						</div>

						<div>
							<span className="text-xs text-gray-600 font-medium">Last Name</span>
							<div className="text-sm mt-1">
								{profile.last_name || <span className="text-gray-400 italic">Not set</span>}
							</div>
						</div>

						<div>
							<span className="text-xs text-gray-600 font-medium">Phone Number</span>
							<div className="text-sm mt-1">
								{profile.phone_number || <span className="text-gray-400 italic">Not set</span>}
							</div>
						</div>

						<div>
							<span className="text-xs text-gray-600 font-medium">Address</span>
							<div className="text-sm mt-1">
								{profile.address_line || <span className="text-gray-400 italic">Not set</span>}
							</div>
						</div>

						<div className="pt-2 border-t">
							<span className="text-xs text-gray-600 font-medium">Profile ID</span>
							<div className="text-xs text-gray-500 mt-1 font-mono">{profile.id}</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

