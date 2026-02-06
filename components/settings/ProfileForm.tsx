"use client";

import { Input, Button, Avatar } from "@/components/ui";

interface ProfileFormProps {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Avatar
          size="xl"
          src={user.image || undefined}
          fallback={user.name || user.email || "U"}
        />
        <div>
          <p className="text-sm font-medium text-text-primary">
            {user.name || "No name set"}
          </p>
          <p className="text-xs text-text-muted">{user.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Full Name
          </label>
          <Input defaultValue={user.name || ""} placeholder="Your name" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Email
          </label>
          <Input defaultValue={user.email || ""} disabled />
          <p className="text-xs text-text-muted">
            Email is managed by your Google account.
          </p>
        </div>
      </div>

      <Button size="sm">Save Changes</Button>
    </div>
  );
}
