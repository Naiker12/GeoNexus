pub mod framework_detect;
pub mod templates;

pub use framework_detect::{FrameworkDetect, FrameworkInfo, ProjectAnalysis, ProjectType};
pub use templates::{Template, TemplateFactory, TemplateFile};
