use std::collections::VecDeque;
use std::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimelineEntry {
    pub id: String,
    pub tool_name: String,
    pub path: String,
    pub status: OperationStatus,
    pub started_at: i64,
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum OperationStatus {
    Started,
    Completed,
    Failed,
}

pub struct FilesystemTimeline {
    entries: Mutex<VecDeque<TimelineEntry>>,
    max_entries: usize,
}

impl FilesystemTimeline {
    pub fn new(max_entries: usize) -> Self {
        Self {
            entries: Mutex::new(VecDeque::with_capacity(max_entries)),
            max_entries,
        }
    }

    pub fn add_entry(&self, entry: TimelineEntry) {
        let mut entries = self.entries.lock().unwrap();
        if entries.len() >= self.max_entries {
            entries.pop_front();
        }
        entries.push_back(entry);
    }

    pub fn recent(&self, limit: usize) -> Vec<TimelineEntry> {
        let entries = self.entries.lock().unwrap();
        entries.iter().rev().take(limit).cloned().collect()
    }

    pub fn all(&self) -> Vec<TimelineEntry> {
        let entries = self.entries.lock().unwrap();
        entries.iter().cloned().collect()
    }

    pub fn clear(&self) {
        let mut entries = self.entries.lock().unwrap();
        entries.clear();
    }
}

impl Default for FilesystemTimeline {
    fn default() -> Self {
        Self::new(200)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeline_add_and_recent() {
        let tl = FilesystemTimeline::new(10);
        tl.add_entry(TimelineEntry {
            id: "1".into(),
            tool_name: "listFiles".into(),
            path: "/test".into(),
            status: OperationStatus::Completed,
            started_at: 1000,
            duration_ms: Some(5),
        });
        let recent = tl.recent(10);
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].tool_name, "listFiles");
    }

    #[test]
    fn test_timeline_capacity() {
        let tl = FilesystemTimeline::new(3);
        for i in 0..5 {
            tl.add_entry(TimelineEntry {
                id: format!("id-{i}"),
                tool_name: "tool".into(),
                path: "/p".into(),
                status: OperationStatus::Completed,
                started_at: i as i64,
                duration_ms: None,
            });
        }
        assert_eq!(tl.all().len(), 3);
        assert_eq!(tl.all()[0].id, "id-2");
    }

    #[test]
    fn test_timeline_clear() {
        let tl = FilesystemTimeline::new(10);
        tl.add_entry(TimelineEntry {
            id: "1".into(),
            tool_name: "tool".into(),
            path: "/p".into(),
            status: OperationStatus::Started,
            started_at: 0,
            duration_ms: None,
        });
        tl.clear();
        assert!(tl.all().is_empty());
    }

    #[test]
    fn test_timeline_recent_respects_limit() {
        let tl = FilesystemTimeline::new(10);
        for i in 0..5 {
            tl.add_entry(TimelineEntry {
                id: format!("id-{i}"),
                tool_name: "tool".into(),
                path: "/p".into(),
                status: OperationStatus::Started,
                started_at: i,
                duration_ms: None,
            });
        }
        let recent = tl.recent(2);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].id, "id-4");
        assert_eq!(recent[1].id, "id-3");
    }
}
