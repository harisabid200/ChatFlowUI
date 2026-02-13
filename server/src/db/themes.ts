import { getDb, saveDatabase } from './index.js';
import { ThemeConfig } from '../types/index.js';

// Default theme
const defaultTheme: ThemeConfig = {
    name: 'Default',
    colors: {
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        background: '#ffffff',
        headerBg: '#6366f1',
        headerText: '#ffffff',
        userMessageBg: '#6366f1',
        userMessageText: '#ffffff',
        botMessageBg: '#f3f4f6',
        botMessageText: '#1f2937',
        inputBg: '#ffffff',
        inputText: '#1f2937',
        inputBorder: '#d1d5db',
        userAvatarBg: '#64748b',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '16px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Chat with us',
        subtitle: 'We typically reply within minutes',
        welcomeMessage: 'Hello! How can I help you today?',
        inputPlaceholder: 'Type a message...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
};

// Dark Modern theme
const darkModernTheme: ThemeConfig = {
    name: 'Dark Modern',
    colors: {
        primary: '#8b5cf6',
        primaryHover: '#7c3aed',
        background: '#1f2937',
        headerBg: '#111827',
        headerText: '#f9fafb',
        userMessageBg: '#8b5cf6',
        userMessageText: '#ffffff',
        botMessageBg: '#374151',
        botMessageText: '#f9fafb',
        inputBg: '#374151',
        inputText: '#f9fafb',
        inputBorder: '#4b5563',
        userAvatarBg: '#6b7280',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '16px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Support',
        subtitle: "We're here to help",
        welcomeMessage: 'Hello! How can I assist you today?',
        inputPlaceholder: 'Type your message...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
};

// Minimal theme
const minimalTheme: ThemeConfig = {
    name: 'Minimal',
    colors: {
        primary: '#000000',
        primaryHover: '#374151',
        background: '#ffffff',
        headerBg: '#ffffff',
        headerText: '#000000',
        userMessageBg: '#000000',
        userMessageText: '#ffffff',
        botMessageBg: '#f3f4f6',
        botMessageText: '#000000',
        inputBg: '#ffffff',
        inputText: '#000000',
        inputBorder: '#d1d5db',
        userAvatarBg: '#6b7280',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '360px',
        height: '550px',
        borderRadius: '8px',
        buttonSize: '56px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Chat',
        subtitle: 'Simple and clean',
        welcomeMessage: 'Hi there! How can I help?',
        inputPlaceholder: 'Message...',
    },
    features: {
        soundEnabled: false,
        typingIndicator: true,
        showTimestamps: true,
    },
};

// Gradient theme
const gradientTheme: ThemeConfig = {
    name: 'Gradient',
    colors: {
        primary: '#ec4899',
        primaryHover: '#db2777',
        background: '#ffffff',
        headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        headerText: '#ffffff',
        userMessageBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        userMessageText: '#ffffff',
        botMessageBg: '#f3f4f6',
        botMessageText: '#1f2937',
        inputBg: '#ffffff',
        inputText: '#1f2937',
        inputBorder: '#d1d5db',
        userAvatarBg: '#667eea',
    },
    typography: {
        fontFamily: "'Outfit', 'Inter', sans-serif",
        fontSize: '14px',
        headerFontSize: '18px',
    },
    dimensions: {
        width: '400px',
        height: '620px',
        borderRadius: '24px',
        buttonSize: '64px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '24px',
        offsetY: '24px',
    },
    branding: {
        title: 'Hey there! 👋',
        subtitle: 'Ask us anything',
        welcomeMessage: "Welcome! I'm here to help you. What would you like to know?",
        inputPlaceholder: 'Ask me anything...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
};

// All preset themes
export const presetThemes: { id: string; config: ThemeConfig }[] = [
    { id: 'default', config: defaultTheme },
    { id: 'dark-modern', config: darkModernTheme },
    { id: 'minimal', config: minimalTheme },
    { id: 'gradient', config: gradientTheme },
];

// Seed preset themes if they don't exist
export function seedPresetThemes(): void {
    const db = getDb();

    for (const theme of presetThemes) {
        // Check if theme exists
        const existing = db.exec(`SELECT id FROM themes WHERE id = ?`, [theme.id]);
        if (existing.length === 0 || existing[0].values.length === 0) {
            db.run(
                `INSERT INTO themes (id, name, is_preset, config) VALUES (?, ?, 1, ?)`,
                [theme.id, theme.config.name, JSON.stringify(theme.config)]
            );
        }
    }
    saveDatabase();
}
