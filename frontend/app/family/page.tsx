"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { Family, FamilyMember } from "@/lib/types";

export default function FamilyPage() {
  const { token, signOut } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch("/api/family", {}, token)
      .then((data) => {
        setFamily(data.family);
        setMembers(data.members);
      })
      .catch(async (err: any) => {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("401") || msg.includes("unauthorized")) {
          await signOut();
        }
      })
      .finally(() => setLoading(false));
  }, [token, signOut]);

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

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
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
    <div>
      <h2 className="mb-1 text-2xl font-bold text-slate-900">
        {family?.name || "Your Family"}
      </h2>
      <p className="mb-8 text-slate-500">{members.length} members</p>

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
    </div>
  );
}
