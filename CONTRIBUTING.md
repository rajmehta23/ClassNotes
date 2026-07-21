# Contributing Guidelines

Thank you for considering contributing to ClassNotes!

## Development Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run build verification: `npm run build`

## Pull Request Guidelines

- Ensure clean TypeScript compilation (`tsc -b`).
- Keep feature modules isolated inside `src/modules/`.
- Respect feature flags (`AI_TUTOR`, `AI_ESSAY`, `CHATBOT_AI`).
- Do not introduce breaking changes to database schemas or UI design.
