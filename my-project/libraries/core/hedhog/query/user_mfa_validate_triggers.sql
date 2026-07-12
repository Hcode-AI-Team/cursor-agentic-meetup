-- Trigger para TOT
CREATE OR REPLACE FUNCTION validate_mfa_totp()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT type FROM user_mfa WHERE id = NEW.user_mfa_id) <> 'totp' THEN
    RAISE EXCEPTION 'Invalid MFA type: user_mfa.id % is not TOTP', NEW.user_mfa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_mfa_totp_type_trigger ON user_mfa_totp;

CREATE TRIGGER user_mfa_totp_type_trigger
BEFORE INSERT OR UPDATE ON user_mfa_totp
FOR EACH ROW
EXECUTE FUNCTION validate_mfa_totp();

-- Trigger para WebAuthn
CREATE OR REPLACE FUNCTION validate_mfa_webauthn()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT type FROM user_mfa WHERE id = NEW.user_mfa_id) <> 'webauthn' THEN
    RAISE EXCEPTION 'Invalid MFA type: user_mfa.id % is not WebAuthn', NEW.user_mfa_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_mfa_webauthn_type_trigger ON user_mfa_webauthn;

CREATE TRIGGER user_mfa_webauthn_type_trigger
BEFORE INSERT OR UPDATE ON user_mfa_webauthn
FOR EACH ROW
EXECUTE FUNCTION validate_mfa_webauthn();

-- Trigger para SMS/WhatsApp
CREATE OR REPLACE FUNCTION validate_mfa_phone()
RETURNS TRIGGER AS $$
DECLARE
  mfa_type VARCHAR;
BEGIN
  SELECT type INTO mfa_type FROM user_mfa WHERE id = NEW.user_mfa_id;
  IF mfa_type NOT IN ('sms', 'whatsapp') THEN
    RAISE EXCEPTION 'Invalid MFA type: % is not a phone-based MFA', mfa_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_mfa_phone_type_trigger ON user_mfa_phone;

CREATE TRIGGER user_mfa_phone_type_trigger
BEFORE INSERT OR UPDATE ON user_mfa_phone
FOR EACH ROW
EXECUTE FUNCTION validate_mfa_phone();