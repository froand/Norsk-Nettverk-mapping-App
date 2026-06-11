export interface Person {
  id: string;
  name: string;
  type: 'person';
}

export interface Organization {
  id: string;
  name: string;
  type: 'company' | 'political_party' | 'government_body';
  orgNumber?: string;
}

export interface Role {
  id: string;
  personId: string;
  organizationId: string;
  role: string;
  category: 'board' | 'political' | 'government' | 'executive';
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export type GraphNode = {
  id: string;
  name: string;
  type: 'person' | 'company' | 'political_party' | 'government_body';
  group: string;
  imageUrl?: string;
  meta?: {
    party?: string;
    fylke?: string;
    stortingetId?: string;
  };
};

export type GraphLink = {
  source: string;
  target: string;
  label: string;
  category: Role['category'];
};

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
