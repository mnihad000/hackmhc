"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../layout";
import { apiFetch } from "@/lib/api";
import { Family, FamilyMember } from "@/lib/types";

export default function FamilyPage() {
  const { token } = useAuth();
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await apiFetch(
        `/api/family/members/${memberId}`,
        { method: "PATCH", body: JSON.stringify({ role: newRole }) },
        token!
      );
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole as any } : m))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member from your family?")) return;
    try {
      await apiFetch(
        `/api/family/members/${memberId}`,
        { method: "DELETE" },
        token!
      );
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
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
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        {family?.name || "Your Family"}
      </h2>
      <p className="text-gray-500 mb-8">{members.length} members</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Joined
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {member.display_name}
                </td>
                <td className="px-6 py-4">{roleBadge(member.role)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.id, e.target.value)
                    }
                    className="text-sm border border-gray-200 rounded px-2 py-1 mr-2"
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
