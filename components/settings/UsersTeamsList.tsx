"use client";

import { Button, Badge, Avatar, Input } from "@/components/ui";
import { Plus, Mail } from "lucide-react";
import { useState } from "react";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface UsersTeamsListProps {
  members: Member[];
}

export function UsersTeamsList({ members }: UsersTeamsListProps) {
  const [inviteEmail, setInviteEmail] = useState("");

  return (
    <div className="max-w-2xl space-y-6">
      {/* Invite */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Invite Team Member
        </h3>
        <div className="flex items-center gap-3">
          <Input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@company.com"
            leftIcon={<Mail className="w-4 h-4" />}
            className="max-w-xs"
          />
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setInviteEmail("")}
          >
            Invite
          </Button>
        </div>
      </div>

      {/* Members list */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 bg-surface-2 border border-border-subtle rounded-lg"
            >
              <Avatar
                size="sm"
                src={member.image || undefined}
                fallback={member.name || member.email || "U"}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {member.name || member.email}
                </p>
                {member.name && (
                  <p className="text-xs text-text-muted">{member.email}</p>
                )}
              </div>
              <Badge
                variant={member.role === "ADMIN" ? "info" : "default"}
                size="sm"
              >
                {member.role === "ADMIN" ? "Admin" : "Member"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
