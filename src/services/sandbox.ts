import { isSandboxMode as firebaseSandboxInit } from '../firebase/config';

const RUNTIME_SANDBOX_KEY = 'classnotes_runtime_sandbox';

export const sandboxService = {
  /**
   * Evaluates whether the application is running in Local Sandbox Mode.
   * Resolves first to any runtime developer override stored in localStorage,
   * otherwise falls back to the Firebase initialization status.
   */
  isSandboxActive(): boolean {
    const override = localStorage.getItem(RUNTIME_SANDBOX_KEY);
    if (override !== null) {
      return override === 'true';
    }
    return firebaseSandboxInit;
  },

  /**
   * Sets a manual override for Sandbox Mode.
   * Triggers a page reload to force all services to re-instantiate with the target mode.
   */
  setSandboxOverride(force: boolean): void {
    localStorage.setItem(RUNTIME_SANDBOX_KEY, force ? 'true' : 'false');
    window.location.reload();
  },

  /**
   * Clears the manual override, returning the mode selection to environment variables.
   * Triggers a page reload to apply default settings.
   */
  clearOverride(): void {
    localStorage.removeItem(RUNTIME_SANDBOX_KEY);
    window.location.reload();
  }
};
