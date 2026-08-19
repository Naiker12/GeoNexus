export type Language = "es" | "en"

export interface TranslationDictionary {
  onboarding: {
    stepWelcomeTitle: string
    stepWelcomeDesc: string
    getStarted: string
    stepProviderTitle: string
    stepProviderDesc: string
    skipProvider: string
    localBadge: string
    cloudBadge: string
    gatewayBadge: string
    stepFolderTitle: string
    stepFolderDesc: string
    noFolderSelected: string
    browse: string
    back: string
    continue: string
    skipStep: string
    stepHealthTitle: string
    stepHealthDesc: string
    runHealthCheck: string
    checking: string
    dbLabel: string
    llmLabel: string
    pathsLabel: string
    telegramLabel: string
    allOk: string
    stepDoneTitle: string
    stepDoneDesc: string
    finishSetup: string
    skipFinish: string
  }
  sidebar: {
    newChat: string
    chat: string
    agents: string
    projects: string
    images: string
    moreTools: string
    memory: string
    automations: string
    monitor: string
    recents: string
    noRecentChats: string
    hub: string
    settings: string
  }
  topbar: {
    selectModel: string
    vramTelemetry: string
    reloadState: string
    toggleSidePanel: string
    searchPlaceholder: string
    noModels: string
    configureAi: string
  }
  chat: {
    greeting: string
    askPlaceholder: string
    supervision: string
    supervisionApprove: string
    supervisionAuto: string
    search: string
    code: string
    reasoning: string
    enabled: string
    disabled: string
    attachFiles: string
    webSearch: string
    deepResearch: string
    newPrompt: string
    deepResearchActive: string
    deepResearchDesc: string
  }
  config: {
    title: string
    subtitle: string
    generalGroup: string
    aiGroup: string
    dataGroup: string
    advancedGroup: string
    workspaceTab: string
    themeTab: string
    shortcutsTab: string
    providersTab: string
    connectorsTab: string
    allowedPathsTab: string
    telegramTab: string
    maintenanceTab: string
    languageSectionTitle: string
    languageSectionDesc: string
    spanish: string
    english: string
    saveChanges: string
    cancel: string
    savedToast: string
    savedToastDesc: string
  }
  common: {
    online: string
    offline: string
    connecting: string
    success: string
    error: string
    warning: string
  }
}

