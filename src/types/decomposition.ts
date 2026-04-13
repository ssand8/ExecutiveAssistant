// Types matching the Edge Function's create_plan tool output

export interface DecomposedTask {
  title: string;
  description?: string;
  due_date: string; // YYYY-MM-DD
  estimated_minutes?: number;
  priority: 1 | 2 | 3 | 4;
}

export interface DecomposedProject {
  title: string;
  description?: string;
  target_date: string; // YYYY-MM-DD
  tasks: DecomposedTask[];
}

export interface DecompositionResult {
  summary: string;
  projects: DecomposedProject[];
}
