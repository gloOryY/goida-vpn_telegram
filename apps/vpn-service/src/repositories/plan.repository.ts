import sql from '../db/client';

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_kopeks: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function findAllActivePlans(): Promise<Plan[]> {
  return sql<Plan[]>`
    SELECT id, name, description, price_kopeks, duration_days, is_active,
           created_at::text, updated_at::text
    FROM plans
    WHERE is_active = true
    ORDER BY price_kopeks ASC
  `;
}

export async function findPlanById(id: string): Promise<Plan | null> {
  const [plan] = await sql<Plan[]>`
    SELECT id, name, description, price_kopeks, duration_days, is_active,
           created_at::text, updated_at::text
    FROM plans WHERE id = ${id}
  `;
  return plan ?? null;
}
