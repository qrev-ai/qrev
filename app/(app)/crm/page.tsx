"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchInput, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { PeopleTable } from "@/components/crm/PeopleTable";
import { CompaniesTable } from "@/components/crm/CompaniesTable";
import { useAuthStore } from "@/store/auth-store";

export default function CrmPage() {
  const { activeWorkspaceId } = useAuthStore();
  const [people, setPeople] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const fetchPeople = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingPeople(true);
    try {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/crm/people?${params}`);
      if (res.ok) setPeople(await res.json());
    } catch {} finally {
      setLoadingPeople(false);
    }
  }, [activeWorkspaceId, search]);

  const fetchCompanies = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingCompanies(true);
    try {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/crm/companies?${params}`);
      if (res.ok) setCompanies(await res.json());
    } catch {} finally {
      setLoadingCompanies(false);
    }
  }, [activeWorkspaceId, search]);

  useEffect(() => {
    fetchPeople();
    fetchCompanies();
  }, [fetchPeople, fetchCompanies]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h1 className="text-lg font-semibold text-text-primary">CRM</h1>
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people or companies..."
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Tabs defaultTab="people">
          <TabList>
            <Tab value="people">People ({people.length})</Tab>
            <Tab value="companies">Companies ({companies.length})</Tab>
          </TabList>

          <TabPanel value="people" className="mt-4">
            <PeopleTable people={people} loading={loadingPeople} />
          </TabPanel>

          <TabPanel value="companies" className="mt-4">
            <CompaniesTable companies={companies} loading={loadingCompanies} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
