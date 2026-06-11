/// Extrae una query de búsqueda web a partir del mensaje del usuario,
/// limpiando prefijos coloquiales y truncando si es muy larga.
pub fn extract_search_query(user_message: &str) -> String {
    let msg = user_message.trim();
    if msg.len() < 60 {
        return msg.to_string();
    }
    let filler_prefixes = [
        "dime ", "cuéntame ", "explícame ", "qué es ", "qué son ",
        "cómo ", "cuál es ", "dame información sobre ",
        "busca información sobre ", "necesito saber ",
        "puedes decirme ", "me puedes explicar ",
    ];
    let mut clean = msg.to_lowercase();
    for prefix in &filler_prefixes {
        if clean.starts_with(prefix) {
            clean = clean[prefix.len()..].to_string();
            break;
        }
    }
    let query = if clean.len() > 80 {
        let cut = &clean[..80];
        match cut.rfind(' ') {
            Some(pos) => clean[..pos].to_string(),
            None => cut.to_string(),
        }
    } else {
        clean
    };
    let mut chars = query.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}
