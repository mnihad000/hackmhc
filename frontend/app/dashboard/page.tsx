"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { DashboardPayload, InviteCode } from "@/lib/types";

const EMPTY_DASHBOARD: DashboardPayload = {
  urgent_deadlines: [],
  assigned_tasks: [],
  upcoming_events: [],
  missing_documents: [],
  recent_uploads: [],
  ai_suggested_actions: [],
};

function daysUntil(dateStr: string | null | undefined): string {
  if (!dateStr) return "No due date";
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} day(s) overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} day(s)`;
}

export default function DashboardPage() {
  const { token, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardPayload>(EMPTY_DASHBOARD);
  const [invite, setInvite] = useState<InviteCode | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "child">("member");
  const [inviteHours, setInviteHours] = useState(24);
  const [inviteUses, setInviteUses] = useState(1);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemKind, setNewItemKind] = useState<"deadline" | "task">("deadline");
  const [newItemDue, setNewItemDue] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStart, setNewEventStart] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const data: DashboardPayload = await apiFetch("/api/dashboard", {}, token);
      setDashboard(data);
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("401") || msg.includes("unauthorized")) {
        await signOut();
      }
    } finally {
      setLoading(false);
    }
  }, [token, signOut]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const generateInviteCode = async (event: FormEvent) => {
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
      setInvite(data);
    } catch (err: any) {
      alert(err.message || "Could not generate invite code");
    } finally {
      setInviteLoading(false);
    }
  };

  const createWorkItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !newItemTitle.trim()) return;
    try {
      await apiFetch(
        "/api/family/work-items",
        {
          method: "POST",
          body: JSON.stringify({
            title: newItemTitle,
            kind: newItemKind,
            priority: "medium",
            due_at: newItemDue ? new Date(newItemDue).toISOString() : null,
          }),
        },
        token
      );
      setNewItemTitle("");
      setNewItemDue("");
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || "Could not create item");
    }
  };

  const createEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !newEventTitle.trim() || !newEventStart) return;
    try {
      await apiFetch(
        "/api/family/events",
        {
          method: "POST",
          body: JSON.stringify({
            title: newEventTitle,
            starts_at: new Date(newEventStart).toISOString(),
          }),
        },
        token
      );
      setNewEventTitle("");
      setNewEventStart("");
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || "Could not create event");
    }
  };

  const markRequiredDocDone = async (id: string) => {
    if (!token) return;
    await apiFetch(
      `/api/family/required-docs/${id}`,
      { method: "PATCH", body: JSON.stringify({ completed: true }) },
      token
    );
    await loadDashboard();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 p-4">
      <div className="mx-auto flex h-full w-full max-w-[1560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            <div className="space-y-5">
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase text-red-700">Urgent deadlines</p>
                  <p className="mt-2 text-3xl font-bold text-red-900">{dashboard.urgent_deadlines.length}</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase text-blue-700">Assigned tasks</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">{dashboard.assigned_tasks.length}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase text-amber-700">Missing documents</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{dashboard.missing_documents.length}</p>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Urgent deadlines</h3>
                  <ul className="space-y-2 text-sm">
                    {dashboard.urgent_deadlines.length === 0 && <li className="text-slate-500">No urgent deadlines.</li>}
                    {dashboard.urgent_deadlines.map((item) => (
                      <li key={item.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{daysUntil(item.due_at)}</p>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Assigned tasks</h3>
                  <ul className="space-y-2 text-sm">
                    {dashboard.assigned_tasks.length === 0 && <li className="text-slate-500">No assigned tasks.</li>}
                    {dashboard.assigned_tasks.map((item) => (
                      <li key={`${item.source || "work"}-${item.id}`} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{daysUntil(item.due_at)}</p>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Upcoming events</h3>
                  <ul className="space-y-2 text-sm">
                    {dashboard.upcoming_events.length === 0 && <li className="text-slate-500">No upcoming events.</li>}
                    {dashboard.upcoming_events.map((event) => (
                      <li key={event.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{event.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(event.starts_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>

              <section className="grid gap-5 xl:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Missing documents</h3>
                  <ul className="space-y-2 text-sm">
                    {dashboard.missing_documents.length === 0 && <li className="text-slate-500">Checklist complete.</li>}
                    {dashboard.missing_documents.map((doc) => (
                      <li key={doc.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{doc.required_doc_templates.title}</p>
                        <p className="text-xs text-slate-500">{doc.required_doc_templates.description}</p>
                        <button
                          className="mt-2 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                          onClick={() => markRequiredDocDone(doc.id)}
                        >
                          Mark complete
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Recent uploads</h3>
                  <ul className="space-y-2 text-sm">
                    {dashboard.recent_uploads.length === 0 && <li className="text-slate-500">No recent uploads.</li>}
                    {dashboard.recent_uploads.map((doc) => (
                      <li key={doc.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{doc.filename}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(doc.created_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">AI suggested actions</h3>
                  <ul className="space-y-2 text-sm">
                    {dashboard.ai_suggested_actions.length === 0 && <li className="text-slate-500">No suggestions right now.</li>}
                    {dashboard.ai_suggested_actions.map((action) => (
                      <li key={action.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{action.title}</p>
                        <p className="text-xs text-slate-500">{action.reason}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              </section>

              <section className="grid gap-5 xl:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Quick add deadline/task</h3>
                  <form onSubmit={createWorkItem} className="space-y-2 text-sm">
                    <input
                      value={newItemTitle}
                      onChange={(e) => setNewItemTitle(e.target.value)}
                      placeholder="Task title"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <select
                      value={newItemKind}
                      onChange={(e) => setNewItemKind(e.target.value as "deadline" | "task")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="deadline">Deadline</option>
                      <option value="task">Task</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={newItemDue}
                      onChange={(e) => setNewItemDue(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <button className="rounded-lg bg-slate-900 px-3 py-2 text-white">Save</button>
                  </form>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Quick add event</h3>
                  <form onSubmit={createEvent} className="space-y-2 text-sm">
                    <input
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="Event title"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <input
                      type="datetime-local"
                      value={newEventStart}
                      onChange={(e) => setNewEventStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <button className="rounded-lg bg-slate-900 px-3 py-2 text-white">Save</button>
                  </form>
                </article>

                <article className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Add person by invite code</h3>
                  <form onSubmit={generateInviteCode} className="space-y-2 text-sm">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "child")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
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
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Expires in hours"
                    />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={inviteUses}
                      onChange={(e) => setInviteUses(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Max uses"
                    />
                    <button disabled={inviteLoading} className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-60">
                      {inviteLoading ? "Generating..." : "Generate code"}
                    </button>
                  </form>
                  {invite?.code && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase text-emerald-700">Invite code</p>
                      <p className="mt-1 text-xl font-bold tracking-wide text-emerald-900">{invite.code}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(invite.code)}
                        className="mt-2 rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800"
                      >
                        Copy code
                      </button>
                    </div>
                  )}
                </article>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
