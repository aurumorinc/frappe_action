import { SiteAuth } from '../auth/index';

export interface Todo {
  name: string;
  description: string;
  status: string;
  priority: string;
  creation: string;
  modified: string;
  site?: SiteAuth;
  traceparent?: string;
  main?: string;
  compiled_json?: any; // ActionGraph
}

export interface TodoReport {
  totalOpen: number;
  completedToday: number;
}
