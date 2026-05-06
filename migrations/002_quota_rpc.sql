-- Add RPC function for quota consumption
CREATE OR REPLACE FUNCTION consume_youtube_quota(
  quota_date DATE,
  units_to_add INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO youtube_quota (date, units_used, units_limit)
  VALUES (quota_date, units_to_add, 10000)
  ON CONFLICT (date) DO UPDATE
  SET units_used = youtube_quota.units_used + units_to_add,
      last_updated = NOW();
END;
$$;