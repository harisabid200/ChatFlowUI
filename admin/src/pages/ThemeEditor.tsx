import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, RotateCcw } from 'lucide-react';
import { themesApi, ThemeConfig } from '../api';
import Layout from '../components/Layout';


// ── SVG Icons (must stay in sync with widget/src/styles.ts `icons`) ──
const widgetIcons = {
    chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M5 4a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2.5v3a1 1 0 0 0 1.625.78L13.75 18H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5zm3.5 6.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm3.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z" clip-rule="evenodd"/></svg>`,
    sound: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/></svg>`,
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>`,
    bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M12 1.5a1 1 0 0 1 1 1V4h4a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h4V2.5a1 1 0 0 1 1-1zM9 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.25 15.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5z" clip-rule="evenodd"/></svg>`,
};

// ── Helper ──
const isGradient = (v: string) => v.includes('gradient');

// ── Form Field Components ──
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    if (isGradient(value)) {
        return (
            <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-700 font-medium truncate">{label}</label>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-52 px-2 py-1.5 text-xs border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    title={value}
                />
            </div>
        );
    }
    return (
        <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-700 font-medium truncate">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
            </div>
        </div>
    );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-700 font-medium truncate">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-700 font-medium truncate block mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
        </div>
    );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
            >
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">{children}</div>}
        </div>
    );
}

// ── Layout helpers (mirror widget/src/styles.ts so preview matches the live widget) ──

type LayoutResolved = {
    bubbleStyle: 'tail' | 'rounded' | 'sharp' | 'card';
    density: 'compact' | 'cozy' | 'comfortable';
    headerStyle: 'standard' | 'compact' | 'hero';
    avatarShape: 'circle' | 'rounded' | 'square' | 'none';
};

function resolveLayout(config: ThemeConfig): LayoutResolved {
    return {
        bubbleStyle: config.layout?.bubbleStyle ?? 'tail',
        density: config.layout?.density ?? 'cozy',
        headerStyle: config.layout?.headerStyle ?? 'standard',
        avatarShape: config.layout?.avatarShape ?? 'rounded',
    };
}

// Density tokens map directly to the same values used in widget/src/styles.ts.
const DENSITY_TOKENS = {
    compact: { messagesPad: '12px', messagesGap: '8px', msgPad: '9px 13px', avatarSize: 28, sendSize: 42 },
    cozy: { messagesPad: '20px', messagesGap: '16px', msgPad: '14px 18px', avatarSize: 32, sendSize: 44 },
    comfortable: { messagesPad: '28px 24px', messagesGap: '22px', msgPad: '18px 22px', avatarSize: 36, sendSize: 44 },
} as const;

const HEADER_TOKENS = {
    standard: { padding: '18px 20px', avatarSize: 44, avatarRadius: 14, svgSize: 24, showSubtitle: true, showPattern: true, titleScale: 0, subtitleSize: '12px' },
    compact: { padding: '12px 16px', avatarSize: 36, avatarRadius: 10, svgSize: 20, showSubtitle: false, showPattern: false, titleScale: 0, subtitleSize: '12px' },
    hero: { padding: '24px 24px', avatarSize: 56, avatarRadius: 16, svgSize: 30, showSubtitle: true, showPattern: true, titleScale: 2, subtitleSize: '13px' },
} as const;

function getBubbleRadius(bubbleStyle: LayoutResolved['bubbleStyle'], isUser: boolean): React.CSSProperties {
    switch (bubbleStyle) {
        case 'tail':
            return isUser
                ? { borderRadius: '18px', borderBottomRightRadius: '6px' }
                : { borderRadius: '18px', borderBottomLeftRadius: '6px' };
        case 'rounded':
            return { borderRadius: '18px' };
        case 'sharp':
            return { borderRadius: '8px' };
        case 'card':
            return { borderRadius: '10px' };
    }
}

function getAvatarRadius(shape: LayoutResolved['avatarShape']): string {
    switch (shape) {
        case 'circle': return '50%';
        case 'square': return '4px';
        case 'rounded': return '10px';
        case 'none': return '10px';
    }
}

