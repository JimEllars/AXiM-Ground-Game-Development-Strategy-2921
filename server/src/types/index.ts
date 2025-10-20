export interface User {
  id: string;
  organization_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'MANAGER' | 'REP';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Lead {
  id: string;
  organization_id: string;
  first_name?: string;
  last_name?: string;
  street_address: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  status: string;
  notes?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  created_at: Date;
  updated_at: Date;
}

export interface Territory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  boundary: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Interaction {
  id: string;
  lead_id: string;
  user_id: string;
  outcome: string;
  notes?: string;
  interaction_date: Date;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  synced_at?: Date;
  created_at: Date;
}

export interface AuthRequest extends Express.Request {
  user?: User;
}