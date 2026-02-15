// Premium ChatFlowUI Widget Styles - Modern, Glassmorphic Design
import { ThemeConfig } from './types';

export function generateStyles(theme: ThemeConfig, customCss?: string): string {
  const { colors, typography, dimensions, position } = theme;

  // Helper to detect if a color value is a gradient
  const isGradient = (value: string) => value.includes('gradient');

  // Generate header background CSS (handle solid colors and gradients)
  const headerBgCss = isGradient(colors.headerBg)
    ? `background: ${colors.headerBg};`
    : `background: linear-gradient(135deg, ${colors.headerBg} 0%, color-mix(in srgb, ${colors.headerBg} 85%, black) 100%);`;

  // Generate user message background CSS
  const userMsgBgCss = isGradient(colors.userMessageBg)
    ? `background: ${colors.userMessageBg};`
    : `background: linear-gradient(135deg, ${colors.userMessageBg} 0%, color-mix(in srgb, ${colors.userMessageBg} 90%, black) 100%);`;

  // User message box shadow (skip color-mix for gradients)
  const userMsgShadowCss = isGradient(colors.userMessageBg)
    ? `box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);`
    : `box-shadow: 0 2px 12px color-mix(in srgb, ${colors.userMessageBg} 30%, transparent);`;

  // Status indicator border (can't use gradient as border-color)
  const statusBorderColor = isGradient(colors.headerBg)
    ? colors.primary
    : colors.headerBg;

  const positionStyles = position.placement === 'bottom-right'
    ? `right: ${position.offsetX}; left: auto;`
    : `left: ${position.offsetX}; right: auto;`;

  return `
    /* =========================================
       ChatFlowUI Widget - Premium Edition
       Modern, Glassmorphic, Animated
    ========================================= */

    /* Google Fonts loaded non-blocking via <link> in widget.ts */

    .cfui-widget {
      --cfui-primary: ${colors.primary};
      --cfui-primary-hover: ${colors.primaryHover};
      --cfui-primary-glow: ${colors.primary}40;
      --cfui-background: ${colors.background};
      --cfui-header-bg: ${colors.headerBg};
      --cfui-header-text: ${colors.headerText};
      --cfui-user-msg-bg: ${colors.userMessageBg};
      --cfui-user-msg-text: ${colors.userMessageText};
      --cfui-bot-msg-bg: ${colors.botMessageBg};
      --cfui-bot-msg-text: ${colors.botMessageText};
      --cfui-input-bg: ${colors.inputBg};
      --cfui-input-text: ${colors.inputText};
      --cfui-input-border: ${colors.inputBorder};
      --cfui-font-family: 'Inter', ${typography.fontFamily};
      --cfui-user-avatar-bg: ${colors.userAvatarBg || '#64748b'};
      --cfui-font-size: ${typography.fontSize};
      --cfui-header-font-size: ${typography.headerFontSize};
      --cfui-border-radius: ${dimensions.borderRadius};
      --cfui-width: ${dimensions.width};
      --cfui-height: ${dimensions.height};
      --cfui-button-size: ${dimensions.buttonSize};
      
      position: fixed;
      bottom: ${position.offsetY};
      ${positionStyles}
      z-index: 999999;
      font-family: var(--cfui-font-family);
      font-size: var(--cfui-font-size);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* =========================================
       Launcher Button - Premium FAB
    ========================================= */
    .cfui-launcher {
      position: relative;
      width: var(--cfui-button-size);
      height: var(--cfui-button-size);
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cfui-primary) 0%, var(--cfui-primary-hover) 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 4px 14px rgba(0, 0, 0, 0.15),
        0 8px 32px var(--cfui-primary-glow);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    .cfui-launcher::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
      pointer-events: none;
    }

    .cfui-launcher::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--cfui-primary);
      opacity: 0;
      animation: cfui-pulse-ring 2s infinite;
    }

    /* Disable pulse animation when custom logo is present */
    .cfui-launcher.cfui-has-logo::after {
      display: none;
    }

    @keyframes cfui-pulse-ring {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .cfui-launcher:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.2),
        0 12px 48px var(--cfui-primary-glow);
    }

    .cfui-launcher:active {
      transform: scale(0.95);
    }

    .cfui-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      transition: transform 0.3s ease;
    }

    .cfui-launcher:hover svg {
      transform: scale(1.1);
    }

    /* Launcher Logo Image */
    .cfui-launcher-logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .cfui-launcher.cfui-open svg.cfui-icon-chat {
      display: none;
    }

    .cfui-launcher svg.cfui-icon-close {
      display: none;
    }

    .cfui-launcher.cfui-open svg.cfui-icon-close {
      display: block;
    }

    /* Notification Badge */
    .cfui-launcher-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 22px;
      height: 22px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      font-size: 11px;
      font-weight: 700;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
      animation: cfui-badge-bounce 0.5s ease;
      border: 2px solid white;
    }

    @keyframes cfui-badge-bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    /* =========================================
       Chat Container - Glassmorphic Card
    ========================================= */
    .cfui-container {
      display: none;
      flex-direction: column;
      width: var(--cfui-width);
      height: var(--cfui-height);
      max-height: 85vh;
      background: var(--cfui-background);
      border-radius: var(--cfui-border-radius);
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      overflow: hidden;
      position: absolute;
      bottom: calc(var(--cfui-button-size) + 20px);
      ${position.placement === 'bottom-right' ? 'right: 0;' : 'left: 0;'}
      transform-origin: bottom ${position.placement === 'bottom-right' ? 'right' : 'left'};
      opacity: 0;
      transform: scale(0.9) translateY(20px);
      transition: none;
    }

    .cfui-container.cfui-open {
      display: flex;
      animation: cfui-container-open 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .cfui-container.cfui-closing {
      animation: cfui-container-close 0.25s ease-in forwards;
    }

    @keyframes cfui-container-open {
      0% {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes cfui-container-close {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      100% {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
    }

    /* =========================================
       Header - Gradient with Blur
    ========================================= */
    .cfui-header {
      ${headerBgCss}
      color: var(--cfui-header-text);
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .cfui-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    }

    .cfui-header::after {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      pointer-events: none;
    }

    .cfui-header-info {
      display: flex;
      align-items: center;
      gap: 14px;
      position: relative;
      z-index: 1;
    }

    .cfui-header-avatar {
      position: relative;
    }

    .cfui-header-logo {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      object-fit: cover;
      border: 2px solid rgba(255,255,255,0.2);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .cfui-header-logo.cfui-default-logo {
      background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cfui-header-logo.cfui-default-logo svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .cfui-status-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      border: 2px solid ${statusBorderColor};
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
    }

    .cfui-header-text {
      flex: 1;
    }

    .cfui-header-text h3 {
      margin: 0;
      font-size: var(--cfui-header-font-size);
      font-weight: 700;
      letter-spacing: -0.02em;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .cfui-header-text p {
      margin: 3px 0 0;
      font-size: 12px;
      opacity: 0.85;
      font-weight: 500;
    }

    .cfui-header-actions {
      display: flex;
      gap: 4px;
      position: relative;
      z-index: 1;
    }

    .cfui-header-btn {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--cfui-header-text);
      cursor: pointer;
      padding: 8px;
      border-radius: 10px;
      opacity: 0.9;
      transition: all 0.2s ease;
    }

    .cfui-header-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .cfui-header-btn:active {
      transform: scale(0.95);
    }

    .cfui-header-btn svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    /* =========================================
       Messages Area - Elegant Scrolling
    ========================================= */
    .cfui-messages {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: linear-gradient(180deg, 
        color-mix(in srgb, var(--cfui-background) 98%, var(--cfui-header-bg)) 0%,
        var(--cfui-background) 100%
      );
    }

    /* Custom Scrollbar */
    .cfui-messages::-webkit-scrollbar {
      width: 6px;
    }

    .cfui-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .cfui-messages::-webkit-scrollbar-thumb {
      background: var(--cfui-input-border);
      border-radius: 3px;
    }

    .cfui-messages::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--cfui-input-border) 80%, black);
    }

    /* =========================================
       Message Bubbles - Premium Design
    ========================================= */
    .cfui-message-wrapper {
      display: flex;
      gap: 10px;
      max-width: 90%;
      animation: cfui-message-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      scroll-margin-top: 20px;
    }

    .cfui-message-wrapper.cfui-user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .cfui-message-wrapper.cfui-bot {
      align-self: flex-start;
    }

    @keyframes cfui-message-appear {
      0% {
        opacity: 0;
        transform: translateY(16px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .cfui-message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .cfui-message-avatar.cfui-bot-avatar {
      background: linear-gradient(135deg, var(--cfui-primary) 0%, var(--cfui-primary-hover) 100%);
      color: white;
    }

    .cfui-message-avatar.cfui-user-avatar {
      background: linear-gradient(135deg, var(--cfui-user-avatar-bg) 0%, color-mix(in srgb, var(--cfui-user-avatar-bg) 80%, black) 100%);
      color: white;
    }

    .cfui-message-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cfui-message {
      padding: 14px 18px;
      border-radius: 18px;
      line-height: 1.55;
      position: relative;
      word-wrap: break-word;
    }

    .cfui-message-user {
      ${userMsgBgCss}
      color: var(--cfui-user-msg-text);
      border-bottom-right-radius: 6px;
      ${userMsgShadowCss}
    }

    .cfui-message-bot {
      background: var(--cfui-bot-msg-bg);
      color: var(--cfui-bot-msg-text);
      border-bottom-left-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      border: 1px solid color-mix(in srgb, var(--cfui-input-border) 50%, transparent);
    }

    .cfui-message a {
      color: var(--cfui-primary);
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .cfui-message a:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    .cfui-message code {
      background: rgba(0, 0, 0, 0.08);
      padding: 3px 7px;
      border-radius: 6px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      font-size: 0.88em;
    }

    .cfui-message pre {
      background: rgba(0, 0, 0, 0.06);
      padding: 14px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 10px 0;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .cfui-message pre code {
      background: none;
      padding: 0;
      font-size: 0.85em;
    }

    .cfui-message ul,
    .cfui-message ol {
      margin: 8px 0;
      padding-left: 20px;
    }

    .cfui-message li {
      margin: 4px 0;
    }

    .cfui-timestamp {
      font-size: 11px;
      opacity: 0.5;
      margin-top: 2px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }

    .cfui-message-user + .cfui-timestamp {
      text-align: right;
    }

    /* =========================================
       Typing Indicator - Elegant Animation
    ========================================= */
    .cfui-typing-wrapper {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      animation: cfui-message-appear 0.3s ease;
    }

    .cfui-typing {
      display: flex;
      gap: 5px;
      padding: 16px 20px;
      background: var(--cfui-bot-msg-bg);
      border-radius: 18px;
      border-bottom-left-radius: 6px;
      border: 1px solid color-mix(in srgb, var(--cfui-input-border) 50%, transparent);
    }

    .cfui-typing-dot {
      width: 8px;
      height: 8px;
      background: var(--cfui-primary);
      border-radius: 50%;
      animation: cfui-typing-bounce 1.4s infinite ease-in-out;
    }

    .cfui-typing-dot:nth-child(1) { animation-delay: 0s; }
    .cfui-typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .cfui-typing-dot:nth-child(3) { animation-delay: 0.3s; }

    @keyframes cfui-typing-bounce {
      0%, 60%, 100% { 
        transform: translateY(0);
        opacity: 0.4;
      }
      30% { 
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    .cfui-typing-text {
      font-size: 12px;
      color: var(--cfui-bot-msg-text);
      opacity: 0.7;
      margin-left: 8px;
      white-space: nowrap;
    }

    /* =========================================
       Error Messages - Friendly & Actionable
    ========================================= */
    .cfui-error-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      margin: 8px 20px;
      background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
      border: 1px solid #ffcdd2;
      border-radius: 14px;
      animation: cfui-message-appear 0.3s ease;
    }

    .cfui-error-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .cfui-error-text {
      flex: 1;
      font-size: 13px;
      color: #c62828;
      line-height: 1.4;
    }

    .cfui-retry-btn {
      background: linear-gradient(135deg, var(--cfui-primary) 0%, var(--cfui-primary-hover) 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .cfui-retry-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px var(--cfui-primary-glow);
    }

    .cfui-retry-btn:active {
      transform: scale(0.95);
    }

    /* =========================================
       Quick Replies - Pill Buttons
    ========================================= */
    .cfui-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 4px 20px 16px;
      animation: cfui-message-appear 0.4s ease;
    }

    .cfui-quick-reply {
      background: var(--cfui-background);
      border: 1.5px solid var(--cfui-primary);
      color: var(--cfui-primary);
      padding: 10px 18px;
      border-radius: 24px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 8px transparent;
    }

    .cfui-quick-reply:hover {
      background: var(--cfui-primary);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--cfui-primary-glow);
    }

    .cfui-quick-reply:active {
      transform: translateY(0) scale(0.95);
    }

    /* =========================================
       Input Area - Modern Glass Effect
    ========================================= */
    .cfui-input-area {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 16px 20px;
      border-top: 1px solid var(--cfui-input-border);
      background: linear-gradient(180deg, 
        var(--cfui-input-bg) 0%,
        color-mix(in srgb, var(--cfui-input-bg) 95%, var(--cfui-header-bg)) 100%
      );
    }

    .cfui-input-wrapper {
      flex: 1;
      position: relative;
    }

    .cfui-input {
      width: 100%;
      border: 2px solid var(--cfui-input-border);
      background: var(--cfui-background);
      color: var(--cfui-input-text);
      padding: 14px 18px;
      border-radius: 28px;
      font-size: var(--cfui-font-size);
      font-family: inherit;
      outline: none;
      transition: all 0.25s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .cfui-input:focus {
      border-color: var(--cfui-primary);
      box-shadow: 0 0 0 4px var(--cfui-primary-glow);
    }

    .cfui-input::placeholder {
      color: var(--cfui-input-text);
      opacity: 0.45;
    }

    .cfui-send-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cfui-primary) 0%, var(--cfui-primary-hover) 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 4px 12px var(--cfui-primary-glow);
      flex-shrink: 0;
    }

    .cfui-send-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px var(--cfui-primary-glow);
    }

    .cfui-send-btn:active {
      transform: scale(0.95);
    }

    .cfui-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .cfui-send-btn svg {
      width: 22px;
      height: 22px;
      fill: white;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
      transition: transform 0.2s ease;
    }

    .cfui-send-btn:not(:disabled):hover svg {
      transform: translateX(2px);
    }

    /* Disabled/Pending States */
    .cfui-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: color-mix(in srgb, var(--cfui-background) 90%, #888);
    }

    .cfui-input-area.cfui-pending {
      opacity: 0.85;
    }

    .cfui-input-area.cfui-pending .cfui-input {
      background: color-mix(in srgb, var(--cfui-background) 95%, #ccc);
    }

    /* Character Counter */
    .cfui-char-counter {
      position: absolute;
      right: 12px;
      bottom: -18px;
      font-size: 11px;
      color: var(--cfui-input-text);
      opacity: 0.6;
      transition: all 0.2s ease;
    }

    .cfui-char-counter.cfui-char-warning {
      color: #e65100;
      opacity: 0.9;
    }

    .cfui-char-counter.cfui-char-limit {
      color: #c62828;
      opacity: 1;
      font-weight: 600;
    }

    /* =========================================
       Pre-chat Form - Clean Card Design
    ========================================= */
    .cfui-prechat {
      flex: 1;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }

    .cfui-prechat-header {
      text-align: center;
      margin-bottom: 8px;
    }

    .cfui-prechat-header h4 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 700;
      color: var(--cfui-input-text);
      letter-spacing: -0.02em;
    }

    .cfui-prechat-header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.7;
      color: var(--cfui-input-text);
    }

    .cfui-prechat-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cfui-prechat-field label {
      font-size: 13px;
      font-weight: 600;
      color: var(--cfui-input-text);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .cfui-prechat-field label .cfui-required {
      color: #ef4444;
    }

    .cfui-prechat-field input,
    .cfui-prechat-field select {
      padding: 14px 16px;
      border: 2px solid var(--cfui-input-border);
      border-radius: 12px;
      font-size: var(--cfui-font-size);
      font-family: inherit;
      background: var(--cfui-background);
      color: var(--cfui-input-text);
      transition: all 0.2s ease;
    }

    .cfui-prechat-field input:focus,
    .cfui-prechat-field select:focus {
      outline: none;
      border-color: var(--cfui-primary);
      box-shadow: 0 0 0 4px var(--cfui-primary-glow);
    }

    .cfui-prechat-field input::placeholder {
      opacity: 0.45;
    }

    .cfui-prechat-submit {
      margin-top: 12px;
      padding: 16px;
      background: linear-gradient(135deg, var(--cfui-primary) 0%, var(--cfui-primary-hover) 100%);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 4px 14px var(--cfui-primary-glow);
    }

    .cfui-prechat-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px var(--cfui-primary-glow);
    }

    .cfui-prechat-submit:active {
      transform: translateY(0) scale(0.98);
    }

    /* =========================================
       Welcome Message - Special Styling
    ========================================= */
    .cfui-welcome {
      text-align: center;
      padding: 24px 20px;
      animation: cfui-welcome-appear 0.6s ease;
    }

    .cfui-welcome-emoji {
      font-size: 48px;
      margin-bottom: 16px;
      display: block;
    }

    .cfui-welcome-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--cfui-input-text);
      margin: 0 0 8px;
    }

    .cfui-welcome-subtitle {
      font-size: 14px;
      color: var(--cfui-input-text);
      opacity: 0.7;
      margin: 0;
    }

    @keyframes cfui-welcome-appear {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* =========================================
       Powered By Footer
    ========================================= */
    .cfui-powered-by {
      text-align: center;
      padding: 10px;
      font-size: 11px;
      color: var(--cfui-input-text);
      opacity: 0.4;
      border-top: 1px solid var(--cfui-input-border);
    }

    .cfui-powered-by a {
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }

    .cfui-powered-by a:hover {
      opacity: 1;
    }

    /* =========================================
       Mobile Responsiveness - Full Screen
    ========================================= */
    @media (max-width: 480px) {
      .cfui-container {
        position: fixed;
        width: 100vw;
        height: 100vh;
        height: 100dvh; /* Dynamic viewport height for mobile browsers */
        max-height: 100vh;
        max-width: 100vw;
        border-radius: 0;
        bottom: 0;
        right: 0;
        left: 0;
        top: 0;
        transform: none;
        transform-origin: bottom center;
      }

      .cfui-container.cfui-open {
        animation: cfui-mobile-open 0.3s ease-out forwards;
      }

      .cfui-container.cfui-closing {
        animation: cfui-mobile-close 0.3s ease-in forwards;
      }

      @keyframes cfui-mobile-open {
        0% {
          opacity: 0;
          transform: translateY(100%);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes cfui-mobile-close {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(100%);
        }
      }

      .cfui-widget.cfui-mobile-open .cfui-launcher {
        display: none;
      }

      /* Larger touch target for mobile (≥48px per mobile-design skill) */
      .cfui-launcher {
        width: 56px;
        height: 56px;
      }

      .cfui-launcher svg {
        width: 26px;
        height: 26px;
      }

      .cfui-header {
        padding: 16px 20px;
        padding-top: max(16px, env(safe-area-inset-top));
      }

      .cfui-messages {
        padding: 16px;
      }

      .cfui-input-area {
        padding: 12px 12px;
        padding-bottom: max(16px, env(safe-area-inset-bottom));
      }

      .cfui-input {
        padding: 14px 16px;
        font-size: 16px; /* Prevents iOS auto-zoom on input focus */
      }

      .cfui-send-btn {
        width: 48px;
        height: 48px;
      }

      .cfui-message-wrapper {
        max-width: 95%;
      }

      /* Ensure header buttons are large enough for touch */
      .cfui-header-btn {
        padding: 10px;
        min-width: 44px;
        min-height: 44px;
      }
    }

    /* =========================================
       Dark Mode Enhancements
    ========================================= */
    @media (prefers-color-scheme: dark) {
      .cfui-container {
        box-shadow: 
          0 25px 50px -12px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .cfui-message-bot {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }

    /* =========================================
       Reduced Motion Preference
    ========================================= */
    @media (prefers-reduced-motion: reduce) {
      .cfui-launcher,
      .cfui-container,
      .cfui-message,
      .cfui-quick-reply,
      .cfui-send-btn {
        animation: none !important;
        transition: none !important;
      }

      .cfui-launcher::after {
        animation: none !important;
      }
    }

    /* Custom CSS Slot */
    ${customCss || ''}
  `;
}

export const icons = {
  chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5-1.35C8.47 21.51 10.18 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.55 0-3.02-.44-4.27-1.2l-.3-.18-3.12.82.83-3.04-.2-.32A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.39-5.15c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41-.14-.01-.3-.01-.46-.01s-.42.06-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
  bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1a7 7 0 01-7 7H10a7 7 0 01-7-7H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-4 9a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
};
