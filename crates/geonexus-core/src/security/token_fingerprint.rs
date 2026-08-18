use crate::crypto::fingerprint_token;

pub fn token_fingerprint(token: &str) -> String {
    fingerprint_token(token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_fingerprint_consistent() {
        let fp1 = token_fingerprint("same-token");
        let fp2 = token_fingerprint("same-token");
        assert_eq!(fp1, fp2);
    }

    #[test]
    fn test_token_fingerprint_differs() {
        let fp1 = token_fingerprint("token-a");
        let fp2 = token_fingerprint("token-b");
        assert_ne!(fp1, fp2);
    }

    #[test]
    fn test_token_fingerprint_length() {
        let fp = token_fingerprint("some-token");
        assert_eq!(fp.len(), 16);
    }
}
