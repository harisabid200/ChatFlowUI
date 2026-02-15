import { WidgetConfig, ChatMessage, PreChatFormConfig } from './types';
import { StorageManager } from './storage';
import { SocketClient } from './socket';
import { parseMarkdown, formatTime, generateId } from './markdown';
import { generateStyles, icons } from './styles';

export class ChatWidget {
    private config: WidgetConfig | null = null;
    private baseUrl: string;
    private chatbotId: string;
    private storage: StorageManager;
    private socket: SocketClient | null = null;
    private container: HTMLElement | null = null;
    private messagesContainer: HTMLElement | null = null;
    private inputElement: HTMLInputElement | null = null;
    private isOpen = false;
    private isTyping = false;
    private isPending = false;
    private quickReplies: string[] = [];

    constructor(chatbotId: string, baseUrl: string) {
        this.chatbotId = chatbotId;
        this.baseUrl = baseUrl;
        this.storage = new StorageManager(chatbotId);
    }

    async init(): Promise<void> {
        try {
            // Fetch widget configuration
            const response = await fetch(`${this.baseUrl}/widget/${this.chatbotId}/config`);
            if (!response.ok) {
                throw new Error('Failed to load widget configuration');
            }
            this.config = await response.json();

            // Inject styles
            this.injectStyles();

            // Render widget
            this.render();

            // WebSocket is lazy-connected on first open (not on page load)
            // This avoids unnecessary connections for users who never open the chat

            // Restore previous state
            this.restoreState();
        } catch (error) {
            console.error('[ChatFlowUI] Failed to initialize:', error);
        }
    }

    private injectStyles(): void {
        if (!this.config) return;

        // Load Google Fonts non-blocking (instead of render-blocking CSS @import)
        if (!document.getElementById('cfui-fonts')) {
            const link = document.createElement('link');
            link.id = 'cfui-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            link.media = 'print';
            link.onload = function () { (this as HTMLLinkElement).media = 'all'; };
            document.head.appendChild(link);
        }

        const styleId = 'cfui-styles';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = generateStyles(this.config.theme, this.config.customCss);
    }

    private render(): void {
        if (!this.config) return;

        const { theme, settings, preChatForm } = this.config;

        // Create widget container
        const widget = document.createElement('div');
        widget.className = 'cfui-widget';
        widget.innerHTML = `
      <button class="cfui-launcher${settings.launcherLogo ? ' cfui-has-logo' : ''}" aria-label="Open chat">
        ${settings.launcherLogo
                ? `<img class="cfui-launcher-logo" src="${settings.launcherLogo}" alt="Chat">`
                : `<svg class="cfui-icon-chat" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="white"/></svg>`
            }
        <svg class="cfui-icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg>
      </button>
      
      <div class="cfui-container">
        <div class="cfui-header">
          <div class="cfui-header-info">
            <div class="cfui-header-avatar">
              ${settings.headerLogo
                ? `<img class="cfui-header-logo" src="${settings.headerLogo}" alt="">`
                : theme.branding.logo
                    ? `<img class="cfui-header-logo" src="${theme.branding.logo}" alt="">`
                    : `<div class="cfui-header-logo cfui-default-logo">${icons.bot}</div>`
            }
              <div class="cfui-status-indicator"></div>
            </div>
            <div class="cfui-header-text">
              <h3>${settings.headerTitle || theme.branding.title}</h3>
              ${settings.headerSubtitle || theme.branding.subtitle ? `<p>${settings.headerSubtitle || theme.branding.subtitle}</p>` : '<p>Online</p>'}
            </div>
          </div>
          <div class="cfui-header-actions">
            ${settings.soundEnabled ? `<button class="cfui-header-btn cfui-sound-btn" aria-label="Toggle sound" title="Toggle sound">
              ${this.storage.isSoundMuted() ? icons.mute : icons.sound}
            </button>` : ''}
            <button class="cfui-header-btn cfui-refresh-btn" aria-label="Restart chat" title="Restart chat">
              ${icons.refresh}
            </button>
            <button class="cfui-header-btn cfui-close-btn" aria-label="Close chat" title="Close">
              ${icons.close}
            </button>
          </div>
        </div>
        
        <div class="cfui-messages"></div>
        
        <div class="cfui-quick-replies"></div>
        
        <div class="cfui-input-area">
          <input 
            type="text" 
            class="cfui-input" 
            placeholder="${settings.inputPlaceholder || theme.branding.inputPlaceholder}"
            aria-label="Type a message"
          >
          <button class="cfui-send-btn" aria-label="Send message">
            ${icons.send}
          </button>
        </div>
      </div>
    `;

        document.body.appendChild(widget);
        this.container = widget;
        this.messagesContainer = widget.querySelector('.cfui-messages');
        this.inputElement = widget.querySelector('.cfui-input');

        // Bind events
        this.bindEvents();

        // Show pre-chat form if needed
        const conversation = this.storage.getConversation();
        if (preChatForm?.enabled && !conversation.preChatCompleted) {
            this.showPreChatForm(preChatForm);
        }
    }

