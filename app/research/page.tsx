'use client';

import { useState } from 'react';
import { Search, Upload, Sparkles, Building2, User, Newspaper, Lightbulb, RefreshCw } from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  researchStatus: 'pending' | 'researching' | 'completed' | 'failed';
  research?: {
    company: { summary: string; industry: string; size: string; funding?: string };
    person: { background: string; interests: string[] };
    insights: string[];
    researchedAt: string;
  };
}

const mockProspects: Prospect[] = [
  {
    id: '1',
    name: 'John Smith',
    company: 'Acme Inc',
    title: 'CTO',
    email: 'john@acme.com',
    researchStatus: 'completed',
    research: {
      company: {
        summary: 'Acme Inc is a B2B SaaS company focused on developer tools.',
        industry: 'Software',
        size: '50-200 employees',
        funding: 'Series B - $25M',
      },
      person: {
        background: 'Former engineering lead at Google. Stanford CS grad.',
        interests: ['AI/ML', 'Developer Experience', 'Open Source'],
      },
      insights: [
        'Recently expanded engineering team by 40%',
        'Active in the developer community on Twitter',
        'Spoke at KubeCon last month',
      ],
      researchedAt: '2024-01-15T10:30:00Z',
    },
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    company: 'Beta Corp',
    title: 'VP Engineering',
    email: 'sarah@beta.com',
    researchStatus: 'pending',
  },
  {
    id: '3',
    name: 'Mike Chen',
    company: 'Gamma LLC',
    title: 'CTO',
    email: 'mike@gamma.io',
    researchStatus: 'researching',
  },
];

export default function ResearchPage() {
  const [prospects, setProspects] = useState<Prospect[]>(mockProspects);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(mockProspects[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleResearch = async (prospectId: string) => {
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, researchStatus: 'researching' as const } : p))
    );

    // Simulate API call
    setTimeout(() => {
      setProspects((prev) =>
        prev.map((p) =>
          p.id === prospectId
            ? {
                ...p,
                researchStatus: 'completed' as const,
                research: {
                  company: { summary: 'AI-generated company summary...', industry: 'Technology', size: '100-500' },
                  person: { background: 'AI-generated background...', interests: ['Tech', 'Innovation'] },
                  insights: ['Key insight 1', 'Key insight 2'],
                  researchedAt: new Date().toISOString(),
                },
              }
            : p
        )
      );
    }, 2000);
  };

  const handleResearchAll = () => {
    prospects
      .filter((p) => p.researchStatus === 'pending')
      .forEach((p) => handleResearch(p.id));
  };

  const statusStyles = {
    pending: 'bg-surface-3 text-text-muted',
    researching: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-surface-1 flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h1 className="text-lg font-semibold text-text-primary mb-4">Research Agents</h1>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search prospects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm transition-colors">
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
            <button
              onClick={handleResearchAll}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-surface-1 text-sm transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Research All
            </button>
          </div>
        </div>

        {/* Prospect List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {prospects.map((prospect) => (
            <button
              key={prospect.id}
              onClick={() => setSelectedProspect(prospect)}
              className={`w-full text-left p-3 rounded-xl transition-colors ${
                selectedProspect?.id === prospect.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-surface-2 hover:bg-surface-3 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-text-primary">{prospect.name}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusStyles[prospect.researchStatus]}`}>
                  {prospect.researchStatus}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{prospect.title}</p>
              <p className="text-sm text-text-muted">{prospect.company}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {selectedProspect ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">{selectedProspect.name}</h2>
                <p className="text-text-secondary">{selectedProspect.title} at {selectedProspect.company}</p>
              </div>
              <button
                onClick={() => handleResearch(selectedProspect.id)}
                disabled={selectedProspect.researchStatus === 'researching'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-surface-1 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${selectedProspect.researchStatus === 'researching' ? 'animate-spin' : ''}`} />
                {selectedProspect.researchStatus === 'researching' ? 'Researching...' : 'Research'}
              </button>
            </div>

            {selectedProspect.research ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Company */}
                <div className="bg-surface-2 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-text-primary">Company</h3>
                  </div>
                  <p className="text-text-secondary mb-4">{selectedProspect.research.company.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-lg bg-surface-3 text-text-secondary text-sm">
                      {selectedProspect.research.company.industry}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-surface-3 text-text-secondary text-sm">
                      {selectedProspect.research.company.size}
                    </span>
                    {selectedProspect.research.company.funding && (
                      <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm">
                        {selectedProspect.research.company.funding}
                      </span>
                    )}
                  </div>
                </div>

                {/* Person */}
                <div className="bg-surface-2 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-text-primary">Person</h3>
                  </div>
                  <p className="text-text-secondary mb-4">{selectedProspect.research.person.background}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProspect.research.person.interests.map((interest) => (
                      <span key={interest} className="px-2 py-1 rounded-lg bg-primary/20 text-primary text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <div className="col-span-2 bg-surface-2 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-text-primary">Key Insights</h3>
                  </div>
                  <ul className="space-y-2">
                    {selectedProspect.research.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-text-secondary">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">No Research Yet</h3>
                <p className="text-text-secondary mb-4">Click "Research" to gather intel on this prospect</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted">
            Select a prospect to view research
          </div>
        )}
      </div>
    </div>
  );
}
