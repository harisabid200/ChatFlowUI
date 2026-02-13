// Type definitions for widget configuration and messages

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
    userAvatarBg?: string;
}

export interface ThemeConfig {
    name: string;
    colors: ThemeColors;
    typography: {
        fontFamily: string;
        fontSize: string;
        headerFontSize: string;
    };
    dimensions: {
        width: string;
        height: string;
        borderRadius: string;
        buttonSize: string;
    };
    position: {
        placement: 'bottom-right' | 'bottom-left';
        offsetX: string;
        offsetY: string;
    };
    branding: {
        logo?: string;
        title: string;
        subtitle?: string;
        welcomeMessage: string;
        inputPlaceholder: string;
    };
    features: {
        soundEnabled: boolean;
        typingIndicator: boolean;
        showTimestamps: boolean;
    };
}


export interface ChatbotSettings {
    welcomeMessage: string;
    inputPlaceholder: string;
    headerTitle: string;
    headerSubtitle?: string;
    soundEnabled: boolean;
    typingIndicator: boolean;
    showTimestamps: boolean;
    maxMessageLength?: number;
    launcherLogo?: string;
    headerLogo?: string;
}

export interface PreChatFormField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'select';
    required: boolean;
    placeholder?: string;
    options?: string[];
}

export interface PreChatFormConfig {
    enabled: boolean;
    title: string;
    fields: PreChatFormField[];
}

export interface WidgetConfig {
    chatbotId: string;
    name: string;
    theme: ThemeConfig;
    customCss?: string;
    preChatForm?: PreChatFormConfig;
    settings: ChatbotSettings;
}

export interface ChatMessage {
    id: string;
    type: 'user' | 'bot' | 'system';
    content: string;
    quickReplies?: string[];
    timestamp: string;
}

export interface ConversationData {
    messages: ChatMessage[];
    metadata?: Record<string, string>;
    preChatCompleted: boolean;
}

export interface InitOptions {
    chatbotId: string;
    baseUrl?: string;
}
