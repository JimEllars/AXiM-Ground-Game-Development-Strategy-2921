export interface Territory {
  id: string;
  name: string;
  description: string;
  boundary: any;
  user_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'rep';
  organization_id: string;
  created_at: string;
  updated_at: string;
}
