'use client';

import { useState, use } from 'react';
import { ArrowLeft, Play, Pause, Trash2, Mail, Users, BarChart3, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Mock data - replace with API calls
const mockCampaign = {
  id: '1',
  name: 'Fintech CTOs Q1 Outreach',
  status: 'active' as const,
  stats: { total: 150, sent: 45, opened: 23, replied: 8 },
  steps: [
    { id: '1', stepNumber: 1, delayDays: 0, subject: 'Quick question about {company}' },
    { id: '2', stepNumber: 2, delayDays: 3, subject: 'Following up' },
    { id: '3', stepNumber: 3, delayDays: 5, subject: 'Last try' },
  ],
  prospects: [
    { id: '1', name: 'John Smith', company: 'Acme Inc', title: 'CTO', email: 'john@acme.com', status: 'sent' },
    { id: '2', name: 'Sarah Johnson', company: 'Beta Corp', title: 'VP Engineering', email: 'sarah@beta.com', status: 'opened' },
    { id: '3', name: 'Mike Chen', company: 'Gamma LLC', title: 'CTO', email: 'mike@gamma.io', status: 'replied' },
    { id: '4', name: 'Lisa Park', company: 'Delta Inc', title: 'CTO', email: 'lisa@delta.com', status: 'pending' },
  ],
};

const statusColors = {
  pending: 'bg-surface-3 text-text-muted',
  sent: 'bg-blue-500/20 text-blue-400',
  opened: 'bg-yellow-500/20 text-yellow-400',
  replied: 'bg-green-500/20 text-green-400',
  bounced: 'bg-red-500/20 text-red-400',
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedProspect, setSelectedProspect] = useState(mockCampaign.prospects[0]);
  const [campaign] = useState(mockCampaign);
  // TODO: Fetch campaign by id from API

  return (
    <div className="min-h-screen bg-surface-1">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-lg hover:bg-surface-2 text-text-secondary">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">{campaign.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-surface-3 text-text-muted'
                }`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary transition-colors">
              {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {campaign.status === 'active' ? 'Pause' : 'Resume'}
            </button>
            <button className="p-2 rounded-lg bg-surface-2 hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Total', value: campaign.stats.total, icon: Users },
            { label: 'Sent', value: campaign.stats.sent, icon: Mail },
            { label: 'Opened', value: campaign.stats.opened, icon: BarChart3 },
            { label: 'Replied', value: campaign.stats.replied, icon: RefreshCw },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-2 rounded-xl p-4">
              <div className="flex items-center gap-2 text-text-muted mb-1">
                <stat.icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="flex">
        {/* Prospect List */}
        <div className="w-1/2 border-r border-white/5 p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">Prospects</h2>
          <div className="space-y-2">
            {campaign.prospects.map((prospect) => (
              <button
                key={prospect.id}
                onClick={() => setSelectedProspect(prospect)}
                className={`w-full text-left p-4 rounded-xl transition-colors ${
                  selectedProspect.id === prospect.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-surface-2 hover:bg-surface-3 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{prospect.name}</p>
                    <p className="text-sm text-text-secondary">{prospect.title} at {prospect.company}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[prospect.status as keyof typeof statusColors]}`}>
                    {prospect.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Email Preview */}
        <div className="w-1/2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-text-primary">Email Preview</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm transition-colors">
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
          
          <div className="bg-surface-2 rounded-xl p-6">
            <div className="mb-4">
              <p className="text-sm text-text-muted mb-1">To:</p>
              <p className="text-text-primary">{selectedProspect.email}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-text-muted mb-1">Subject:</p>
              <p className="text-text-primary font-medium">Quick question about {selectedProspect.company}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">Body:</p>
              <div className="text-text-primary whitespace-pre-wrap">
                Hi {selectedProspect.name.split(' ')[0]},

I noticed {selectedProspect.company} has been growing rapidly in the fintech space. As {selectedProspect.title}, you're probably dealing with scaling challenges.

We've helped similar companies reduce their outbound costs by 60% while increasing response rates.

Worth a quick chat?

Best,
[Your Name]
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Campaign Steps</h3>
            <div className="space-y-2">
              {campaign.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index === 0 ? 'bg-primary text-surface-1' : 'bg-surface-3 text-text-muted'
                  }`}>
                    {step.stepNumber}
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary text-sm">{step.subject}</p>
                    <p className="text-text-muted text-xs">
                      {step.delayDays === 0 ? 'Send immediately' : `Wait ${step.delayDays} days`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