    private bindEvents(): void {
        if (!this.container) return;

        // Launcher button
        const launcher = this.container.querySelector('.cfui-launcher') as HTMLButtonElement;
        launcher.addEventListener('click', () => this.toggle());

        // Close button
        const closeBtn = this.container.querySelector('.cfui-close-btn');
        closeBtn?.addEventListener('click', () => this.close());

        // Sound toggle
        const soundBtn = this.container.querySelector('.cfui-sound-btn');
        soundBtn?.addEventListener('click', () => this.toggleSound());

        // Refresh button
        const refreshBtn = this.container.querySelector('.cfui-refresh-btn');
        refreshBtn?.addEventListener('click', () => this.restartChat());

        // Input handling
        if (this.inputElement) {
            this.inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Character counter
            this.inputElement.addEventListener('input', () => {
                this.updateCharacterCount();
            });
        }

        // Send button
        const sendBtn = this.container.querySelector('.cfui-send-btn');
        sendBtn?.addEventListener('click', () => this.sendMessage());

        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    private setupSocket(): void {
        const sessionId = this.storage.getSessionId();
        this.socket = new SocketClient(this.baseUrl, this.chatbotId, sessionId);

        this.socket.setMessageHandler((data) => {
            this.hideTyping();

            if (data.message) {
                this.addMessage({
                    id: generateId(),
                    type: 'bot',
                    content: data.message,
                    quickReplies: data.quickReplies,
                    timestamp: data.timestamp,
                });
            }

            if (data.quickReplies?.length) {
                this.showQuickReplies(data.quickReplies);
            }

            // Unlock input after receiving async response
            this.setPending(false);

            this.playSound();
        });

        this.socket.connect();
    }

    private restoreState(): void {
        // Restore open state
        if (this.storage.isWidgetOpen()) {
            this.open();
        }

        // Restore messages
        const conversation = this.storage.getConversation();
        if (conversation.messages.length > 0) {
            conversation.messages.forEach((msg) => {
                this.renderMessage(msg, false);
            });
        } else if (this.config?.settings.welcomeMessage) {
            // Show welcome message
            this.addMessage({
                id: generateId(),
                type: 'bot',
                content: this.config.settings.welcomeMessage,
                timestamp: new Date().toISOString(),
            });
        }
    }

    toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open(): void {
        const container = this.container?.querySelector('.cfui-container');
        const launcher = this.container?.querySelector('.cfui-launcher');
        container?.classList.add('cfui-open');
        launcher?.classList.add('cfui-open');
        this.container?.classList.add('cfui-mobile-open');
        this.isOpen = true;
        this.storage.setWidgetOpen(true);

        // Lazy WebSocket: connect only when user first opens the chat
        if (!this.socket) {
            this.setupSocket();
        }

        this.inputElement?.focus();
        this.scrollToBottom();
    }

    close(): void {
        const container = this.container?.querySelector('.cfui-container');
        const launcher = this.container?.querySelector('.cfui-launcher');
        container?.classList.remove('cfui-open');
        launcher?.classList.remove('cfui-open');
        this.container?.classList.remove('cfui-mobile-open');
        this.isOpen = false;
        this.storage.setWidgetOpen(false);
    }

    private async sendMessage(retryContent?: string): Promise<void> {
        const content = retryContent || this.inputElement?.value.trim();

        if (!content) return;
        if (this.isPending && !retryContent) return;

        // Character limit validation (default 4000)
        const maxLength = this.config?.settings.maxMessageLength || 4000;
        if (content.length > maxLength) {
            this.addSystemMessage(`Message too long. Maximum ${maxLength} characters allowed.`);
            return;
        }

        if (!retryContent && this.inputElement) {
            this.inputElement.value = '';
        }
        this.hideQuickReplies();
        this.hideErrorMessage();

        // Lock input while waiting for response
        this.setPending(true);

        // Add user message (only if not a retry)
        if (!retryContent) {
            const userMessage: ChatMessage = {
                id: generateId(),
                type: 'user',
                content,
                timestamp: new Date().toISOString(),
            };
            this.addMessage(userMessage);
        }

        // Show typing indicator
        this.showTyping();

        // Start slow response timer (show "still thinking" after 8s)
        let slowTimer: ReturnType<typeof setTimeout> | null = null;
        const showSlowIndicator = () => {
            slowTimer = setTimeout(() => {
                this.updateTypingText('Still thinking...');
            }, 8000);
        };
        showSlowIndicator();

        // Retry logic with exponential backoff
        const maxRetries = 3;
        const baseDelay = 1000;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const conversation = this.storage.getConversation();

                // Fetch with timeout (30 seconds)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const response = await fetch(`${this.baseUrl}/widget/${this.chatbotId}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: this.storage.getSessionId(),
                        message: content,
                        metadata: conversation.metadata,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                if (slowTimer) clearTimeout(slowTimer);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }

                const data = await response.json();

                // If we got an immediate response (webhook returned synchronously)
                if (data.response?.message) {
                    this.hideTyping();
                    this.setPending(false);
                    this.addMessage({
                        id: generateId(),
                        type: 'bot',
                        content: data.response.message,
                        quickReplies: data.response.quickReplies,
                        timestamp: new Date().toISOString(),
                    });

                    if (data.response.quickReplies?.length) {
                        this.showQuickReplies(data.response.quickReplies);
                    }

                    this.playSound();
                }
                // Note: For async WebSocket responses, setPending(false) is called in socket message handler

                return; // Success, exit retry loop

            } catch (error) {
                lastError = error as Error;

                if (slowTimer) clearTimeout(slowTimer);

                // Don't retry on abort (user cancelled or timeout)
                if ((error as Error).name === 'AbortError') {
                    lastError = new Error('Request timed out');
                    break;
                }

                // Don't retry on 4xx errors (client errors)
                if ((error as Error).message.includes('4')) {
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    this.updateTypingText(`Retrying... (${attempt + 2}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    showSlowIndicator();
                }
            }
        }

        // All retries failed
        console.error('[ChatFlowUI] Send message error:', lastError);
        this.hideTyping();
        this.setPending(false);
        this.showErrorMessage(this.getErrorMessage(lastError), content);
    }

    private getErrorMessage(error: Error | null): string {
        const message = error?.message?.toLowerCase() || '';

        if (message.includes('timeout') || message.includes('abort')) {
            return "The response is taking too long. The server might be busy.";
        }
        if (message.includes('network') || message.includes('fetch')) {
            return "Network error. Please check your internet connection.";
        }
        if (message.includes('404')) {
            return "Chat service is not available. Please try again later.";
        }
        if (message.includes('429')) {
            return "Too many requests. Please wait a moment.";
        }
        if (message.includes('500') || message.includes('502') || message.includes('503')) {
            return "Server is experiencing issues. Please try again.";
        }
        if (message.includes('origin')) {
            return "Connection not allowed from this website.";
        }

        return "Something went wrong. Please try again.";
    }

    private showErrorMessage(message: string, retryContent: string): void {
        this.hideSystemMessage();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'cfui-error-message';
        errorDiv.id = 'cfui-error-msg';
        errorDiv.innerHTML = `
            <div class="cfui-error-icon">⚠️</div>
            <div class="cfui-error-text">${message}</div>
            <button class="cfui-retry-btn">Retry</button>
        `;

        const retryBtn = errorDiv.querySelector('.cfui-retry-btn');
        retryBtn?.addEventListener('click', () => {
            this.hideErrorMessage();
            this.sendMessage(retryContent);
        });

        this.messagesContainer?.appendChild(errorDiv);
        this.scrollToBottom();
    }

    private hideErrorMessage(): void {
        document.getElementById('cfui-error-msg')?.remove();
    }

    private addSystemMessage(message: string): void {
        this.addMessage({
            id: generateId(),
            type: 'system',
            content: message,
            timestamp: new Date().toISOString(),
        });
    }

    private hideSystemMessage(): void {
        // Remove temporary system messages (not stored ones)
        const systemMsgs = this.messagesContainer?.querySelectorAll('.cfui-message-system');
        systemMsgs?.forEach(msg => msg.closest('.cfui-message-wrapper')?.remove());
    }

    private updateTypingText(text: string): void {
        const typing = document.getElementById('cfui-typing-indicator');
        if (typing) {
            const textEl = typing.querySelector('.cfui-typing-text');
            if (textEl) {
                textEl.textContent = text;
            } else {
                const span = document.createElement('span');
                span.className = 'cfui-typing-text';
                span.textContent = text;
                typing.querySelector('.cfui-typing')?.appendChild(span);
            }
        }
    }

    private updateCharacterCount(): void {
        if (!this.inputElement || !this.container) return;

        const maxLength = this.config?.settings.maxMessageLength || 4000;
        const currentLength = this.inputElement.value.length;
        const percentage = (currentLength / maxLength) * 100;

        let counter = this.container.querySelector('.cfui-char-counter') as HTMLElement;

        // Only show when approaching limit (75%+)
        if (percentage >= 75) {
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'cfui-char-counter';
                const inputWrapper = this.container.querySelector('.cfui-input-wrapper');
                inputWrapper?.appendChild(counter);
            }

            counter.textContent = `${currentLength} / ${maxLength}`;
            counter.classList.toggle('cfui-char-warning', percentage >= 90);
            counter.classList.toggle('cfui-char-limit', currentLength >= maxLength);
        } else if (counter) {
            counter.remove();
        }
    }

    private addMessage(message: ChatMessage): void {
        this.storage.addMessage(message);
        this.renderMessage(message, true);
    }

    private renderMessage(message: ChatMessage, animate: boolean): void {
        if (!this.messagesContainer) return;

        const wrapper = document.createElement('div');
        const isUser = message.type === 'user';
        const isBot = message.type === 'bot';

        wrapper.className = `cfui-message-wrapper ${isUser ? 'cfui-user' : 'cfui-bot'}`;
        if (!animate) wrapper.style.animation = 'none';

        const content = parseMarkdown(message.content);
        const showTimestamp = this.config?.theme.features.showTimestamps ?? true;

        wrapper.innerHTML = `
            ${isBot ? `<div class="cfui-message-avatar cfui-bot-avatar">${icons.bot}</div>` : ''}
            ${isUser ? `<div class="cfui-message-avatar cfui-user-avatar">${icons.user}</div>` : ''}
            <div class="cfui-message-content">
                <div class="cfui-message cfui-message-${message.type}">${content}</div>
                ${showTimestamp ? `<div class="cfui-timestamp">${formatTime(message.timestamp)}</div>` : ''}
            </div>
        `;

        this.messagesContainer.appendChild(wrapper);

        // For bot messages, scroll to show the start of the message
        // For user messages, scroll to bottom as usual
        if (isBot) {
            this.scrollToMessage(wrapper);
        } else {
            this.scrollToBottom();
        }
    }

    private showTyping(): void {
        if (this.isTyping || !this.messagesContainer) return;
        if (!this.config?.theme.features.typingIndicator) return;

        this.isTyping = true;

        const wrapper = document.createElement('div');
        wrapper.className = 'cfui-typing-wrapper';
        wrapper.id = 'cfui-typing-indicator';
        wrapper.innerHTML = `
            <div class="cfui-message-avatar cfui-bot-avatar">${icons.bot}</div>
            <div class="cfui-typing">
                <div class="cfui-typing-dot"></div>
                <div class="cfui-typing-dot"></div>
                <div class="cfui-typing-dot"></div>
            </div>
        `;
        this.messagesContainer.appendChild(wrapper);
        this.scrollToBottom();
    }

    private hideTyping(): void {
        this.isTyping = false;
        const typing = document.getElementById('cfui-typing-indicator');
        typing?.remove();
    }

    private setPending(pending: boolean): void {
        this.isPending = pending;

        // Update input and send button states
        const inputArea = this.container?.querySelector('.cfui-input-area');
        const sendBtn = this.container?.querySelector('.cfui-send-btn') as HTMLButtonElement;

        if (this.inputElement) {
            this.inputElement.disabled = pending;
            if (pending) {
                this.inputElement.placeholder = 'Waiting for response...';
            } else {
                this.inputElement.placeholder = this.config?.settings.inputPlaceholder || 'Type a message...';
                this.inputElement.focus();
            }
        }

        if (sendBtn) {
            sendBtn.disabled = pending;
        }

        if (inputArea) {
            if (pending) {
                inputArea.classList.add('cfui-pending');
            } else {
                inputArea.classList.remove('cfui-pending');
            }
        }
    }

    private showQuickReplies(replies: string[]): void {
        const container = this.container?.querySelector('.cfui-quick-replies');
        if (!container) return;

        this.quickReplies = replies;
        container.innerHTML = replies
            .map((reply) => `<button class="cfui-quick-reply">${reply}</button>`)
            .join('');

        // Bind click events
        container.querySelectorAll('.cfui-quick-reply').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (this.inputElement) {
                    this.inputElement.value = replies[index];
                    this.sendMessage();
                }
            });
        });
    }

    private hideQuickReplies(): void {
        const container = this.container?.querySelector('.cfui-quick-replies');
        if (container) {
            container.innerHTML = '';
        }
        this.quickReplies = [];
    }

    private showPreChatForm(config: PreChatFormConfig): void {
        if (!this.messagesContainer) return;

        const form = document.createElement('div');
        form.className = 'cfui-prechat';
        form.innerHTML = `
      <h4>${config.title}</h4>
      ${config.fields
                .map((field) => {
                    if (field.type === 'select') {
                        return `
              <div class="cfui-prechat-field">
                <label for="cfui-field-${field.id}">${field.label}${field.required ? ' *' : ''}</label>
                <select id="cfui-field-${field.id}" ${field.required ? 'required' : ''}>
                  <option value="">Select...</option>
                  ${(field.options || []).map((opt) => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              </div>
            `;
                    }
                    return `
            <div class="cfui-prechat-field">
              <label for="cfui-field-${field.id}">${field.label}${field.required ? ' *' : ''}</label>
              <input 
                type="${field.type}" 
                id="cfui-field-${field.id}"
                placeholder="${field.placeholder || ''}"
                ${field.required ? 'required' : ''}
              >
            </div>
          `;
                })
                .join('')}
      <button class="cfui-prechat-submit">Start Chat</button>
    `;

        // Hide input area during pre-chat
        const inputArea = this.container?.querySelector('.cfui-input-area') as HTMLElement;
        if (inputArea) inputArea.style.display = 'none';

        this.messagesContainer.appendChild(form);

        // Handle submit
        const submitBtn = form.querySelector('.cfui-prechat-submit');
        submitBtn?.addEventListener('click', () => {
            const metadata: Record<string, string> = {};
            let isValid = true;

            config.fields.forEach((field) => {
                const input = form.querySelector(`#cfui-field-${field.id}`) as HTMLInputElement | HTMLSelectElement;
                if (input) {
                    if (field.required && !input.value.trim()) {
                        isValid = false;
                        input.style.borderColor = 'red';
                    } else {
                        input.style.borderColor = '';
                        metadata[field.id] = input.value.trim();
                    }
                }
            });

            if (isValid) {
                this.storage.setPreChatMetadata(metadata);
                form.remove();
                if (inputArea) inputArea.style.display = 'flex';

                // Show welcome message
                if (this.config?.settings.welcomeMessage) {
                    this.addMessage({
                        id: generateId(),
                        type: 'bot',
                        content: this.config.settings.welcomeMessage,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        });
    }

    private toggleSound(): void {
        const muted = !this.storage.isSoundMuted();
        this.storage.setSoundMuted(muted);

        const btn = this.container?.querySelector('.cfui-sound-btn');
        if (btn) {
            btn.innerHTML = muted ? icons.mute : icons.sound;
        }
    }

    private playSound(): void {
        // Check user's local preference first (mute button in widget)
        if (this.storage.isSoundMuted()) return;

        // Check if sound is enabled in chatbot settings (configured by admin)
        if (!this.config?.settings.soundEnabled) return;

        // Simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch {
            // Audio not supported
        }
    }

    private restartChat(): void {
        // Clear all chat state
        this.storage.clearSession();
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
        this.hideQuickReplies();
        this.hideErrorMessage();

        // Disconnect socket and clear reference so lazy-connect creates a fresh one
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        // Reset pending state
        this.setPending(false);
        this.hideTyping();

        // Show pre-chat form if needed
        const preChatForm = this.config?.preChatForm;
        if (preChatForm?.enabled) {
            this.showPreChatForm(preChatForm);
        } else if (this.config?.settings.welcomeMessage) {
            this.addMessage({
                id: generateId(),
                type: 'bot',
                content: this.config.settings.welcomeMessage,
                timestamp: new Date().toISOString(),
            });
        }
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    private scrollToMessage(messageElement: HTMLElement): void {
        if (!this.messagesContainer) return;

        // Use scrollIntoView for intelligent scrolling that respects container boundaries
        // 'nearest' means it only scrolls if the element isn't already visible
        // This prevents unnecessary jumps and ensures the full message is visible
        requestAnimationFrame(() => {
            messageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',   // Scroll minimally to make it visible
                inline: 'nearest'   // Don't scroll horizontally
            });
        });
    }


    destroy(): void {
        this.socket?.disconnect();
        this.container?.remove();
        const styles = document.getElementById('cfui-styles');
        styles?.remove();
    }
}
