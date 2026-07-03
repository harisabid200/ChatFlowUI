// Premium ChatFlowUI Widget Styles - Modern, Glassmorphic Design
import { ThemeConfig, ThemeLayout } from './types';

// Defaults applied when a theme has no `layout` block (backwards-compat with
// pre-layout themes). Matches the historical visual behavior exactly so
// existing themes look identical after this change.
export const DEFAULT_LAYOUT: ThemeLayout = {
    bubbleStyle: 'tail',
    density: 'cozy',
    headerStyle: 'standard',
    avatarShape: 'rounded',
};

export function resolveLayout(theme: ThemeConfig): ThemeLayout {
    return { ...DEFAULT_LAYOUT, ...(theme.layout ?? {}) };
}

export function generateStyles(theme: ThemeConfig, customCss?: string): string {
  const { colors, typography, dimensions, position } = theme;
  const layout = resolveLayout(theme);

  // Sanitize customCss to prevent style-tag breakout and CSS injection.
  // Strips </style> closers (HTML breakout), expression() (IE), and javascript: patterns.
  const safeCss = customCss
    ? customCss
        .replace(/<\/style>/gi, '')          // prevent </style> tag breakout → raw HTML
        .replace(/expression\s*\(/gi, '')     // block IE CSS expression() execution
        .replace(/javascript\s*:/gi, '')      // block javascript: URI in CSS values
        .replace(/url\s*\(\s*["']?\s*javascript/gi, 'url(')  // block url(javascript:...)
    : '';

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
      --cfui-user-icon-color: ${colors.userIconColor || 'white'};
      --cfui-bot-avatar-bg: ${colors.botAvatarBg || `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`};
      --cfui-bot-icon-color: ${colors.botIconColor || 'white'};
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
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 4px 14px rgba(0, 0, 0, 0.15),
        0 8px 32px var(--cfui-primary-glow);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }

    .cfui-launcher .cfui-icon-chat,
    .cfui-launcher .cfui-icon-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
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

    .cfui-launcher.cfui-open .cfui-icon-chat {
      display: none;
    }

    .cfui-launcher .cfui-icon-close {
      display: none;
    }

    .cfui-launcher.cfui-open .cfui-icon-close {
      display: inline-flex;
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
      color: white;
    }

    .cfui-header-logo.cfui-default-logo svg {
      width: 24px;
      height: 24px;
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
      background: var(--cfui-bot-avatar-bg);
      color: var(--cfui-bot-icon-color);
    }

    .cfui-message-avatar.cfui-user-avatar {
      background: linear-gradient(135deg, var(--cfui-user-avatar-bg) 0%, color-mix(in srgb, var(--cfui-user-avatar-bg) 80%, black) 100%);
      color: var(--cfui-user-icon-color);
    }

    /* Size avatar SVGs explicitly so they render at the same proportion
       regardless of browser default SVG sizing rules. */
    .cfui-message-avatar svg {
      width: 56%;
      height: 56%;
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

    /* color-mix with the bubble's own text color keeps code readable on both
       light and dark themes (fixed rgba(0,0,0) was invisible on dark bubbles) */
    .cfui-message code {
      background: color-mix(in srgb, currentColor 10%, transparent);
      padding: 3px 7px;
      border-radius: 6px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      font-size: 0.88em;
    }

    .cfui-message pre {
      background: color-mix(in srgb, currentColor 8%, transparent);
      padding: 14px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 10px 0;
      border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
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
    /* Error palette mixed with the theme background so the banner stays
       legible on dark themes instead of a fixed light-pink card */
    .cfui-error-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      margin: 8px 20px;
      background: color-mix(in srgb, #e53935 12%, var(--cfui-background));
      border: 1px solid color-mix(in srgb, #e53935 35%, var(--cfui-background));
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
      color: color-mix(in srgb, #e53935 70%, var(--cfui-bot-msg-text));
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

    /* =========================================
       Layout Variations - Structural (not color)
       Attribute selectors give one extra specificity step over the base
       rules above so these always win without needing !important.
    ========================================= */

    /* ── Bubble style ────────────────────────────────────────────── */

    /* rounded: symmetric large radius, no asymmetric tail */
    .cfui-widget[data-cfui-bubble="rounded"] .cfui-message-user {
      border-bottom-right-radius: 18px;
    }
    .cfui-widget[data-cfui-bubble="rounded"] .cfui-message-bot,
    .cfui-widget[data-cfui-bubble="rounded"] .cfui-typing {
      border-bottom-left-radius: 18px;
    }

    /* sharp: small uniform radius, professional */
    .cfui-widget[data-cfui-bubble="sharp"] .cfui-message {
      border-radius: 8px;
    }
    .cfui-widget[data-cfui-bubble="sharp"] .cfui-typing {
      border-radius: 8px;
    }

    /* card: flat, low-radius, bordered, no shadow */
    .cfui-widget[data-cfui-bubble="card"] .cfui-message {
      border-radius: 10px;
    }
    .cfui-widget[data-cfui-bubble="card"] .cfui-message-user {
      box-shadow: none;
      border: 1px solid color-mix(in srgb, var(--cfui-user-msg-bg) 70%, transparent);
    }
    .cfui-widget[data-cfui-bubble="card"] .cfui-message-bot {
      box-shadow: none;
      border: 1px solid var(--cfui-input-border);
    }
    .cfui-widget[data-cfui-bubble="card"] .cfui-typing {
      border-radius: 10px;
      border: 1px solid var(--cfui-input-border);
    }

    /* ── Density ─────────────────────────────────────────────────── */

    .cfui-widget[data-cfui-density="compact"] .cfui-messages {
      padding: 12px;
      gap: 8px;
    }
    .cfui-widget[data-cfui-density="compact"] .cfui-message {
      padding: 9px 13px;
    }
    .cfui-widget[data-cfui-density="compact"] .cfui-message-avatar {
      width: 28px;
      height: 28px;
    }
    .cfui-widget[data-cfui-density="compact"] .cfui-input-area {
      padding: 10px 12px 14px;
    }
    .cfui-widget[data-cfui-density="compact"] .cfui-input {
      padding: 10px 14px;
    }
    .cfui-widget[data-cfui-density="compact"] .cfui-send-btn {
      width: 42px;
      height: 42px;
    }

    .cfui-widget[data-cfui-density="comfortable"] .cfui-messages {
      padding: 28px 24px;
      gap: 22px;
    }
    .cfui-widget[data-cfui-density="comfortable"] .cfui-message {
      padding: 18px 22px;
    }
    .cfui-widget[data-cfui-density="comfortable"] .cfui-message-avatar {
      width: 36px;
      height: 36px;
    }
    .cfui-widget[data-cfui-density="comfortable"] .cfui-input-area {
      padding: 20px 22px 24px;
    }
    .cfui-widget[data-cfui-density="comfortable"] .cfui-input {
      padding: 16px 22px;
    }

    /* ── Header style ─────────────────────────────────────────────── */

    /* compact: thin header, no subtitle, no dot pattern */
    .cfui-widget[data-cfui-header="compact"] .cfui-header {
      padding: 12px 16px;
    }
    .cfui-widget[data-cfui-header="compact"] .cfui-header::after {
      display: none;
    }
    .cfui-widget[data-cfui-header="compact"] .cfui-header-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }
    .cfui-widget[data-cfui-header="compact"] .cfui-header-logo svg {
      width: 20px;
      height: 20px;
    }
    .cfui-widget[data-cfui-header="compact"] .cfui-header-text p {
      display: none;
    }
    .cfui-widget[data-cfui-header="compact"] .cfui-header-info {
      gap: 10px;
    }

    /* hero: taller header, larger avatar, larger title */
    .cfui-widget[data-cfui-header="hero"] .cfui-header {
      padding: 24px 24px;
    }
    .cfui-widget[data-cfui-header="hero"] .cfui-header-logo {
      width: 56px;
      height: 56px;
      border-radius: 16px;
    }
    .cfui-widget[data-cfui-header="hero"] .cfui-header-logo svg {
      width: 30px;
      height: 30px;
    }
    .cfui-widget[data-cfui-header="hero"] .cfui-header-text h3 {
      font-size: calc(var(--cfui-header-font-size) + 2px);
    }
    .cfui-widget[data-cfui-header="hero"] .cfui-header-text p {
      font-size: 13px;
      margin-top: 5px;
    }
    .cfui-widget[data-cfui-header="hero"] .cfui-status-indicator {
      width: 14px;
      height: 14px;
    }

    /* ── Avatar shape ─────────────────────────────────────────────── */

    .cfui-widget[data-cfui-avatar="circle"] .cfui-message-avatar {
      border-radius: 50%;
    }
    .cfui-widget[data-cfui-avatar="square"] .cfui-message-avatar {
      border-radius: 4px;
    }
    .cfui-widget[data-cfui-avatar="none"] .cfui-message-wrapper .cfui-message-avatar,
    .cfui-widget[data-cfui-avatar="none"] .cfui-typing-wrapper .cfui-message-avatar {
      display: none;
    }
    .cfui-widget[data-cfui-avatar="none"] .cfui-message-wrapper {
      gap: 0;
      max-width: 78%;
    }
    .cfui-widget[data-cfui-avatar="none"] .cfui-typing-wrapper {
      gap: 0;
    }

    /* Custom CSS Slot (Scoped to .cfui-widget) */
    ${safeCss ? `.cfui-widget { ${safeCss} }` : ''}
  `;
}

// SVG icon set. Notes for maintainers:
//  - All icons use `fill="currentColor"` so they inherit from `color:` on
//    their container (e.g. .cfui-bot-avatar uses --cfui-bot-icon-color).
//  - Avatars (`bot`, `user`) are SOLID FILLED with cutouts via fill-rule="evenodd"
//    so they render as crisp white silhouettes on colored backgrounds at 16–32px.
//  - The chat launcher icon is a friendly speech bubble with conversation dots,
//    a more recognizable "chat" semantic than the previous square outline.
export const icons = {
  chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M5 4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2.5v3a1 1 0 0 0 1.625.78L13.75 18H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5zm3.5 6.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z" clip-rule="evenodd"/></svg>`,
  close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
  send: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
  bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M12 1.5a1 1 0 0 1 1 1V4h4a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h4V2.5a1 1 0 0 1 1-1zM9 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.25 15.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5z" clip-rule="evenodd"/></svg>`,
  user: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 11.5a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 11.5zm0 1.75c-3.59 0-7.5 1.95-7.5 4.75v.75A1.5 1.5 0 0 0 6 20.25h12a1.5 1.5 0 0 0 1.5-1.5V18c0-2.8-3.91-4.75-7.5-4.75z"/></svg>`,
};
