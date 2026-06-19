use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

#[derive(Debug, thiserror::Error)]
pub enum RateGuardError {
    #[error("rate limit exceeded for session {session_id}: {remaining} tokens remaining")]
    RateLimitExceeded { session_id: String, remaining: u64 },
}

struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
    max_tokens: f64,
    refill_rate: f64, // tokens per second
}

impl TokenBucket {
    fn new(max_tokens: f64, refill_rate: f64) -> Self {
        Self {
            tokens: max_tokens,
            last_refill: Instant::now(),
            max_tokens,
            refill_rate,
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        if elapsed > 0.0 {
            self.tokens = (self.tokens + elapsed * self.refill_rate).min(self.max_tokens);
            self.last_refill = now;
        }
    }

    fn try_consume(&mut self, count: f64) -> bool {
        self.refill();
        if self.tokens >= count {
            self.tokens -= count;
            true
        } else {
            false
        }
    }

    fn remaining(&self) -> u64 {
        self.tokens as u64
    }
}

pub struct RateGuard {
    buckets: Mutex<HashMap<String, TokenBucket>>,
    max_write_ops: u64,
    refill_window_secs: u64,
    op_cost: f64,
}

impl Default for RateGuard {
    fn default() -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            max_write_ops: 30,
            refill_window_secs: 60,
            op_cost: 1.0,
        }
    }
}

impl RateGuard {
    pub fn new(max_write_ops_per_minute: u64) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            max_write_ops: max_write_ops_per_minute,
            refill_window_secs: 60,
            op_cost: 1.0,
        }
    }

    pub fn with_op_cost(mut self, cost: f64) -> Self {
        self.op_cost = cost;
        self
    }

    /// Check and consume a token for a write operation.
    /// Returns Ok(()) if allowed, Err with remaining tokens if denied.
    pub fn check_write(&self, session_id: &str) -> Result<(), RateGuardError> {
        let mut buckets = self.buckets.lock().unwrap();
        let bucket = buckets.entry(session_id.to_string()).or_insert_with(|| {
            TokenBucket::new(
                self.max_write_ops as f64,
                self.max_write_ops as f64 / self.refill_window_secs as f64,
            )
        });

        if bucket.try_consume(self.op_cost) {
            Ok(())
        } else {
            Err(RateGuardError::RateLimitExceeded {
                session_id: session_id.to_string(),
                remaining: bucket.remaining(),
            })
        }
    }

    /// Check without consuming (for read-only checks).
    pub fn peek_remaining(&self, session_id: &str) -> u64 {
        let mut buckets = self.buckets.lock().unwrap();
        let bucket = buckets.entry(session_id.to_string()).or_insert_with(|| {
            TokenBucket::new(
                self.max_write_ops as f64,
                self.max_write_ops as f64 / self.refill_window_secs as f64,
            )
        });
        bucket.refill();
        bucket.remaining()
    }

    pub fn reset_session(&self, session_id: &str) {
        let mut buckets = self.buckets.lock().unwrap();
        buckets.remove(session_id);
    }

    pub fn max_write_ops(&self) -> u64 {
        self.max_write_ops
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_guard_allows_within_limit() {
        let guard = RateGuard::new(5);
        for _ in 0..5 {
            assert!(guard.check_write("session-1").is_ok());
        }
    }

    #[test]
    fn test_rate_guard_denies_over_limit() {
        let guard = RateGuard::new(3);
        for _ in 0..3 {
            guard.check_write("session-1").unwrap();
        }
        let result = guard.check_write("session-1");
        assert!(result.is_err());
    }

    #[test]
    fn test_rate_guard_peek_remaining() {
        let guard = RateGuard::new(10);
        assert_eq!(guard.peek_remaining("session-1"), 10);
        guard.check_write("session-1").unwrap();
        assert_eq!(guard.peek_remaining("session-1"), 9);
    }

    #[test]
    fn test_rate_guard_independent_sessions() {
        let guard = RateGuard::new(2);
        guard.check_write("session-1").unwrap();
        guard.check_write("session-1").unwrap();
        assert!(guard.check_write("session-1").is_err());

        // Different session still has tokens
        assert!(guard.check_write("session-2").is_ok());
    }

    #[test]
    fn test_rate_guard_reset_session() {
        let guard = RateGuard::new(2);
        guard.check_write("session-1").unwrap();
        guard.check_write("session-1").unwrap();
        assert!(guard.check_write("session-1").is_err());

        guard.reset_session("session-1");
        assert!(guard.check_write("session-1").is_ok());
    }

    #[test]
    fn test_rate_guard_default_config() {
        let guard = RateGuard::default();
        assert_eq!(guard.max_write_ops(), 30);
    }

    #[test]
    fn test_rate_guard_custom_cost() {
        let guard = RateGuard::new(10).with_op_cost(2.0);
        // Each operation costs 2 tokens, so only 5 operations allowed
        for _ in 0..5 {
            assert!(guard.check_write("session-1").is_ok());
        }
        assert!(guard.check_write("session-1").is_err());
    }

    #[test]
    fn test_adversarial_loop_rapid_writes_stopped() {
        // Simulate an adversarial Worker that rapidly writes in a tight loop
        let guard = RateGuard::new(20); // only 20 writes allowed
        let session = "adversarial-session";

        // First 20 should succeed
        for i in 0..20 {
            let result = guard.check_write(session);
            assert!(result.is_ok(), "write {} should succeed", i);
        }

        // All further writes should be denied until refill
        for i in 0..100 {
            let result = guard.check_write(session);
            assert!(result.is_err(), "write {} should be rate-limited", 20 + i);
        }
    }

    #[test]
    fn test_adversarial_loop_multiple_sessions() {
        // Adversarial: multiple sessions each trying to hammer the system
        let guard = RateGuard::new(5);
        let sessions = ["session-a", "session-b", "session-c"];

        for session in &sessions {
            // Each session gets its own 5 tokens
            for i in 0..5 {
                assert!(guard.check_write(session).is_ok(), "{} write {}", session, i);
            }
            // Extra writes are denied per session
            assert!(guard.check_write(session).is_err());
        }
    }
}
