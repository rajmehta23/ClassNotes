# Enterprise Architecture Blueprint — ClassNotes

## Architectural Principles

1. **Feature Module Autonomy (`src/modules/<feature>`)**:
   Every domain feature (notes, attendance, assignments, requests, notices, rewards, chatbot, ai-learning) is isolated inside a self-contained module containing its own pages, components, services, stores, and types.

2. **Clean Layer Separation**:
   - `src/config/`: App-wide static configuration, environment variables, feature flags.
   - `src/core/`: Global foundational infrastructure (Auth state, Firebase initialization).
   - `src/modules/`: Feature-specific logic & UI.
   - `src/shared/`: Shared primitives, cross-cutting utilities, shared layouts, and global types.

3. **Pluggable AI Provider Architecture**:
   The AI Chatbot routes requests through `ChatAIGateway` using an Adapter pattern. Providers (`GemmaProvider`, `GeminiProvider`, `OpenAIProvider`, `ClaudeProvider`, `QwenProvider`) implement the `IAIProvider` interface contract.
