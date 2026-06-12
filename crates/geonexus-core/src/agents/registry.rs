use std::collections::HashMap;
use std::sync::Arc;

use serde::Serialize;

use super::task::AgentTask;
use super::{AgentContext, AgentError, AgentKind, AgentOutput, AgentTrait};

pub type BoxedAgent = Arc<dyn AgentTrait>;

pub trait EventBus: Send + Sync {
    fn emit(&self, event: &str, payload: &str);
}

pub struct AgentRegistry {
    toggleable: HashMap<String, BoxedAgent>,
    event_bus: Option<Box<dyn EventBus>>,
}

impl Default for AgentRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentRegistry {
    pub fn new() -> Self {
        Self { toggleable: HashMap::new(), event_bus: None }
    }

    pub fn set_event_bus(&mut self, bus: Box<dyn EventBus>) {
        self.event_bus = Some(bus);
    }

    pub fn register(&mut self, agent: BoxedAgent) {
        self.toggleable.insert(agent.id().to_string(), agent);
    }

    pub fn get(&self, id: &str) -> Option<&BoxedAgent> {
        self.toggleable.get(id)
    }

    pub fn list(&self) -> Vec<&BoxedAgent> {
        self.toggleable.values().collect()
    }

    pub fn list_by_kind(&self, kind: AgentKind) -> Vec<&BoxedAgent> {
        self.toggleable
            .values()
            .filter(|a| a.kind() == kind)
            .collect()
    }

    pub async fn execute(
        &self,
        agent_id: &str,
        task: &AgentTask,
        ctx: &AgentContext,
    ) -> Result<AgentOutput, AgentError> {
        let agent = self
            .toggleable
            .get(agent_id)
            .ok_or_else(|| AgentError::Other(format!("Agente '{agent_id}' no registrado")))?;
        agent.execute(task, ctx).await
    }

    pub fn emit_event(&self, event: &str, payload: &impl Serialize) {
        if let Some(bus) = &self.event_bus {
            if let Ok(json) = serde_json::to_string(payload) {
                bus.emit(event, &json);
            }
        }
    }
}
