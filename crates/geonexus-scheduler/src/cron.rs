use std::collections::HashMap;

/// Translates natural language to cron expressions.
/// Falls back to best-effort parsing for common patterns.
pub fn nl_to_cron(input: &str) -> (String, f64) {
    let lower = input.to_lowercase().trim().to_string();

    // Check for explicit cron expression
    if is_valid_cron(&lower) {
        return (lower.clone(), 1.0);
    }

    // Common pattern matchers
    let patterns: Vec<(&str, &str, f64)> = vec![
        // Every X minutes/hours/days
        (r"cada\s+(\d+)\s+minuto", "*/{n} * * * *", 0.9),
        (r"cada\s+(\d+)\s+hora", "0 */{n} * * *", 0.9),
        (r"cada\s+(\d+)\s+d[ií]a", "0 0 */{n} * *", 0.9),
        (r"every\s+(\d+)\s+minute", "*/{n} * * * *", 0.9),
        (r"every\s+(\d+)\s+hour", "0 */{n} * * *", 0.9),
        (r"every\s+(\d+)\s+day", "0 0 */{n} * *", 0.9),
        // Daily at specific time
        (r"cada\s+d[ií]a\s+a\s+las?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", "0 {m} {h} * * *", 0.85),
        (r"every\s+day\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", "0 {m} {h} * * *", 0.85),
        // Weekly on specific day
        (r"cada\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)", "0 0 * * {d}", 0.8),
        (r"every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)", "0 0 * * {d}", 0.8),
        // Weekdays/weekends
        (r"(entre\s+semana|weekdays?|laborables)", "0 0 * * 1-5", 0.8),
        (r"(fines?\s*de\s*semana|weekends?)", "0 0 * * 0,6", 0.8),
        // Monthly
        (r"cada\s+mes\s+el\s+d[ií]a\s+(\d{1,2})", "0 0 {d} * *", 0.8),
        (r"every\s+month\s+on\s+day\s+(\d{1,2})", "0 0 {d} * *", 0.8),
        // Simple frequencies
        (r"(cada\s+hora|every\s+hour|hourly)", "0 * * * *", 0.9),
        (r"(cada\s+d[ií]a|every\s+day|daily)", "0 0 * * *", 0.9),
        (r"(cada\s+semana|every\s+week|weekly)", "0 0 * * 0", 0.9),
        (r"(cada\s+mes|every\s+month|monthly)", "0 0 1 * *", 0.9),
        // "in X minutes/hours" (one-shot, not cron — we still schedule it)
        (r"en\s+(\d+)\s+minuto", "now+{n}m", 0.7),
        (r"in\s+(\d+)\s+minutes?", "now+{n}m", 0.7),
        (r"en\s+(\d+)\s+hora", "now+{n}h", 0.7),
        (r"in\s+(\d+)\s+hours?", "now+{n}h", 0.7),
    ];

    for (pattern, template, confidence) in &patterns {
        if let Some(caps) = regex_lite::Regex::new(pattern).ok().and_then(|re| re.captures(&lower)) {
            let cron = apply_template(template, &caps);
            return (cron, *confidence);
        }
    }

    // Default: every day at midnight with low confidence
    ("0 0 * * *".into(), 0.3)
}

/// Validate a cron expression (5 or 6 fields).
fn is_valid_cron(s: &str) -> bool {
    let parts: Vec<&str> = s.split_whitespace().collect();
    (5..=6).contains(&parts.len()) && parts.iter().all(|p| {
        p.chars().all(|c| "*/-0123456789,".contains(c) || c.is_ascii_alphabetic())
    })
}

fn apply_template(template: &str, caps: &regex_lite::Captures) -> String {
    let mut result = template.to_string();

    // Replace {n} — numeric capture
    if let Some(n) = caps.get(1) {
        result = result.replace("{n}", n.as_str());
    }

    // Replace {h} — hour
    if let Some(h) = caps.get(1) {
        if template.contains("{h}") {
            result = result.replace("{h}", h.as_str());
        }
    }

    // Replace {m} — minute (with 2-digit default)
    if template.contains("{m}") {
        if let Some(m) = caps.get(2) {
            let min = if m.as_str().is_empty() { "0" } else { m.as_str() };
            result = result.replace("{m}", min);
        } else {
            result = result.replace("{m}", "0");
        }
    }

    // Handle AM/PM adjustment
    if let Some(ampm) = caps.get(3) {
        let ampm = ampm.as_str();
        let hour: i32 = caps.get(1).and_then(|m| m.as_str().parse().ok()).unwrap_or(12);
        let adjusted = match (ampm, hour) {
            ("am" | "a.m" | "a. m.", 12) => 0,
            ("am" | "a.m" | "a. m.", h) => h,
            ("pm" | "p.m" | "p. m.", 12) => 12,
            ("pm" | "p.m" | "p. m.", h) => h + 12,
            _ => hour,
        };
        result = result.replace("{h}", &adjusted.to_string());
    }

    // Replace {d} — day of week
    let day_map: HashMap<&str, &str> = [
        ("lunes", "1"), ("martes", "2"), ("miércoles", "3"), ("miercoles", "3"),
        ("jueves", "4"), ("viernes", "5"), ("sábado", "6"), ("sabado", "6"),
        ("domingo", "0"),
        ("monday", "1"), ("tuesday", "2"), ("wednesday", "3"),
        ("thursday", "4"), ("friday", "5"), ("saturday", "6"), ("sunday", "0"),
    ].iter().cloned().collect();

    if template.contains("{d}") {
        if let Some(d) = caps.get(1) {
            let day = day_map.get(d.as_str()).unwrap_or(&"0");
            result = result.replace("{d}", day);
        }
    }

    // Replace "now+" for one-shot scheduling
    if result.starts_with("now+") {
        // Keep as-is; the caller interprets "now+10m" as "in 10 minutes"
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_cron_passthrough() {
        let (cron, conf) = nl_to_cron("*/15 * * * *");
        assert_eq!(cron, "*/15 * * * *");
        assert!((conf - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_cada_hora() {
        let (cron, _) = nl_to_cron("cada hora");
        assert_eq!(cron, "0 * * * *");
    }

    #[test]
    fn test_daily_at_time() {
        let (cron, _) = nl_to_cron("cada día a las 9:30 am");
        assert_eq!(cron, "0 30 9 * * *");
    }

    #[test]
    fn test_every_monday() {
        let (cron, _) = nl_to_cron("every monday");
        assert_eq!(cron, "0 0 * * 1");
    }

    #[test]
    fn test_weekdays() {
        let (cron, _) = nl_to_cron("weekdays");
        assert_eq!(cron, "0 0 * * 1-5");
    }
}
