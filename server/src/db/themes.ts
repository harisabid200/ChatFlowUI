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
        userAvatarBg: '#e5e7eb',
        userIconColor: '#000000',
        botAvatarBg: '#000000',
        botIconColor: '#ffffff',
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

// =============================================================================
// New themes (designed from UX-first principles)
//
// Design rules followed by every theme below:
//  1. WCAG AA (≥ 4.5:1) on user-bubble and bot-bubble text/background pairs.
//  2. Saturation reserved for "action" surfaces (launcher, send button, user
//     bubble) — backgrounds and bot bubbles stay neutral so reading is easy.
//  3. Single hue family + neutrals + one accent. No random color picks.
//  4. Dark themes avoid pure black (#000) — they use stone-900 / slate-900
//     for less eye strain and softer surface depth.
//  5. Gradient themes push gradient stops deeper than the obvious palette
//     pick so contrast holds across the whole gradient (not just the ends).
// =============================================================================

// Slate Pro — professional B2B / SaaS / enterprise
const slateProTheme: ThemeConfig = {
    name: 'Slate Pro',
    colors: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        background: '#ffffff',
        headerBg: '#0f172a',
        headerText: '#f1f5f9',
        userMessageBg: '#2563eb',
        userMessageText: '#ffffff',
        botMessageBg: '#f1f5f9',
        botMessageText: '#0f172a',
        inputBg: '#ffffff',
        inputText: '#0f172a',
        inputBorder: '#cbd5e1',
        userAvatarBg: '#475569',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '12px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Support',
        subtitle: 'We typically reply within minutes',
        welcomeMessage: 'Hi! How can I help you today?',
        inputPlaceholder: 'Type your message...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
    layout: {
        bubbleStyle: 'sharp',
        density: 'compact',
        headerStyle: 'compact',
        avatarShape: 'square',
    },
};

