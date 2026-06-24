/// Scans for common prompt injection patterns in untrusted content
/// (RAG chunks, web search snippets, user messages).
pub fn scan_for_prompt_injection(content: &str) -> bool {
    let patterns = vec![
        "ignore the previous instructions",
        "ignore prior instructions",
        "forget the previous instructions",
        "system prompt",
        "ignore previous",
        "disregard previous",
        "above instructions",
        "your instructions",
        "pretend you are",
        "act as if",
    ];

    let content_lower = content.to_lowercase();
    patterns.iter().any(|&p| content_lower.contains(p))
}
