#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMPlanFile {
    pub path: String,
    pub language: String,
    pub short_description: String,
    pub content: String,
    pub risk: String,
    pub reason: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMPlan {
    pub summary: String,
    pub files: Vec<LLMPlanFile>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectFileEntry {
    pub path: String,
    pub name: String,
    pub type_: String,
    pub content: String,
    pub language: String,
    pub is_original: bool,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct ClarifyingQuestion {
    pub id: String,
    pub question: String,
    pub answer: String,
}
