export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'Manager' | 'Rep';
  organizationId: string;
}

export interface Territory {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  boundary: any; // GeoJSON Polygon or MultiPolygon
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  streetAddress: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  status: 'New' | 'Contacted' | 'Hot Lead' | 'Not Interested' | 'Completed';
  notes?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  createdAt: string;
  updatedAt: string;
}
