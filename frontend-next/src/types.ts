export type User = {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  plan?: string | null;
  plan_expires_at?: string | null;
  is_vip?: boolean;
  conversions_used?: number;
};

export type AuthPayload = {
  token?: string;
  user?: User | null;
  planActive?: boolean;
};
