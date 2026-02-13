# Contributing to ChatFlowUI

Thank you for your interest in contributing to ChatFlowUI! 🎉

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

## Getting Started

ChatFlowUI is a monorepo with three workspaces:
- **server** — Express.js backend (TypeScript)
- **admin** — React admin dashboard (TypeScript + Tailwind)
- **widget** — Embeddable chat widget (TypeScript + Vite)

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/chatflowui.git
cd chatflowui

# Install dependencies for all workspaces
npm install

# Start development server (server + admin)
npm run dev

# In a separate terminal, build the widget
npm run dev:widget
```

The server runs on `http://localhost:7861` with default credentials shown in the terminal.

### Building for Production

```bash
# Build all workspaces
npm run build

# Build individually
npm run build:server
npm run build:admin
npm run build:widget

# Start production server
npm start
```

## Project Structure

```
chatflowui/
├── server/              # Backend API
│   ├── src/
│   │   ├── routes/      # Express routes
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Auth, CORS, rate limiting
│   │   └── db/          # SQLite database
│   └── dist/            # Compiled output
├── admin/               # Admin Dashboard
│   ├── src/
│   │   ├── pages/       # React pages
│   │   ├── components/  # Reusable components
│   │   └── lib/         # Utilities
│   └── dist/            # Build output
├── widget/              # Chat Widget
│   ├── src/
│   │   ├── widget.ts    # Main widget class
│   │   ├── socket.ts    # WebSocket client
│   │   └── styles.ts    # Dynamic CSS
│   └── dist/            # Bundle output
└── package.json         # Workspace root
```

## Development Workflow

### Branch Strategy

- `main` — Stable releases only
- `develop` — Integration branch for features
- `feature/your-feature` — New features
- `fix/bug-description` — Bug fixes
- `docs/documentation-update` — Documentation changes

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style (formatting, no logic change)
- `refactor:` — Code restructuring
- `perf:` — Performance improvements
- `test:` — Adding/updating tests
- `chore:` — Maintenance tasks

**Examples:**
```bash
git commit -m "feat(widget): add sound notification support"
git commit -m "fix(server): correct CORS validation for wildcard origins"
git commit -m "docs(readme): update Docker installation steps"
```

## Pull Request Process

1. **Fork the repository** and create your branch from `develop`

2. **Make your changes** following our code style guidelines

3. **Update documentation** if you changed functionality
   - Update README.md if user-facing
   - Add/update JSDoc comments
   - Update CHANGELOG.md under "Unreleased"

4. **Test your changes**
   ```bash
   npm run build        # Ensure builds succeed
   npm run lint         # Check code style
   npm run test         # Run tests (if available)
   ```

5. **Create a Pull Request** with:
   - Clear title following commit convention
   - Description of what changed and why
   - Link to related issue (if any)
   - Screenshots for UI changes

6. **PR Checklist:**
   - [ ] Code builds without errors
   - [ ] No linting errors
   - [ ] Documentation updated
   - [ ] CHANGELOG.md updated (under Unreleased)
   - [ ] No breaking changes (or documented in description)
   - [ ] Commits follow convention

7. **Review Process:**
   - Maintainers will review within 3-5 business days
   - Address feedback in new commits
   - Once approved, maintainer will merge

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use interfaces for object shapes
- Add JSDoc comments for public APIs
- Avoid `any`, use proper types

**Good:**
```typescript
interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

function addMessage(message: ChatMessage): void {
  storage.save(message);
}
```

**Bad:**
```typescript
function addMessage(msg: any) {
  storage.save(msg);
}
```

### React (Admin)

- Use functional components with hooks
- One component per file
- Use TypeScript for props
- Organize imports: React → Third-party → Local

**Example:**
``typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

interface ChatbotFormProps {
  initialData?: Chatbot;
  onSubmit: (data: Chatbot) => void;
}

export function ChatbotForm({ initialData, onSubmit }: ChatbotFormProps) {
  // Component logic
}
```

### CSS (Widget)

- Use CSS custom properties (--cfui-*)
- Mobile-first responsive design
- Avoid !important
- Prefer flexbox/grid over floats

### Formatting

We don't have Prettier configured yet, but follow these rules:
- 2 spaces for indentation
- Single quotes for JavaScript/TypeScript
- Trailing commas in multiline objects/arrays
- Semicolons required

## Testing

Currently, we don't have comprehensive tests, but here's how to verify changes:

### Manual Testing

1. **Start development environment:**
   ```bash
   npm run dev
   ```

2. **Test the widget:**
   - Open `http://localhost:7861`
   - Create a test chatbot
   - Copy embed code to an HTML file
   - Test message sending

3. **Test Docker build:**
   ```bash
   docker build -t chatflowui:test .
   docker run -d -p 7861:7861 --name chatflowui-test chatflowui:test
   ```

### Future: Automated Tests

We welcome contributions for:
- Unit tests (Jest/Vitest)
- Integration tests
- E2E tests (Playwright/Cypress)

## Reporting Issues

### Bug Reports

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- ChatFlowUI version
- Node.js version
- Deployment method (Docker/NPM)
- Steps to reproduce
- Expected vs actual behavior
- Logs/screenshots

### Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and describe:
- The problem you're trying to solve
- Your proposed solution
- Alternative solutions considered
- Additional context

### Questions

For questions, use [GitHub Discussions](https://github.com/yourusername/chatflowui/discussions) or the [question template](.github/ISSUE_TEMPLATE/question.md).

## Community Guidelines

Please read our [Code of Conduct](CODE_OF_CONDUCT.md). We expect all contributors to:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions?

Feel free to reach out:
- Open a [discussion](https://github.com/yourusername/chatflowui/discussions)
- Comment on related issues
- Tag maintainers in your PR

Thank you for contributing! 🚀
