use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use futures_util::{SinkExt, StreamExt, Stream};

const DEFAULT_GATEWAY_URL: &str = "ws://127.0.0.1:9876/ws";

type WsStream = tokio_tungstenite::WebSocketStream<
    tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
>;
type Reader = futures_util::stream::SplitStream<WsStream>;

use std::sync::OnceLock;

static GLOBAL_GATEWAY: OnceLock<GatewayClient> = OnceLock::new();

/// Set the global gateway instance (called once at startup).
pub fn set_global_gateway(client: GatewayClient) {
    let _ = GLOBAL_GATEWAY.set(client);
}

/// Get the global gateway instance, if initialized.
pub fn get_global_gateway() -> Option<&'static GatewayClient> {
    GLOBAL_GATEWAY.get()
}

/// A stream of JSON values coming from the gateway.
pub struct GatewayStream {
    reader: Reader,
}

impl Stream for GatewayStream {
    type Item = Result<serde_json::Value, String>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            match self.reader.poll_next_unpin(cx) {
                Poll::Ready(Some(Ok(Message::Text(text)))) => {
                    match serde_json::from_str::<serde_json::Value>(&text) {
                        Ok(val) => return Poll::Ready(Some(Ok(val))),
                        Err(e) => return Poll::Ready(Some(Err(format!("JSON error: {e} — text: {text}"))))
                    }
                }
                Poll::Ready(Some(Ok(Message::Ping(_)))) => continue,
                Poll::Ready(Some(Ok(Message::Pong(_)))) => continue,
                Poll::Ready(Some(Ok(Message::Close(_)))) => return Poll::Ready(None),
                Poll::Ready(Some(Ok(Message::Binary(_)))) => continue,
                Poll::Ready(Some(Ok(Message::Frame(_)))) => continue,
                Poll::Ready(Some(Err(e))) => {
                    return Poll::Ready(Some(Err(format!("WS error: {e}"))));
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

#[derive(Clone)]
pub struct GatewayClient {
    url: Arc<String>,
}

impl GatewayClient {
    pub fn new(url: Option<String>) -> Self {
        Self {
            url: Arc::new(url.unwrap_or_else(|| DEFAULT_GATEWAY_URL.to_string())),
        }
    }

    /// Open a fresh connection, send the JSON message, return the reader stream.
    async fn connect_and_send(&self, msg: serde_json::Value) -> Result<Reader, String> {
        let url = self.url.as_str();
        let (ws_stream, _) = connect_async(url)
            .await
            .map_err(|e| format!("No se pudo conectar al gateway {url}: {e}"))?;
        let (mut writer, reader) = ws_stream.split();
        let msg_text = serde_json::to_string(&msg)
            .map_err(|e| format!("Error serializando: {e}"))?;
        writer
            .send(Message::Text(msg_text.into()))
            .await
            .map_err(|e| format!("Error enviando al gateway: {e}"))?;
        writer.close().await.ok();
        Ok(reader)
    }

    /// Build the standard request envelope.
    fn build_request(action: &str, params: serde_json::Value) -> serde_json::Value {
        serde_json::json!({
            "action": action,
            "params": params,
            "session_id": "default",
        })
    }

    /// Send a JSON action and return a stream of response events.
    pub async fn send_stream(
        &self,
        action: &str,
        params: serde_json::Value,
    ) -> Result<GatewayStream, String> {
        let msg = Self::build_request(action, params);
        let reader = self.connect_and_send(msg).await?;
        Ok(GatewayStream { reader })
    }

    /// Send a JSON action and read a single response.
    pub async fn send_json(
        &self,
        action: &str,
        params: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let msg = Self::build_request(action, params);
        let mut reader = self.connect_and_send(msg).await?;

        loop {
            match reader.next().await {
                Some(Ok(Message::Text(text))) => {
                    return serde_json::from_str(&text)
                        .map_err(|e| format!("JSON error: {e} — text: {text}"));
                }
                Some(Ok(Message::Ping(_))) | Some(Ok(Message::Pong(_))) => continue,
                Some(Ok(Message::Binary(_))) | Some(Ok(Message::Frame(_))) => continue,
                Some(Ok(Message::Close(_))) => return Err("Gateway cerró conexión".into()),
                Some(Err(e)) => return Err(format!("Error de WS: {e}")),
                None => return Err("Gateway cerró conexión".into()),
            }
        }
    }

    /// Quickly test connectivity by opening and closing a connection.
    pub async fn is_connected(&self) -> bool {
        connect_async(self.url.as_str()).await.is_ok()
    }

    /// Probe whether a gateway is already running on the given port.
    /// Unlike is_connected, this creates a temporary GatewayClient so you
    /// can check *before* setting the global singleton.
    pub async fn probe(port: u16) -> bool {
        let url = format!("ws://127.0.0.1:{port}/ws");
        connect_async(&url).await.is_ok()
    }
}
