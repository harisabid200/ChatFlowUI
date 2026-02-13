// Simple Markdown parser for chat messages
// Supports: **bold**, *italic*, `code`, [links](url), ```code blocks```

export function parseMarkdown(text: string): string {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks (must be first to prevent inner parsing)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (must be before italic to handle ** correctly)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Links (only allow http/https to prevent javascript: XSS)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
        if (/^https?:\/\//i.test(url)) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        return text;
    });

    // Bullet lists (convert lines starting with * or - to <ul><li>)
    html = html.replace(/(?:^|\n)((?:[*\-] .+(?:\n|$))+)/g, (_match, listBlock) => {
        const items = listBlock
            .trim()
            .split('\n')
            .map((line: string) => {
                const content = line.replace(/^[*\-] /, '').trim();
                return `<li>${content}</li>`;
            })
            .join('');
        return `\n<ul>${items}</ul>\n`;
    });

    // Italic (after bold and lists to avoid conflicts)
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format timestamp for display
export function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generate unique ID
export function generateId(): string {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
