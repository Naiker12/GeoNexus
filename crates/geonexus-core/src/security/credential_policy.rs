use crate::crypto::fingerprint_token;

pub const SAFE_METADATA_KEYS: &[&str] = &[
    "username", "first_name", "last_name", "chat_type", "chat_id",
    "user_id", "message_id", "date", "update_id", "is_bot",
    "response_mode", "allowed_users", "kind", "message",
];

pub const SECRET_VALUE_KEYS: &[&str] = &[
    "bot_token", "access_token", "refresh_token", "api_key",
    "password", "secret", "auth_token", "token", "encryption_key",
];

pub fn assert_no_raw_secrets(value: &str, context: &str) {
    for key in SECRET_VALUE_KEYS {
        if value.contains(key) {
            tracing::warn!(
                "[security] Potential secret leaked in {}: contains '{}'",
                context,
                key
            );
        }
    }
}

pub fn redact_secrets(input: &str) -> String {
    let mut result = input.to_string();
    for key in SECRET_VALUE_KEYS {
        let pattern = format!(r#""{}":\s*"[^"]*""#, key);
        if let Ok(re) = regex::Regex::new(&pattern) {
            result = re.replace_all(&result, |_caps: &regex::Captures| {
                format!(r#""{}": "<REDACTED>""#, key)
            }).to_string();
        }
    }
    result
}

pub fn secret_fingerprint(secret: &str) -> String {
    fingerprint_token(secret)
}
