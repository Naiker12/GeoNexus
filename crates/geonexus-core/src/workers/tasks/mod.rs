pub mod indexer;
pub mod embedder;
pub mod graph;
pub mod classifier;

pub use indexer::IndexerWorker;
pub use embedder::EmbedderWorker;
pub use graph::GraphWorker;
pub use classifier::ClassifierWorker;

use super::handler::WorkerHandler;

pub fn default_handlers() -> Vec<Box<dyn WorkerHandler>> {
    vec![
        Box::new(IndexerWorker),
        Box::new(EmbedderWorker),
        Box::new(GraphWorker),
        Box::new(ClassifierWorker),
    ]
}