export const translations: Record<Language, TranslationDictionary> = {
  es: {
    // Onboarding
    onboarding: {
      stepWelcomeTitle: "Bienvenido a GeoNexus",
      stepWelcomeDesc:
        "Tu entorno de inteligencia artificial geoespacial y agentes autónomos. Elige tu proveedor para comenzar; podrás personalizarlo cuando desees en Configuración.",
      getStarted: "Comenzar",
      stepProviderTitle: "Elige tu Proveedor de IA",
      stepProviderDesc:
        "Selecciona el motor de inferencia principal para interactuar con tus agentes y datos espaciales.",
      skipProvider: "Configurar proveedor más tarde",
      localBadge: "LOCAL (OFFLINE)",
      cloudBadge: "CLOUD API",
      gatewayBadge: "GATEWAY",
      stepFolderTitle: "Directorio de Trabajo",
      stepFolderDesc:
        "Elige la carpeta base que contendrá tus proyectos y datos geoespaciales. GeoNexus tendrá acceso seguro a esta ubicación.",
      noFolderSelected: "Ninguna carpeta seleccionada",
      browse: "Examinar",
      back: "Atrás",
      continue: "Continuar",
      skipStep: "Saltar este paso",
      stepHealthTitle: "Diagnóstico del Sistema",
      stepHealthDesc:
        "Verificando la disponibilidad de la base de datos local, dependencias y conectividad.",
      runHealthCheck: "Ejecutar Diagnóstico",
      checking: "Verificando componentes...",
      dbLabel: "Base de Datos SQLite Local",
      llmLabel: "Proveedor LLM Configurado",
      pathsLabel: "Rutas de Archivos Permitidas",
      telegramLabel: "Bridge de Notificaciones / Telegram",
      allOk: "Todo el sistema está listo para operar.",
      stepDoneTitle: "¡Todo Listo!",
      stepDoneDesc:
        "Tu entorno GeoNexus ha sido configurado con éxito. Puedes cambiar tus modelos, temas y llaves API en cualquier momento desde Configuración.",
      finishSetup: "Iniciar GeoNexus",
      skipFinish: "Omitir y entrar",
    },
    // Sidebar
    sidebar: {
      newChat: "Nuevo Chat",
      chat: "Chat",
      agents: "Agentes & Tareas",
      projects: "Proyectos",
      images: "Imágenes",
      moreTools: "Más herramientas",
      memory: "Memoria y Grafo",
      automations: "Automatizaciones",
      monitor: "Monitor de VRAM & API",
      recents: "Recientes",
      noRecentChats: "Sin conversaciones recientes",
      hub: "Catálogo Hub",
      settings: "Configuración",
    },
    // Topbar
    topbar: {
      selectModel: "Seleccionar modelo",
      vramTelemetry: "Telemetría VRAM",
      reloadState: "Recargar estado",
      toggleSidePanel: "Alternar panel lateral",
      searchPlaceholder: "Buscar modelo o proveedor...",
      noModels: "No hay modelos configurados",
      configureAi: "Configurar Proveedores de IA",
    },
    // Chat & Composer
    chat: {
      greeting: "¿En qué estás pensando hoy?",
      askPlaceholder: "Pregunta lo que sea...",
      supervision: "Supervisión",
      supervisionApprove: "Supervisión: Aprobar",
      supervisionAuto: "Supervisión: Automático",
      search: "Búsqueda",
      code: "Código",
      reasoning: "Razonamiento",
      enabled: "Activado",
      disabled: "Desactivado",
      attachFiles: "Adjuntar fotos y archivos",
      webSearch: "Búsqueda Web",
      deepResearch: "Investigación Profunda",
      newPrompt: "Nueva Consulta",
      deepResearchActive: "Modo Investigación Profunda Activo",
      deepResearchDesc: "El agente realizará múltiples búsquedas iterativas para responder con evidencia técnica.",
    },
    // Configuration
    config: {
      title: "Configuración del Sistema",
      subtitle: "Ajustes globales de workspace, modelos IA, apariencia y conectores.",
      generalGroup: "GENERAL",
      aiGroup: "IA Y MODELOS",
      dataGroup: "CONEXIONES Y DATOS",
      advancedGroup: "AVANZADO Y SISTEMA",
      workspaceTab: "Workspace y Entorno",
      themeTab: "Temas y Apariencia",
      shortcutsTab: "Atajos de Teclado",
      providersTab: "Proveedores e IA",
      connectorsTab: "Conectores",
      allowedPathsTab: "Carpetas Permitidas",
      telegramTab: "Integración Telegram",
      maintenanceTab: "Mantenimiento & Logs",
      languageSectionTitle: "Idioma de la Aplicación",
      languageSectionDesc: "Selecciona el idioma principal de la interfaz y los asistentes.",
      spanish: "Español",
      english: "English",
      saveChanges: "Guardar Cambios",
      cancel: "Cancelar",
      savedToast: "Configuración guardada",
      savedToastDesc: "Los cambios han sido aplicados correctamente.",
    },
    // General
    common: {
      online: "En línea",
      offline: "Desconectado",
      connecting: "Conectando...",
      success: "Éxito",
      error: "Error",
      warning: "Advertencia",
    },
  },
  en: {
    // Onboarding
    onboarding: {
      stepWelcomeTitle: "Welcome to GeoNexus",
      stepWelcomeDesc:
        "Your geospatial AI environment and autonomous agent studio. Choose your AI provider to get started; you can customize everything later in Settings.",
      getStarted: "Get Started",
      stepProviderTitle: "Choose your AI Provider",
      stepProviderDesc:
        "Select the primary inference engine to power your geospatial reasoning agents and workflows.",
      skipProvider: "Configure provider later",
      localBadge: "LOCAL (OFFLINE)",
      cloudBadge: "CLOUD API",
      gatewayBadge: "GATEWAY",
      stepFolderTitle: "Choose a Workspace Folder",
      stepFolderDesc:
        "Pick a base folder that will contain your projects and spatial data. GeoNexus will have safe access to this directory.",
      noFolderSelected: "No folder selected",
      browse: "Browse",
      back: "Back",
      continue: "Continue",
      skipStep: "Skip this step",
      stepHealthTitle: "System Health Check",
      stepHealthDesc:
        "Verifying local database availability, execution permissions and agent dependencies.",
      runHealthCheck: "Run Health Check",
      checking: "Checking system components...",
      dbLabel: "Local SQLite Database",
      llmLabel: "Configured LLM Provider",
      pathsLabel: "Allowed Workspace Paths",
      telegramLabel: "Telegram Bridge / Notifications",
      allOk: "All system components are healthy and ready.",
      stepDoneTitle: "All Set!",
      stepDoneDesc:
        "Your GeoNexus workspace is ready to go. You can configure more models, themes, and tools anytime from Settings.",
      finishSetup: "Launch GeoNexus",
      skipFinish: "Skip & enter",
    },
    // Sidebar
    sidebar: {
      newChat: "New Chat",
      chat: "Chat",
      agents: "Agents & Tasks",
      projects: "Projects",
      images: "Images",
      moreTools: "More tools",
      memory: "Memory & Graph",
      automations: "Automations",
      monitor: "VRAM & API Monitor",
      recents: "Recents",
      noRecentChats: "No recent conversations",
      hub: "Catalog Hub",
      settings: "Settings",
    },
    // Topbar
    topbar: {
      selectModel: "Select model",
      vramTelemetry: "VRAM Telemetry",
      reloadState: "Reload state",
      toggleSidePanel: "Toggle side panel",
      searchPlaceholder: "Search model or provider...",
      noModels: "No models configured",
      configureAi: "Configure AI Providers",
    },
    // Chat & Composer
    chat: {
      greeting: "What are you thinking today?",
      askPlaceholder: "Ask anything...",
      supervision: "Supervision",
      supervisionApprove: "Supervision: Approve",
      supervisionAuto: "Supervision: Automatic",
      search: "Search",
      code: "Code",
      reasoning: "Reasoning",
      enabled: "Enabled",
      disabled: "Disabled",
      attachFiles: "Attach photos & files",
      webSearch: "Web Search",
      deepResearch: "Deep Research",
      newPrompt: "New Prompt",
      deepResearchActive: "Deep Research Mode Active",
      deepResearchDesc: "Agent will run multiple iterative searches to provide technical evidence.",
    },
    // Configuration
    config: {
      title: "System Settings",
      subtitle: "Global settings for workspace, AI models, appearance and connectors.",
      generalGroup: "GENERAL",
      aiGroup: "AI & MODELS",
      dataGroup: "CONNECTIONS & DATA",
      advancedGroup: "ADVANCED & SYSTEM",
      workspaceTab: "Workspace & Environment",
      themeTab: "Themes & Appearance",
      shortcutsTab: "Keyboard Shortcuts",
      providersTab: "Providers & AI",
      connectorsTab: "Connectors",
      allowedPathsTab: "Allowed Paths",
      telegramTab: "Telegram Integration",
      maintenanceTab: "Maintenance & Logs",
      languageSectionTitle: "Application Language",
      languageSectionDesc: "Select the primary language for the interface and assistants.",
      spanish: "Español",
      english: "English",
      saveChanges: "Save Changes",
      cancel: "Cancel",
      savedToast: "Settings saved",
      savedToastDesc: "Changes have been successfully applied.",
    },
    // General
    common: {
      online: "Online",
      offline: "Offline",
      connecting: "Connecting...",
      success: "Success",
      error: "Error",
      warning: "Warning",
    },
  },
}

