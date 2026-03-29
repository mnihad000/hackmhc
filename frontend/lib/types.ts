export interface Document {
  id: string;
  filename: string;
  category: string;
  page_count: number | null;
  created_at: string;
  uploaded_by: string;
  storage_path?: string;
  profiles?: { display_name: string };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string };
}

export interface ChatResponse {
  answer: string;
  sources: { document_id: string; filename: string }[];
  route_category?: Category;
}

export interface FamilyMember {
  id: string;
  display_name: string;
  role: "admin" | "member" | "child";
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  role: "admin" | "member" | "child";
  max_uses: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface FamilyWorkItem {
  id: string;
  family_id?: string;
  title: string;
  description: string;
  kind: "deadline" | "task";
  status: "todo" | "in_progress" | "done" | "overdue";
  priority: "low" | "medium" | "high";
  due_at: string | null;
  assigned_to: string | null;
  created_by?: string;
  completed_at?: string | null;
  created_at?: string;
  source?: "routine";
  cadence?: "daily" | "weekly" | "monthly";
}

export interface FamilyEvent {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  created_at?: string;
}

export interface RequiredDocTemplate {
  id: string;
  template_key: string;
  title: string;
  category: Category;
  description: string;
}

export interface FamilyRequiredDoc {
  id: string;
  enabled: boolean;
  completed: boolean;
  notes: string;
  required_doc_templates: RequiredDocTemplate;
}

export interface SuggestedAction {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  action_label: string;
  action_type: string;
}

export interface DashboardPayload {
  urgent_deadlines: FamilyWorkItem[];
  assigned_tasks: FamilyWorkItem[];
  upcoming_events: FamilyEvent[];
  missing_documents: FamilyRequiredDoc[];
  recent_uploads: Document[];
  ai_suggested_actions: SuggestedAction[];
}

export type Category =
  | "finance"
  | "education"
  | "medical"
  | "identity"
  | "legal"
  | "other";

export const CATEGORIES: Category[] = [
  "finance",
  "education",
  "medical",
  "identity",
  "legal",
  "other",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  finance: "bg-category-finance",
  education: "bg-category-education",
  medical: "bg-category-medical",
  identity: "bg-category-identity",
  legal: "bg-category-legal",
  other: "bg-category-other",
};