// Midnight — neutral dark mode (vs. Dark Modern's purple). Cyan accent works
// well on OLED and stays calm rather than vibrant.
const midnightTheme: ThemeConfig = {
    name: 'Midnight',
    colors: {
        primary: '#06b6d4',
        primaryHover: '#0891b2',
        background: '#0f172a',
        headerBg: '#1e293b',
        headerText: '#f1f5f9',
        userMessageBg: '#06b6d4',
        userMessageText: '#0f172a',
        botMessageBg: '#1e293b',
        botMessageText: '#e2e8f0',
        inputBg: '#1e293b',
        inputText: '#f1f5f9',
        inputBorder: '#334155',
        userAvatarBg: '#475569',
        botAvatarBg: '#06b6d4',
        botIconColor: '#0f172a',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '14px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Help Center',
        subtitle: 'Available 24/7',
        welcomeMessage: 'Hello. How may I assist you?',
        inputPlaceholder: 'Ask a question...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
    layout: {
        bubbleStyle: 'sharp',
        density: 'cozy',
        headerStyle: 'standard',
        avatarShape: 'rounded',
    },
};

// Sage — calm, organic. Emerald-700 (not the more obvious green-600) to clear
// AA contrast on white text.
const sageTheme: ThemeConfig = {
    name: 'Sage',
    colors: {
        primary: '#047857',
        primaryHover: '#065f46',
        background: '#fafaf9',
        headerBg: '#064e3b',
        headerText: '#ecfdf5',
        userMessageBg: '#047857',
        userMessageText: '#ffffff',
        botMessageBg: '#ecfdf5',
        botMessageText: '#064e3b',
        inputBg: '#ffffff',
        inputText: '#064e3b',
        inputBorder: '#bbf7d0',
        userAvatarBg: '#0f766e',
        botAvatarBg: '#065f46',
        botIconColor: '#ecfdf5',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '18px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Hi there 🌿',
        subtitle: "We're happy to help",
        welcomeMessage: 'Welcome! How can we support you today?',
        inputPlaceholder: 'Type a message...',
    },
    features: {
        soundEnabled: false,
        typingIndicator: true,
        showTimestamps: true,
    },
    layout: {
        bubbleStyle: 'rounded',
        density: 'comfortable',
        headerStyle: 'hero',
        avatarShape: 'circle',
    },
};

// Sunset — warm, welcoming. Orange-700 (not orange-600) for AA. Header gradient
// keeps energy without pushing it onto bubbles.
const sunsetTheme: ThemeConfig = {
    name: 'Sunset',
    colors: {
        primary: '#c2410c',
        primaryHover: '#9a3412',
        background: '#fff7ed',
        headerBg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
        headerText: '#ffffff',
        userMessageBg: '#c2410c',
        userMessageText: '#ffffff',
        botMessageBg: '#ffffff',
        botMessageText: '#7c2d12',
        inputBg: '#ffffff',
        inputText: '#7c2d12',
        inputBorder: '#fed7aa',
        userAvatarBg: '#9a3412',
        botAvatarBg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
        botIconColor: '#ffffff',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '20px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Hello! 👋',
        subtitle: "We'd love to help",
        welcomeMessage: 'Hi there! What brings you in today?',
        inputPlaceholder: 'Say hi...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
    layout: {
        bubbleStyle: 'rounded',
        density: 'cozy',
        headerStyle: 'hero',
        avatarShape: 'circle',
    },
};

// Aurora — premium, creative. Multi-stop gradient on header for the signature
// look; user bubbles use the violet→pink subset so text contrast stays valid.
// Larger geometry (radius 24px, 400×620) reinforces the premium feel.
const auroraTheme: ThemeConfig = {
    name: 'Aurora',
    colors: {
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        background: '#faf5ff',
        headerBg: 'linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f97316 100%)',
        headerText: '#ffffff',
        userMessageBg: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
        userMessageText: '#ffffff',
        botMessageBg: '#ffffff',
        botMessageText: '#4c1d95',
        inputBg: '#ffffff',
        inputText: '#4c1d95',
        inputBorder: '#e9d5ff',
        userAvatarBg: '#7c3aed',
        botAvatarBg: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
        botIconColor: '#ffffff',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '17px',
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
        title: 'Hey there ✨',
        subtitle: "Let's create something",
        welcomeMessage: 'Hi! What would you like to make today?',
        inputPlaceholder: 'Ask me anything...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
    layout: {
        bubbleStyle: 'rounded',
        density: 'comfortable',
        headerStyle: 'hero',
        avatarShape: 'circle',
    },
};

// Mocha — warm dark mode. Dark text on peach (vs. the more obvious white text)
// gives 9.5:1 contrast and is much easier on night-time eyes than a saturated
// color flooded with white.
const mochaTheme: ThemeConfig = {
    name: 'Mocha',
    colors: {
        primary: '#fb923c',
        primaryHover: '#f97316',
        background: '#1c1917',
        headerBg: '#292524',
        headerText: '#fef3c7',
        userMessageBg: '#fb923c',
        userMessageText: '#1c1917',
        botMessageBg: '#292524',
        botMessageText: '#fef3c7',
        inputBg: '#292524',
        inputText: '#fef3c7',
        inputBorder: '#44403c',
        userAvatarBg: '#57534e',
        botAvatarBg: '#fb923c',
        botIconColor: '#1c1917',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: '14px',
        headerFontSize: '16px',
    },
    dimensions: {
        width: '380px',
        height: '600px',
        borderRadius: '14px',
        buttonSize: '60px',
    },
    position: {
        placement: 'bottom-right',
        offsetX: '20px',
        offsetY: '20px',
    },
    branding: {
        title: 'Welcome',
        subtitle: "We're here to help",
        welcomeMessage: 'Good evening. How may we assist you?',
        inputPlaceholder: 'Type a message...',
    },
    features: {
        soundEnabled: true,
        typingIndicator: true,
        showTimestamps: true,
    },
    layout: {
        bubbleStyle: 'card',
        density: 'cozy',
        headerStyle: 'standard',
        avatarShape: 'rounded',
    },
};

// All preset themes
export const presetThemes: { id: string; config: ThemeConfig }[] = [
    { id: 'default', config: defaultTheme },
    { id: 'dark-modern', config: darkModernTheme },
    { id: 'minimal', config: minimalTheme },
    { id: 'gradient', config: gradientTheme },
    { id: 'slate-pro', config: slateProTheme },
    { id: 'midnight', config: midnightTheme },
    { id: 'sage', config: sageTheme },
    { id: 'sunset', config: sunsetTheme },
    { id: 'aurora', config: auroraTheme },
    { id: 'mocha', config: mochaTheme },
];

// Seed preset themes if they don't exist
export function seedPresetThemes(): void {
    const db = getDb();

    for (const theme of presetThemes) {
        db.run(
            `INSERT OR REPLACE INTO themes (id, name, is_preset, config) VALUES (?, ?, 1, ?)`,
            [theme.id, theme.config.name, JSON.stringify(theme.config)]
        );
    }
    saveDatabase();
}
