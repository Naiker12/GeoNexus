use super::fetchers::{is_non_chat_model, model_id_to_display_name, anthropic_known_models};

#[test]
fn is_non_chat_model_filtra_embedding() {
    assert!(is_non_chat_model("text-embedding-ada-002"));
    assert!(is_non_chat_model("text-embedding-3-small"));
}

#[test]
fn is_non_chat_model_filtra_whisper() {
    assert!(is_non_chat_model("whisper-1"));
}

#[test]
fn is_non_chat_model_filtra_tts() {
    assert!(is_non_chat_model("tts-1"));
    assert!(is_non_chat_model("tts-1-hd"));
}

#[test]
fn is_non_chat_model_no_filtra_gpt4() {
    assert!(!is_non_chat_model("gpt-4o"));
    assert!(!is_non_chat_model("gpt-4o-mini"));
    assert!(!is_non_chat_model("gpt-4-turbo"));
}

#[test]
fn is_non_chat_model_no_filtra_claude() {
    assert!(!is_non_chat_model("claude-opus-4-6"));
    assert!(!is_non_chat_model("claude-sonnet-4-6"));
}

#[test]
fn is_non_chat_model_no_filtra_modelos_openrouter() {
    assert!(!is_non_chat_model("google/gemini-flash-1.5"));
    assert!(!is_non_chat_model("meta-llama/llama-3-8b-instruct"));
    assert!(!is_non_chat_model("mistralai/mixtral-8x7b"));
}

#[test]
fn model_id_to_display_name_traduce_conocidos() {
    assert_eq!(model_id_to_display_name("gpt-4o"), "GPT-4o");
    assert_eq!(model_id_to_display_name("gpt-4o-mini"), "GPT-4o Mini");
    assert_eq!(model_id_to_display_name("o1"), "o1");
}

#[test]
fn model_id_to_display_name_pasa_desconocidos_sin_cambio() {
    assert_eq!(
        model_id_to_display_name("custom/mi-modelo"),
        "custom/mi-modelo"
    );
}

#[test]
fn anthropic_known_models_retorna_lista_no_vacia() {
    let models = anthropic_known_models();
    assert!(!models.is_empty());
    assert!(models.iter().all(|m| !m.id.is_empty()));
    assert!(models.iter().all(|m| !m.name.is_empty()));
}

#[test]
fn is_non_chat_model_filtra_dalle() {
    assert!(is_non_chat_model("dall-e-3"));
    assert!(is_non_chat_model("dall-e-2"));
}

#[test]
fn is_non_chat_model_filtra_moderation() {
    assert!(is_non_chat_model("text-moderation-stable"));
}
