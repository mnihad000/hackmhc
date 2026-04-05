"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { Family, FamilyMember, InviteCode } from "@/lib/types";

export default function FamilyPage() {
  const { token, signOut } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [hasFamily, setHasFamily] = useState(true);
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "child">("member");
  const [inviteHours, setInviteHours] = useState(24);
  const [inviteUses, setInviteUses] = useState(1);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");

  const loadFamilyData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const familyData = await apiFetch("/api/family", {}, token);
      setFamily(familyData.family);
      setMembers(familyData.members || []);
      setHasFamily(true);
      try {
        const inviteData = await apiFetch("/api/auth/invite-codes", {}, token);
        setInviteCodes(inviteData.invite_codes || []);
      } catch {
        setInviteCodes([]);
      }
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized")) {
        await signOut();
        return;
      }
      if (msg.includes("404") || msg.includes("not in a family")) {
        setHasFamily(false);
        setFamily(null);
        setMembers([]);
        setInviteCodes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  const reloadInviteCodes = async () => {
    if (!token) return;
    try {
      const data = await apiFetch("/api/auth/invite-codes", {}, token);
      setInviteCodes(data.invite_codes || []);
    } catch {
      // Ignore for non-privileged roles.
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!token) return;
    try {
      await apiFetch(
        `/api/family/members/${memberId}`,
        { method: "PATCH", body: JSON.stringify({ role: newRole }) },
        token
      );
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole as any } : m))
      );
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized")) {
        await signOut();
        return;
      }
      alert(err.message);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!token) return;
    if (!confirm("Remove this member from your family?")) return;
    try {
      await apiFetch(
        `/api/family/members/${memberId}`,
        { method: "DELETE" },
        token
      );
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized")) {
        await signOut();
        return;
      }
      alert(err.message);
    }
  };

  const createInviteCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || inviteLoading) return;
    setInviteLoading(true);
    try {
      const data = await apiFetch(
        "/api/auth/invite-code",
        {
          method: "POST",
          body: JSON.stringify({
            role: inviteRole,
            expires_in_hours: inviteHours,
            max_uses: inviteUses,
          }),
        },
        token
      );
      setLatestCode(data.code);
      await reloadInviteCodes();
    } catch (err: any) {
      alert(err.message || "Failed to create invite code");
    } finally {
      setInviteLoading(false);
    }
  };

  const joinFamilyWithCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !joinCode.trim() || joinLoading) return;
    setJoinLoading(true);
    setJoinMessage("");
    try {
      await apiFetch(
        "/api/auth/join-family",
        {
          method: "POST",
          body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
        },
        token
      );
      setJoinCode("");
      setJoinMessage("Joined family successfully.");
      await loadFamilyData();
    } catch (err: any) {
      setJoinMessage(err.message || "Could not join family.");
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-100 p-4">
        <div className="mx-auto flex h-full w-full max-w-[1560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Header />
          <div className="p-6">
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-amber-100 text-amber-800",
      member: "bg-blue-100 text-blue-800",
      child: "bg-green-100 text-green-800",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          colors[role] || "bg-gray-100 text-gray-800"
        }`}
      >
        {role}
      </span>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 p-4">
      <div className="mx-auto flex h-full w-full max-w-[1560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <h2 className="mb-1 text-2xl font-bold text-slate-900">
            {family?.name || "Your Family"}
          </h2>
          <p className="mb-6 text-slate-500">{members.length} members</p>

          {!hasFamily && (
            <section className="mb-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Join Family by Invite Code</h3>
              <p className="mb-3 text-sm text-slate-500">
                Enter a code from a family admin/member to join their FamilyOS.
              </p>
              <form onSubmit={joinFamilyWithCode} className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Invite code"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-wider"
                />
                <button
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={joinLoading || !joinCode.trim()}
                >
                  {joinLoading ? "Joining..." : "Join"}
                </button>
              </form>
              {joinMessage && (
                <p className="mt-2 text-sm text-slate-700">{joinMessage}</p>
              )}
            </section>
          )}

          {hasFamily && (
            <>

          <section className="mb-6 grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">Add People by Invite Code</h3>
              <form onSubmit={createInviteCode} className="grid gap-2 text-sm md:grid-cols-4">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "child")}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="member">Member</option>
                  <option value="child">Child</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={inviteHours}
                  onChange={(e) => setInviteHours(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Hours"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={inviteUses}
                  onChange={(e) => setInviteUses(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Uses"
                />
                <button className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-60" disabled={inviteLoading}>
                  {inviteLoading ? "Generating..." : "Generate Code"}
                </button>
              </form>
              {latestCode && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700">Latest invite code</p>
                  <p className="text-xl font-bold tracking-wide text-emerald-900">{latestCode}</p>
                  <button
                    className="mt-2 rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800"
                    onClick={() => navigator.clipboard.writeText(latestCode)}
                  >
                    Copy
                  </button>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">Recent Invite Codes</h3>
              <ul className="space-y-2 text-sm">
                {inviteCodes.length === 0 && <li className="text-slate-500">No invite codes yet.</li>}
                {inviteCodes.map((code) => (
                  <li key={code.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold tracking-wide text-slate-900">{code.code}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${code.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                        {code.is_active ? "active" : "inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      role: {code.role} | used: {code.used_count}/{code.max_uses} | expires: {new Date(code.expires_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {member.display_name}
                    </td>
                    <td className="px-6 py-4">{roleBadge(member.role)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value)
                        }
                        className="mr-2 rounded border border-slate-200 px-2 py-1 text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="child">Child</option>
                      </select>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