// ── Bot Avatar Icon (small, for messages) ──
function BotAvatarIcon({ primary, primaryHover, avatarBg, iconColor, size, radius }: {
    primary: string; primaryHover: string; avatarBg?: string; iconColor?: string;
    size: number; radius: string;
}) {
    const background = avatarBg || `linear-gradient(135deg, ${primary} 0%, ${primaryHover} 100%)`;
    return (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: radius, flexShrink: 0,
            background,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            color: iconColor || 'white',
        }}>
            <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 1.5a1 1 0 0 1 1 1V4h4a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h4V2.5a1 1 0 0 1 1-1zM9 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM9.25 15.75a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5z" />
            </svg>
        </div>
    );
}

// ── User Avatar Icon (small, for messages) ──
function UserAvatarIcon({ avatarBg, iconColor, size, radius }: {
    avatarBg: string; iconColor?: string; size: number; radius: string;
}) {
    const bg = isGradient(avatarBg)
        ? avatarBg
        : `linear-gradient(135deg, ${avatarBg} 0%, color-mix(in srgb, ${avatarBg} 80%, black) 100%)`;
    return (
        <div style={{
            width: `${size}px`, height: `${size}px`, borderRadius: radius, flexShrink: 0,
            background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            color: iconColor || 'white',
        }}>
            <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 11.5a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 11.5zm0 1.75c-3.59 0-7.5 1.95-7.5 4.75v.75A1.5 1.5 0 0 0 6 20.25h12a1.5 1.5 0 0 0 1.5-1.5V18c0-2.8-3.91-4.75-7.5-4.75z" />
            </svg>
        </div>
    );
}

