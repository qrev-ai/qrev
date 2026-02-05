import { 
  User, 
  Workspace, 
  WorkspaceMember, 
  Campaign, 
  CampaignStep, 
  Prospect, 
  CampaignProspect,
  CampaignStatus,
  ProspectStatus,
  WorkspaceRole
} from "@prisma/client"

export { CampaignStatus, ProspectStatus, WorkspaceRole }

export type UserWithWorkspaces = User & {
  workspaces: (WorkspaceMember & {
    workspace: Workspace
  })[]
}

export type WorkspaceWithRelations = Workspace & {
  members: (WorkspaceMember & {
    user: Pick<User, "id" | "name" | "email" | "image">
  })[]
  campaigns: Campaign[]
  prospects: Prospect[]
}

export type CampaignWithRelations = Campaign & {
  steps: CampaignStep[]
  prospects: (CampaignProspect & {
    prospect: Prospect
  })[]
}

export interface ProspectResearch {
  summary?: string
  recentActivity?: string[]
  interests?: string[]
  painPoints?: string[]
  icebreakers?: string[]
  lastUpdated?: string
}

export interface PersonalizedEmail {
  stepNumber: number
  subject: string
  body: string
  generatedAt: string
}

export type CampaignProspectWithEmails = CampaignProspect & {
  personalizedEmails: PersonalizedEmail[] | null
  prospect: Prospect
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateWorkspaceInput {
  name: string
}

export interface CreateCampaignInput {
  name: string
  description?: string
  workspaceId: string
}

export interface CreateCampaignStepInput {
  campaignId: string
  stepNumber: number
  delayDays: number
  subjectTemplate: string
  bodyTemplate: string
}

export interface CreateProspectInput {
  workspaceId: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  title?: string
  linkedinUrl?: string
}

export interface AddProspectToCampaignInput {
  campaignId: string
  prospectId: string
}
