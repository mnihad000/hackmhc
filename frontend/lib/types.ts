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
