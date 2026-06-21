use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};

fn resolve_encryption_key() -> Result<[u8; 32], String> {
    if let Ok(key_b64) = std::env::var("GEONEXUS_SECRET_KEY") {
        let key_bytes = STANDARD.decode(&key_b64)
            .map_err(|_| "GEONEXUS_SECRET_KEY no es base64 válido".to_string())?;
        if key_bytes.len() != 32 {
            return Err("GEONEXUS_SECRET_KEY debe ser exactamente 32 bytes en base64".to_string());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        return Ok(key);
    }

    let machine_id = resolve_machine_id();
    let machine_id = if machine_id.is_empty() {
        "geonexus-fallback-id".to_string()
    } else {
        machine_id
    };
    let mut hasher = Sha256::new();
    hasher.update(b"geonexus-telegram-v1:");
    hasher.update(machine_id.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    Ok(key)
}

fn resolve_machine_id() -> String {
    #[cfg(target_os = "linux")]
    {
        std::fs::read_to_string("/etc/machine-id")
            .or_else(|_| std::fs::read_to_string("/var/lib/dbus/machine-id"))
            .unwrap_or_default()
            .trim()
            .to_string()
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(id) = std::fs::read_to_string("C:\\ProgramData\\Microsoft\\Crypto\\MachineGuid") {
            let trimmed = id.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }

        let key = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography";
        if let Ok(output) = std::process::Command::new("reg")
            .args(["query", key, "/v", "MachineGuid"])
            .output()
        {
            if output.status.success() {
                if let Ok(text) = String::from_utf8(output.stdout) {
                    if let Some(guid) = text
                        .lines()
                        .find(|l| l.contains("MachineGuid"))
                        .and_then(|l| l.split_whitespace().nth(2))
                    {
                        return guid.to_string();
                    }
                }
            }
        }

        String::new()
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        String::new()
    }
}

pub fn encrypt_token(plaintext: &str) -> Result<String, String> {
    let key_bytes = resolve_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|_| "Error inicializando cifrado".to_string())?;

    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher.encrypt(&nonce, plaintext.as_bytes())
        .map_err(|_| "Error cifrando token".to_string())?;

    let nonce_b64 = STANDARD.encode(nonce.as_slice());
    let cipher_b64 = STANDARD.encode(&ciphertext);
    Ok(format!("{}:{}", nonce_b64, cipher_b64))
}

pub fn decrypt_token(encrypted: &str) -> Result<String, String> {
    let key_bytes = resolve_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|_| "Error inicializando cifrado".to_string())?;

    let parts: Vec<&str> = encrypted.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err("Formato de token cifrado inválido".to_string());
    }

    let nonce_bytes = STANDARD.decode(parts[0])
        .map_err(|_| "Nonce inválido".to_string())?;
    let ciphertext = STANDARD.decode(parts[1])
        .map_err(|_| "Ciphertext inválido".to_string())?;

    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher.decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Error descifrando token".to_string())?;

    String::from_utf8(plaintext)
        .map_err(|_| "Token descifrado no es UTF-8 válido".to_string())
}

pub fn fingerprint_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let result = hasher.finalize();
    hex::encode(&result[..8])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let original = "1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh";
        let encrypted = encrypt_token(original).expect("encrypt failed");
        assert_ne!(encrypted, original);
        let decrypted = decrypt_token(&encrypted).expect("decrypt failed");
        assert_eq!(decrypted, original);
    }

    #[test]
    fn test_decrypt_fails_with_tampered_data() {
        let encrypted = encrypt_token("test_token").expect("encrypt failed");
        let tampered = format!("{}x", encrypted);
        assert!(decrypt_token(&tampered).is_err());
    }

    #[test]
    fn test_fingerprint_is_consistent() {
        let fp1 = fingerprint_token("same-token");
        let fp2 = fingerprint_token("same-token");
        assert_eq!(fp1, fp2);
    }

    #[test]
    fn test_fingerprint_differs_for_different_tokens() {
        let fp1 = fingerprint_token("token-a");
        let fp2 = fingerprint_token("token-b");
        assert_ne!(fp1, fp2);
    }
}
