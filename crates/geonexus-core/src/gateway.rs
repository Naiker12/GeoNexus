use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// A message to be dispatched across any channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboundMessage {
    pub text: String,
    pub channel: ChannelKind,
    pub thread_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Supported channel types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChannelKind {
    Desktop,
    Telegram,
    Discord,
    Slack,
    Webhook,
}

impl ChannelKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            ChannelKind::Desktop => "desktop",
            ChannelKind::Telegram => "telegram",
            ChannelKind::Discord => "discord",
            ChannelKind::Slack => "slack",
            ChannelKind::Webhook => "webhook",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "telegram" => ChannelKind::Telegram,
            "discord" => ChannelKind::Discord,
            "slack" => ChannelKind::Slack,
            "webhook" => ChannelKind::Webhook,
            _ => ChannelKind::Desktop,
        }
    }
}

/// Result of dispatching a message through a channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DispatchResult {
    pub channel: ChannelKind,
    pub success: bool,
    pub message_id: Option<String>,
    pub error: Option<String>,
}

/// Trait that all channel adapters must implement.
#[async_trait]
pub trait ChannelAdapter: Send + Sync {
    fn kind(&self) -> ChannelKind;

    /// Send a message through this channel.
    async fn send_message(&self, msg: &OutboundMessage) -> DispatchResult;

    /// Check if the channel is currently connected/available.
    async fn health_check(&self) -> bool;
}

/// Simple registry of available channel adapters.
pub struct Gateway {
    adapters: Vec<Box<dyn ChannelAdapter>>,
}

impl Gateway {
    pub fn new() -> Self {
        Self {
            adapters: Vec::new(),
        }
    }

    pub fn register(&mut self, adapter: Box<dyn ChannelAdapter>) {
        self.adapters.push(adapter);
    }

    /// Dispatch a message to all registered channels that match the message's target.
    pub async fn dispatch(&self, msg: &OutboundMessage) -> Vec<DispatchResult> {
        let mut results = Vec::new();
        for adapter in &self.adapters {
            if adapter.kind() == msg.channel {
                results.push(adapter.send_message(msg).await);
    }
}

/// Discord webhook adapter — dispatches messages via Discord Incoming Webhooks.
pub struct DiscordWebhookAdapter {
    webhook_url: String,
}

impl DiscordWebhookAdapter {
    pub fn new(webhook_url: String) -> Self {
        Self { webhook_url }
    }
}

#[async_trait]
impl ChannelAdapter for DiscordWebhookAdapter {
    fn kind(&self) -> ChannelKind {
        ChannelKind::Discord
    }

    async fn send_message(&self, msg: &OutboundMessage) -> DispatchResult {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "content": msg.text,
            "username": "GeoNexus",
        });

        match client
            .post(&self.webhook_url)
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    let body: serde_json::Value = resp.json().await.unwrap_or_default();
                    DispatchResult {
                        channel: ChannelKind::Discord,
                        success: true,
                        message_id: body["id"].as_str().map(|s| s.to_string()),
                        error: None,
                    }
                } else {
                    DispatchResult {
                        channel: ChannelKind::Discord,
                        success: false,
                        message_id: None,
                        error: Some(format!("Discord webhook returned {status}")),
                    }
                }
            }
            Err(e) => DispatchResult {
                channel: ChannelKind::Discord,
                success: false,
                message_id: None,
                error: Some(format!("Discord webhook error: {e}")),
            },
        }
    }

    async fn health_check(&self) -> bool {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .ok();
        match client {
            Some(c) => {
                // Discord webhooks don't have a dedicated health endpoint;
                // we check that the URL is at least reachable.
                let host = self.webhook_url
                    .trim_start_matches("https://")
                    .split('/')
                    .next()
                    .unwrap_or("discord.com");
                c.head(format!("https://{host}"))
                    .send()
                    .await
                    .map(|r| r.status().is_success())
                    .unwrap_or(false)
            }
            None => false,
        }
    }
}
        results
    }

    /// Dispatch to all registered channels (broadcast).
    pub async fn broadcast(&self, text: &str, metadata: Option<serde_json::Value>) -> Vec<DispatchResult> {
        let mut results = Vec::new();
        for adapter in &self.adapters {
            let msg = OutboundMessage {
                text: text.to_string(),
                channel: adapter.kind(),
                thread_id: None,
                metadata: metadata.clone(),
            };
            results.push(adapter.send_message(&msg).await);
        }
        results
    }
}