// ── Live Widget Preview (matches actual widget exactly) ──
function WidgetPreview({ config }: { config: ThemeConfig }) {
    const { colors, typography, dimensions } = config;
    const borderRadius = parseInt(dimensions.borderRadius) || 16;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const layout = resolveLayout(config);
    const density = DENSITY_TOKENS[layout.density];
    const headerTokens = HEADER_TOKENS[layout.headerStyle];
    const avatarRadius = getAvatarRadius(layout.avatarShape);
    const showAvatars = layout.avatarShape !== 'none';
    const isCard = layout.bubbleStyle === 'card';

    const headerBg = isGradient(colors.headerBg)
        ? colors.headerBg
        : `linear-gradient(135deg, ${colors.headerBg} 0%, color-mix(in srgb, ${colors.headerBg} 85%, black) 100%)`;

    const userBubbleStyle: React.CSSProperties = {
        background: isGradient(colors.userMessageBg)
            ? colors.userMessageBg
            : `linear-gradient(135deg, ${colors.userMessageBg} 0%, color-mix(in srgb, ${colors.userMessageBg} 90%, black) 100%)`,
        color: colors.userMessageText,
        padding: density.msgPad,
        ...getBubbleRadius(layout.bubbleStyle, true),
        lineHeight: '1.55',
        boxShadow: isCard
            ? 'none'
            : (isGradient(colors.userMessageBg)
                ? '0 2px 12px rgba(0, 0, 0, 0.15)'
                : `0 2px 12px color-mix(in srgb, ${colors.userMessageBg} 30%, transparent)`),
        border: isCard ? `1px solid color-mix(in srgb, ${colors.userMessageBg} 70%, transparent)` : 'none',
    };

    const botBubbleStyle: React.CSSProperties = {
        background: colors.botMessageBg,
        color: colors.botMessageText,
        padding: density.msgPad,
        ...getBubbleRadius(layout.bubbleStyle, false),
        lineHeight: '1.55',
        boxShadow: isCard ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
        border: isCard
            ? `1px solid ${colors.inputBorder}`
            : `1px solid color-mix(in srgb, ${colors.inputBorder} 50%, transparent)`,
    };

    const headerTitleSize = headerTokens.titleScale === 0
        ? typography.headerFontSize
        : `calc(${typography.headerFontSize} + ${headerTokens.titleScale}px)`;

    return (
        <div className="sticky top-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Live Preview</h3>

            <div style={{
                width: '340px',
                background: colors.background,
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset',
                fontFamily: `'Inter', ${typography.fontFamily}`,
                fontSize: typography.fontSize,
                lineHeight: '1.5',
            }}>
                {/* Header */}
                <div style={{
                    background: headerBg,
                    color: colors.headerText,
                    padding: headerTokens.padding,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {headerTokens.showPattern && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            pointerEvents: 'none',
                        }} />
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: layout.headerStyle === 'compact' ? '10px' : '14px', position: 'relative', zIndex: 1 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: `${headerTokens.avatarSize}px`, height: `${headerTokens.avatarSize}px`, borderRadius: `${headerTokens.avatarRadius}px`,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{ width: `${headerTokens.svgSize}px`, height: `${headerTokens.svgSize}px` }} dangerouslySetInnerHTML={{ __html: widgetIcons.bot }} />
                            </div>
                            <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: layout.headerStyle === 'hero' ? '14px' : '12px',
                                height: layout.headerStyle === 'hero' ? '14px' : '12px',
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                borderRadius: '50%',
                                border: `2px solid ${isGradient(colors.headerBg) ? colors.primary : colors.headerBg}`,
                                boxShadow: '0 0 0 2px rgba(34,197,94,0.3)',
                            }} />
                        </div>
                        <div>
                            <div style={{
                                fontSize: headerTitleSize, fontWeight: 700,
                                letterSpacing: '-0.02em',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}>
                                Chat with us
                            </div>
                            {headerTokens.showSubtitle && (
                                <div style={{ fontSize: headerTokens.subtitleSize, opacity: 0.85, fontWeight: 500, marginTop: layout.headerStyle === 'hero' ? '5px' : '3px' }}>
                                    Online
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', position: 'relative', zIndex: 1 }}>
                        {[widgetIcons.sound, widgetIcons.refresh, widgetIcons.close].map((icon, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: colors.headerText,
                                padding: '8px',
                                borderRadius: '10px',
                                width: '34px', height: '34px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{ width: '18px', height: '18px' }} dangerouslySetInnerHTML={{ __html: icon }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div style={{
                    padding: density.messagesPad,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: density.messagesGap,
                    minHeight: '240px',
                    background: colors.background,
                }}>
                    {/* Bot welcome */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: showAvatars ? '10px' : 0, maxWidth: showAvatars ? '90%' : '78%' }}>
                        {showAvatars && (
                            <BotAvatarIcon
                                primary={colors.primary}
                                primaryHover={colors.primaryHover}
                                avatarBg={colors.botAvatarBg}
                                iconColor={colors.botIconColor}
                                size={density.avatarSize}
                                radius={avatarRadius}
                            />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={botBubbleStyle}>
                                Hello! How can I help you today?
                            </div>
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>{nowStr}</span>
                        </div>
                    </div>

                    {/* User message */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: showAvatars ? '10px' : 0, maxWidth: showAvatars ? '90%' : '78%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                        {showAvatars && (
                            <UserAvatarIcon
                                avatarBg={colors.userAvatarBg}
                                iconColor={colors.userIconColor}
                                size={density.avatarSize}
                                radius={avatarRadius}
                            />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={userBubbleStyle}>
                                Hi! I need some help
                            </div>
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>{nowStr}</span>
                        </div>
                    </div>

                    {/* Bot reply */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: showAvatars ? '10px' : 0, maxWidth: showAvatars ? '90%' : '78%' }}>
                        {showAvatars && (
                            <BotAvatarIcon
                                primary={colors.primary}
                                primaryHover={colors.primaryHover}
                                avatarBg={colors.botAvatarBg}
                                iconColor={colors.botIconColor}
                                size={density.avatarSize}
                                radius={avatarRadius}
                            />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={botBubbleStyle}>
                                {"Sure! I'd be happy to assist you. 😊"}
                            </div>
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>{nowStr}</span>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    background: colors.background,
                }}>
                    <input
                        type="text"
                        readOnly
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            background: colors.inputBg,
                            color: colors.inputText,
                            border: `2px solid ${colors.inputBorder}`,
                            borderRadius: '14px',
                            padding: '12px 18px',
                            fontSize: typography.fontSize,
                            fontFamily: 'inherit',
                            outline: 'none',
                        }}
                    />
                    <div style={{
                        width: `${density.sendSize}px`, height: `${density.sendSize}px`, borderRadius: '14px', flexShrink: 0,
                        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 12px ${colors.primary}40`,
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Launcher Button Preview */}
            <div className="mt-6 flex items-center gap-4">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Launcher</span>
                <div style={{
                    width: dimensions.buttonSize,
                    height: dimensions.buttonSize,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 14px rgba(0,0,0,0.15), 0 8px 32px ${colors.primary}40`,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{ width: '28px', height: '28px', position: 'relative' }} dangerouslySetInnerHTML={{ __html: widgetIcons.chat }} />
                </div>
            </div>
        </div>
    );
}

// ── Main ThemeEditor Component ──
export default function ThemeEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: theme, isLoading } = useQuery({
        queryKey: ['themes', id],
        queryFn: () => themesApi.get(id!),
        enabled: !!id,
    });

    const [config, setConfig] = useState<ThemeConfig | null>(null);
    const [originalConfig, setOriginalConfig] = useState<ThemeConfig | null>(null);

    useEffect(() => {
        if (theme) {
            // Ensure userAvatarBg has a default for themes created before this field existed
            const normalized: ThemeConfig = {
                ...theme.config,
                colors: {
                    ...theme.config.colors,
                    userAvatarBg: theme.config.colors.userAvatarBg || '#64748b',
                },
            };
            setConfig(normalized);
            setOriginalConfig(normalized);
        }
    }, [theme]);

    const saveMutation = useMutation({
        mutationFn: (data: ThemeConfig) => themesApi.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['themes'] });
            navigate('/themes');
        },
    });

    const hasChanges = useMemo(() => {
        if (!config || !originalConfig) return false;
        return JSON.stringify(config) !== JSON.stringify(originalConfig);
    }, [config, originalConfig]);

    const updateColors = (key: string, value: string) => {
        if (!config) return;
        setConfig({ ...config, colors: { ...config.colors, [key]: value } });
    };
    const updateTypography = (key: string, value: string) => {
        if (!config) return;
        setConfig({ ...config, typography: { ...config.typography, [key]: value } });
    };
    const updateDimensions = (key: string, value: string) => {
        if (!config) return;
        setConfig({ ...config, dimensions: { ...config.dimensions, [key]: value } });
    };
    const updatePosition = (key: string, value: string) => {
        if (!config) return;
        setConfig({ ...config, position: { ...config.position, [key]: value } as ThemeConfig['position'] });
    };
    const updateName = (value: string) => {
        if (!config) return;
        setConfig({ ...config, name: value });
    };
    const updateLayout = (key: string, value: string) => {
        if (!config) return;
        const current = {
            bubbleStyle: config.layout?.bubbleStyle ?? 'tail',
            density: config.layout?.density ?? 'cozy',
            headerStyle: config.layout?.headerStyle ?? 'standard',
            avatarShape: config.layout?.avatarShape ?? 'rounded',
        };
        setConfig({
            ...config,
            layout: { ...current, [key]: value } as ThemeConfig['layout'],
        });
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </Layout>
        );
    }

    if (!config || !theme) {
        return (
            <Layout>
                <div className="text-center py-20 text-gray-500">Theme not found</div>
            </Layout>
        );
    }

    if (theme.isPreset) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto text-center py-20">
                    <p className="text-gray-600 mb-4">Preset themes cannot be edited. Duplicate it first to create a custom version.</p>
                    <button onClick={() => navigate('/themes')} className="text-primary-600 hover:underline">← Back to Themes</button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header Bar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/themes')} className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Edit Theme</h1>
                            <p className="text-sm text-gray-500">{config.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => originalConfig && setConfig({ ...originalConfig })}
                            disabled={!hasChanges}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition disabled:opacity-40"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </button>
                        <button
                            onClick={() => config && saveMutation.mutate(config)}
                            disabled={!hasChanges || saveMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-40 font-medium"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Theme
                        </button>
                    </div>
                </div>

                {saveMutation.isError && (
                    <div className="mb-6 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                        {saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save theme'}
                    </div>
                )}

                {/* Main Layout: Editor + Preview */}
                <div className="flex gap-8">
                    {/* Left: Editor Controls */}
                    <div className="flex-1 space-y-4 min-w-0 pb-10">
                        <Section title="Theme Name">
                            <TextField label="Name" value={config.name} onChange={updateName} />
                        </Section>

                        <Section title="Colors">
                            <p className="text-xs text-gray-400 -mt-1 mb-2">Use hex values (#000000) or CSS gradients for some fields</p>
                            <ColorField label="Primary" value={config.colors.primary} onChange={(v) => updateColors('primary', v)} />
                            <ColorField label="Primary Hover" value={config.colors.primaryHover} onChange={(v) => updateColors('primaryHover', v)} />
                            <ColorField label="Background" value={config.colors.background} onChange={(v) => updateColors('background', v)} />
                            <hr className="border-gray-100 !my-3" />
                            <p className="text-xs font-medium text-gray-500">Header</p>
                            <ColorField label="Header Background" value={config.colors.headerBg} onChange={(v) => updateColors('headerBg', v)} />
                            <ColorField label="Header Text" value={config.colors.headerText} onChange={(v) => updateColors('headerText', v)} />
                            <hr className="border-gray-100 !my-3" />
                            <p className="text-xs font-medium text-gray-500">Messages</p>
                            <ColorField label="User Message Bg" value={config.colors.userMessageBg} onChange={(v) => updateColors('userMessageBg', v)} />
                            <ColorField label="User Message Text" value={config.colors.userMessageText} onChange={(v) => updateColors('userMessageText', v)} />
                            <ColorField label="Bot Message Bg" value={config.colors.botMessageBg} onChange={(v) => updateColors('botMessageBg', v)} />
                            <ColorField label="Bot Message Text" value={config.colors.botMessageText} onChange={(v) => updateColors('botMessageText', v)} />
                            <hr className="border-gray-100 !my-3" />
                            <p className="text-xs font-medium text-gray-500">Input</p>
                            <ColorField label="Input Background" value={config.colors.inputBg} onChange={(v) => updateColors('inputBg', v)} />
                            <ColorField label="Input Text" value={config.colors.inputText} onChange={(v) => updateColors('inputText', v)} />
                            <ColorField label="Input Border" value={config.colors.inputBorder} onChange={(v) => updateColors('inputBorder', v)} />
                            <hr className="border-gray-100 !my-3" />
                            <p className="text-xs font-medium text-gray-500">Avatars</p>
                            <ColorField label="User Avatar Bg" value={config.colors.userAvatarBg || '#e5e7eb'} onChange={(v) => updateColors('userAvatarBg', v)} />
                            <ColorField label="User Icon Color" value={config.colors.userIconColor || '#000000'} onChange={(v) => updateColors('userIconColor', v)} />
                            <div className="h-2"></div>
                            <ColorField label="Bot Avatar Bg" value={config.colors.botAvatarBg || '#000000'} onChange={(v) => updateColors('botAvatarBg', v)} />
                            <ColorField label="Bot Icon Color" value={config.colors.botIconColor || '#ffffff'} onChange={(v) => updateColors('botIconColor', v)} />
                        </Section>

                        <Section title="Typography" defaultOpen={false}>
                            <SelectField
                                label="Font Family"
                                value={config.typography.fontFamily.split(',')[0].replace(/'/g, '').trim()}
                                options={[
                                    { value: 'Inter', label: 'Inter' },
                                    { value: 'Roboto', label: 'Roboto' },
                                    { value: 'Outfit', label: 'Outfit' },
                                    { value: 'Poppins', label: 'Poppins' },
                                    { value: 'Open Sans', label: 'Open Sans' },
                                    { value: 'Lato', label: 'Lato' },
                                    { value: 'Nunito', label: 'Nunito' },
                                ]}
                                onChange={(v) => updateTypography('fontFamily', `'${v}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)}
                            />
                            <SelectField label="Font Size" value={config.typography.fontSize}
                                options={[
                                    { value: '12px', label: '12px - Small' },
                                    { value: '13px', label: '13px' },
                                    { value: '14px', label: '14px - Default' },
                                    { value: '15px', label: '15px' },
                                    { value: '16px', label: '16px - Large' },
                                ]}
                                onChange={(v) => updateTypography('fontSize', v)}
                            />
                            <SelectField label="Header Font Size" value={config.typography.headerFontSize}
                                options={[
                                    { value: '14px', label: '14px - Small' },
                                    { value: '16px', label: '16px - Default' },
                                    { value: '18px', label: '18px - Large' },
                                    { value: '20px', label: '20px - Extra Large' },
                                ]}
                                onChange={(v) => updateTypography('headerFontSize', v)}
                            />
                        </Section>

                        <Section title="Dimensions" defaultOpen={false}>
                            <SelectField label="Widget Width" value={config.dimensions.width}
                                options={[
                                    { value: '340px', label: '340px - Compact' },
                                    { value: '360px', label: '360px - Small' },
                                    { value: '380px', label: '380px - Default' },
                                    { value: '400px', label: '400px - Large' },
                                    { value: '420px', label: '420px - Wide' },
                                ]}
                                onChange={(v) => updateDimensions('width', v)}
                            />
                            <SelectField label="Widget Height" value={config.dimensions.height}
                                options={[
                                    { value: '500px', label: '500px - Short' },
                                    { value: '550px', label: '550px' },
                                    { value: '600px', label: '600px - Default' },
                                    { value: '620px', label: '620px' },
                                    { value: '700px', label: '700px - Tall' },
                                ]}
                                onChange={(v) => updateDimensions('height', v)}
                            />
                            <SelectField label="Border Radius" value={config.dimensions.borderRadius}
                                options={[
                                    { value: '0px', label: '0px - Sharp' },
                                    { value: '8px', label: '8px - Subtle' },
                                    { value: '16px', label: '16px - Default' },
                                    { value: '24px', label: '24px - Rounded' },
                                    { value: '32px', label: '32px - Very Round' },
                                ]}
                                onChange={(v) => updateDimensions('borderRadius', v)}
                            />
                            <SelectField label="Launcher Size" value={config.dimensions.buttonSize}
                                options={[
                                    { value: '48px', label: '48px - Small' },
                                    { value: '56px', label: '56px' },
                                    { value: '60px', label: '60px - Default' },
                                    { value: '64px', label: '64px - Large' },
                                    { value: '72px', label: '72px - Extra Large' },
                                ]}
                                onChange={(v) => updateDimensions('buttonSize', v)}
                            />
                        </Section>

                        <Section title="Layout">
                            <p className="text-xs text-gray-400 -mt-1 mb-2">Structural variations independent of color. Changes apply instantly to the preview.</p>
                            <SelectField
                                label="Bubble Style"
                                value={config.layout?.bubbleStyle ?? 'tail'}
                                options={[
                                    { value: 'tail', label: 'Tail — asymmetric corner (default)' },
                                    { value: 'rounded', label: 'Rounded — symmetric, no tail' },
                                    { value: 'sharp', label: 'Sharp — small radius, professional' },
                                    { value: 'card', label: 'Card — flat with border' },
                                ]}
                                onChange={(v) => updateLayout('bubbleStyle', v)}
                            />
                            <SelectField
                                label="Density"
                                value={config.layout?.density ?? 'cozy'}
                                options={[
                                    { value: 'compact', label: 'Compact — info-dense' },
                                    { value: 'cozy', label: 'Cozy — default' },
                                    { value: 'comfortable', label: 'Comfortable — generous' },
                                ]}
                                onChange={(v) => updateLayout('density', v)}
                            />
                            <SelectField
                                label="Header Style"
                                value={config.layout?.headerStyle ?? 'standard'}
                                options={[
                                    { value: 'standard', label: 'Standard — default' },
                                    { value: 'compact', label: 'Compact — thin, no subtitle' },
                                    { value: 'hero', label: 'Hero — taller, larger avatar' },
                                ]}
                                onChange={(v) => updateLayout('headerStyle', v)}
                            />
                            <SelectField
                                label="Avatar Shape"
                                value={config.layout?.avatarShape ?? 'rounded'}
                                options={[
                                    { value: 'circle', label: 'Circle' },
                                    { value: 'rounded', label: 'Rounded — default' },
                                    { value: 'square', label: 'Square' },
                                    { value: 'none', label: 'None — hide message avatars' },
                                ]}
                                onChange={(v) => updateLayout('avatarShape', v)}
                            />
                        </Section>

                        <Section title="Position" defaultOpen={false}>
                            <SelectField label="Placement" value={config.position.placement}
                                options={[
                                    { value: 'bottom-right', label: 'Bottom Right' },
                                    { value: 'bottom-left', label: 'Bottom Left' },
                                ]}
                                onChange={(v) => updatePosition('placement', v)}
                            />
                        </Section>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                            <strong>💡 Note:</strong> Content settings (title, subtitle, welcome message) and behavior settings (sound, typing, timestamps) are managed per-chatbot in <strong>Chatbots → Edit → Appearance</strong>.
                        </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="hidden lg:block w-[380px] flex-shrink-0">
                        <WidgetPreview config={config} />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
