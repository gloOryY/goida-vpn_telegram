import sql from '../db/client';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  server_id: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VpnKey {
  id: string;
  subscription_id: string;
  server_id: string;
  outline_key_id: string | null;
  access_key: string;
  is_active: boolean;
  created_at: string;
}

export async function findSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
  return sql<Subscription[]>`
    SELECT id, user_id, plan_id, server_id, status,
           starts_at::text, expires_at::text,
           created_at::text, updated_at::text
    FROM subscriptions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function findActiveSubscription(userId: string): Promise<Subscription | null> {
  const [sub] = await sql<Subscription[]>`
    SELECT id, user_id, plan_id, server_id, status,
           starts_at::text, expires_at::text,
           created_at::text, updated_at::text
    FROM subscriptions
    WHERE user_id = ${userId}
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY expires_at DESC
    LIMIT 1
  `;
  return sub ?? null;
}

export async function createSubscription(
  userId: string,
  planId: string,
): Promise<Subscription> {
  const [sub] = await sql<Subscription[]>`
    INSERT INTO subscriptions (user_id, plan_id, status)
    VALUES (${userId}, ${planId}, 'pending')
    RETURNING id, user_id, plan_id, server_id, status,
              starts_at::text, expires_at::text,
              created_at::text, updated_at::text
  `;
  return sub;
}

export async function activateSubscription(
  subscriptionId: string,
  durationDays: number,
  serverId: string,
): Promise<Subscription | null> {
  const [sub] = await sql<Subscription[]>`
    UPDATE subscriptions SET
      status    = 'active',
      starts_at = NOW(),
      expires_at = NOW() + (${durationDays} || ' days')::INTERVAL,
      server_id  = ${serverId}
    WHERE id = ${subscriptionId}
    RETURNING id, user_id, plan_id, server_id, status,
              starts_at::text, expires_at::text,
              created_at::text, updated_at::text
  `;
  return sub ?? null;
}

export async function findVpnKeyBySubscription(subscriptionId: string): Promise<VpnKey | null> {
  const [key] = await sql<VpnKey[]>`
    SELECT id, subscription_id, server_id, outline_key_id, access_key, is_active, created_at::text
    FROM vpn_keys
    WHERE subscription_id = ${subscriptionId} AND is_active = true
  `;
  return key ?? null;
}

export async function createVpnKey(
  subscriptionId: string,
  serverId: string,
  accessKey: string,
  outlineKeyId?: string,
): Promise<VpnKey> {
  const [key] = await sql<VpnKey[]>`
    INSERT INTO vpn_keys (subscription_id, server_id, access_key, outline_key_id)
    VALUES (${subscriptionId}, ${serverId}, ${accessKey}, ${outlineKeyId ?? null})
    RETURNING id, subscription_id, server_id, outline_key_id, access_key, is_active, created_at::text
  `;
  return key;
}
