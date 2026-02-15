// User type
export interface User {
    id: number;
    username: string;
    passwordHash: string;
    mustChangePassword: boolean;
    createdAt: string;
}

// Chatbot configuration
export interface Chatbot {
    id: string;
    name: string;
    webhookUrl: string;
    webhookSecret?: string;
    allowedOrigins: string[];
    themeId?: string;
    customCss?: string;
    preChatForm?: PreChatFormConfig;
    settings: ChatbotSettings;
    launcherLogo?: string;
    headerLogo?: string;
    createdAt: string;
    updatedAt: string;
}

// Pre-chat form configuration
export interface PreChatFormField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'select';
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select type
}

export interface PreChatFormConfig {
    enabled: boolean;
    title: string;
    fields: PreChatFormField[];
}

// Chatbot settings
export interface ChatbotSettings {
    welcomeMessage: string;
    inputPlaceholder: string;
    headerTitle: string;
    headerSubtitle?: string;
    soundEnabled: boolean;
    typingIndicator: boolean;
    showTimestamps: boolean;
}

// Theme configuration
export interface ThemeColors {
    primary: string;
    primaryHover: string;
    background: string;
    headerBg: string;
    headerText: string;
    userMessageBg: string;
    userMessageText: string;
    botMessageBg: string;
    botMessageText: string;
    inputBg: string;
    inputText: string;
    inputBorder: string;
    userAvatarBg: string;
    botAvatarBg?: string;
    botIconColor?: string;
    userIconColor?: string;
}

export interface ThemeTypography {
    fontFamily: string;
    fontSize: string;
    headerFontSize: string;
}

export interface ThemeDimensions {
    width: string;
    height: string;
    borderRadius: string;
    buttonSize: string;
}

export interface ThemePosition {
    placement: 'bottom-right' | 'bottom-left';
    offsetX: string;
    offsetY: string;
}

export interface ThemeBranding {
    logo?: string;
    title: string;
    subtitle?: string;
    welcomeMessage: string;
    inputPlaceholder: string;
}

export interface ThemeFeatures {
    soundEnabled: boolean;
    typingIndicator: boolean;
    showTimestamps: boolean;
}

export interface ThemeConfig {
    name: string;
    colors: ThemeColors;
    typography: ThemeTypography;
    dimensions: ThemeDimensions;
    position: ThemePosition;
    branding: ThemeBranding;
    features: ThemeFeatures;
}

export interface Theme {
    id: string;
    name: string;
    isPreset: boolean;
    config: ThemeConfig;
    createdAt: string;
}

// API request/response types
export interface SendMessageRequest {
    sessionId: string;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface BotResponse {
    message: string;
    quickReplies?: string[];
    metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
    chatbotId: string;
    sessionId: string;
    message: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

// JWT payload
export interface JwtPayload {
    userId: number;
    username: string;
    tokenVersion: number;
    iac?: number;
    exp?: number;
}
