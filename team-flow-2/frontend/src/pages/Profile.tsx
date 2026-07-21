import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { users } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import Avatar from "../components/Avatar";

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { addToast } = useToastStore();

  const updateProfile = useMutation({
    mutationFn: users.updateProfile,
    onSuccess: (data) => {
      setUser(data, localStorage.getItem("token")!);
      addToast("Profile updated successfully!");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to update profile", "error");
    },
  });

  const changePassword = useMutation({
    mutationFn: users.changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast("Password changed successfully!");
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.error || "Failed to change password", "error");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const data: { name?: string; email?: string } = {};
    if (name !== user?.name) data.name = name;
    if (email !== user?.email) data.email = email;
    if (Object.keys(data).length === 0) {
      setProfileMsg({ type: "error", text: "No changes to save" });
      return;
    }
    updateProfile.mutate(data);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your account details and password</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user?.name} size="lg" />
          <div>
            <p className="text-lg font-semibold text-surface-800">{user?.name} <span className="text-sm font-normal text-surface-400">({user?.email?.split('@')[0]?.toUpperCase()})</span></p>
            <p className="text-sm text-surface-500">{user?.email}</p>
            <span className="badge-blue text-xs mt-1 inline-block">{user?.role}</span>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <h2 className="section-title">Personal Information</h2>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="card">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <h2 className="section-title">Change Password</h2>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Current Password</label>
            <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">New Password</label>
            <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Confirm New Password</label>
            <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" className="btn-primary" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
