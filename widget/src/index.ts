import { ChatWidget } from './widget';
import { InitOptions } from './types';

// Global widget instances
const widgets: Map<string, ChatWidget> = new Map();

// Command queue (for commands called before script loads)
interface CommandQueue {
    q?: unknown[][];
}

// ChatFlowUI global interface
interface ChatFlowUIGlobal extends CommandQueue {
    (command: string, options?: unknown): void;
}

// Process a command
function processCommand(command: string, options?: unknown): void {
    switch (command) {
        case 'init':
            initWidget(options as InitOptions);
            break;
        case 'open':
            getWidget(options as string)?.open();
            break;
        case 'close':
            getWidget(options as string)?.close();
            break;
        case 'toggle':
            getWidget(options as string)?.toggle();
            break;
        case 'destroy':
            destroyWidget(options as string);
            break;
        default:
            console.warn(`[ChatFlowUI] Unknown command: ${command}`);
    }
}

// Initialize a widget
function initWidget(options: InitOptions): void {
    if (!options?.chatbotId) {
        console.error('[ChatFlowUI] chatbotId is required');
        return;
    }

    // Determine base URL
    const baseUrl = options.baseUrl || detectBaseUrl();

    // Create widget
    const widget = new ChatWidget(options.chatbotId, baseUrl);
    widgets.set(options.chatbotId, widget);
    widget.init();
}

// Get widget by ID (or first widget if no ID)
function getWidget(chatbotId?: string): ChatWidget | undefined {
    if (chatbotId) {
        return widgets.get(chatbotId);
    }
    // Return first widget
    return widgets.values().next().value;
}

// Destroy a widget
function destroyWidget(chatbotId?: string): void {
    const widget = getWidget(chatbotId);
    if (widget) {
        widget.destroy();
        if (chatbotId) {
            widgets.delete(chatbotId);
        } else {
            // Remove first widget
            const firstKey = widgets.keys().next().value;
            if (firstKey) widgets.delete(firstKey);
        }
    }
}

// Detect base URL from script src
function detectBaseUrl(): string {
    // Try to find our script tag
    const scripts = document.getElementsByTagName('script');
    for (const script of Array.from(scripts)) {
        if (script.src && (script.src.includes('widget.iife.js') || script.src.includes('widget.js'))) {
            try {
                const url = new URL(script.src);
                // Remove the filename to get the base path
                // e.g. http://domain.com/7861/widget/widget.iife.js -> http://domain.com/7861
                let basePath = url.pathname.substring(0, url.pathname.lastIndexOf('/widget/'));

                // Construct full base URL with path
                return `${url.protocol}//${url.host}${basePath}`;
            } catch (e) {
                console.warn('[ChatFlowUI] Failed to parse script URL:', e);
            }
        }
    }

    // Fallback to current origin
    return window.location.origin;
}

// Main function - this is what gets called by the embed snippet
function chatflowui(command: string, options?: unknown): void {
    processCommand(command, options);
}

// Expose globally
declare global {
    interface Window {
        chatflowui: ChatFlowUIGlobal;
        ChatFlowUI: typeof chatflowui;
    }
}

// Save queued commands before overwriting the global
const queuedCommands = (window.chatflowui as ChatFlowUIGlobal | undefined)?.q || [];

window.chatflowui = chatflowui as ChatFlowUIGlobal;
window.ChatFlowUI = chatflowui;

// Process any commands that were queued before script loaded
function processQueuedCommands(): void {
    for (const args of queuedCommands) {
        if (args.length >= 1) {
            processCommand(args[0] as string, args[1]);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processQueuedCommands);
} else {
    processQueuedCommands();
}

export { chatflowui, ChatWidget };
