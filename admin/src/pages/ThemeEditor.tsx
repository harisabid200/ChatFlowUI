import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, RotateCcw } from 'lucide-react';
import { themesApi, ThemeConfig } from '../api';
import Layout from '../components/Layout';

// ── SVG Icons (matching the actual widget) ──
const widgetIcons = {
    chat: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5-1.35C8.47 21.51 10.18 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.55 0-3.02-.44-4.27-1.2l-.3-.18-3.12.82.83-3.04-.2-.32A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.39-5.15c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41-.14-.01-.3-.01-.46-.01s-.42.06-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="white"/></svg>`,
    sound: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/></svg>`,
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/></svg>`,
    bot: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1a7 7 0 01-7 7H10a7 7 0 01-7-7H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-4 9a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z" fill="white"/></svg>`,
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

// ── Bot Avatar Icon (small, for messages) ──
function BotAvatarIcon({ primary, primaryHover }: { primary: string; primaryHover: string }) {
    return (
        <div style={{
            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${primary} 0%, ${primaryHover} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1a7 7 0 01-7 7H10a7 7 0 01-7-7H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zm-4 9a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
        </div>
    );
}

// ── User Avatar Icon (small, for messages) ──
function UserAvatarIcon({ avatarBg }: { avatarBg: string }) {
    return (
        <div style={{
            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
            background: `linear-gradient(135deg, ${avatarBg} 0%, ${avatarBg}cc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
        </div>
    );
}

// ── Live Widget Preview (matches actual widget exactly) ──
function WidgetPreview({ config }: { config: ThemeConfig }) {
    const { colors, typography, dimensions } = config;
    const borderRadius = parseInt(dimensions.borderRadius) || 16;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const headerBg = isGradient(colors.headerBg)
        ? colors.headerBg
        : `linear-gradient(135deg, ${colors.headerBg} 0%, ${colors.headerBg}dd 100%)`;

    const userMsgBg = isGradient(colors.userMessageBg)
        ? colors.userMessageBg
        : colors.userMessageBg;

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
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        pointerEvents: 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', zIndex: 1 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{ width: '24px', height: '24px' }} dangerouslySetInnerHTML={{ __html: widgetIcons.bot }} />
                            </div>
                            <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                width: '12px', height: '12px',
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                borderRadius: '50%',
                                border: `2px solid ${isGradient(colors.headerBg) ? colors.primary : colors.headerBg}`,
                                boxShadow: '0 0 0 2px rgba(34,197,94,0.3)',
                            }} />
                        </div>
                        <div>
                            <div style={{
                                fontSize: typography.headerFontSize, fontWeight: 700,
                                letterSpacing: '-0.02em',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}>
                                Chat with us
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: 500, marginTop: '3px' }}>
                                Online
                            </div>
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
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    minHeight: '240px',
                    background: colors.background,
                }}>
                    {/* Bot welcome */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '90%' }}>
                        <BotAvatarIcon primary={colors.primary} primaryHover={colors.primaryHover} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{
                                background: colors.botMessageBg, color: colors.botMessageText,
                                padding: '14px 18px', borderRadius: '18px', borderBottomLeftRadius: '6px',
                                lineHeight: '1.55',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.06)',
                            }}>
                                Hello! How can I help you today?
                            </div>
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>{nowStr}</span>
                        </div>
                    </div>

                    {/* User message */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '90%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                        <UserAvatarIcon avatarBg={colors.userAvatarBg} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{
                                background: userMsgBg, color: colors.userMessageText,
                                padding: '14px 18px', borderRadius: '18px', borderBottomRightRadius: '6px',
                                lineHeight: '1.55',
                                boxShadow: isGradient(colors.userMessageBg) ? '0 2px 12px rgba(0,0,0,0.15)' : undefined,
                            }}>
                                Hi! I need some help
                            </div>
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>{nowStr}</span>
                        </div>
                    </div>

                    {/* Bot reply */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '90%' }}>
                        <BotAvatarIcon primary={colors.primary} primaryHover={colors.primaryHover} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{
                                background: colors.botMessageBg, color: colors.botMessageText,
                                padding: '14px 18px', borderRadius: '18px', borderBottomLeftRadius: '6px',
                                lineHeight: '1.55',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.06)',
                            }}>
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
                        width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
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
                            <ColorField label="User Avatar Bg" value={config.colors.userAvatarBg} onChange={(v) => updateColors('userAvatarBg', v)} />
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
