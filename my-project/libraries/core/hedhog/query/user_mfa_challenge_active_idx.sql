-- Create partial index to improve active MFA challenge lookup
CREATE INDEX user_mfa_challenge_active_idx
  ON user_mfa_challenge(user_mfa_id)
  WHERE verified_at IS NULL;