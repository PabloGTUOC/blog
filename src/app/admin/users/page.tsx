"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface FamilyUser {
  _id: string;
  email: string;
  name?: string;
  status: string;
}

export default function UserManagementPage() {
  const [pending, setPending] = useState<FamilyUser[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<FamilyUser[]>([]);

  useEffect(() => {
    fetch("/api/users?status=pending").then((r) => r.json()).then(setPending);
  }, []);

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/users?q=${encodeURIComponent(search)}`);
    setResults(await res.json());
  };

  const update = async (id: string, action: "approve" | "block") => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setPending((p) => p.filter((u) => u._id !== id));
    setResults((r) =>
      r.map((u) => (u._id === id ? { ...u, status: action === "approve" ? "approved" : "blocked" } : u))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="retro-title mb-2">Pending Requests</h1>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--subt)]">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((u) => (
              <Card key={u._id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.name || u.email}</div>
                  <div className="text-xs text-[var(--subt)]">{u.email}</div>
                </div>
                <div className="space-x-2">
                  <Button onClick={() => update(u._id, "approve")} variant="primary">
                    Approve
                  </Button>
                  <Button onClick={() => update(u._id, "block")}>Block</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="retro-title mb-2">Search Users</h2>
        <form onSubmit={doSearch} className="mb-4 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="retro-input flex-grow"
            placeholder="Email or name"
          />
          <Button type="submit">Search</Button>
        </form>
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((u) => (
              <Card key={u._id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.name || u.email}</div>
                  <div className="text-xs text-[var(--subt)]">
                    {u.email} – {u.status}
                  </div>
                </div>
                <div className="space-x-2">
                  {u.status !== "approved" && (
                    <Button onClick={() => update(u._id, "approve")} variant="primary">
                      Approve
                    </Button>
                  )}
                  {u.status !== "blocked" && (
                    <Button onClick={() => update(u._id, "block")}>Block</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
