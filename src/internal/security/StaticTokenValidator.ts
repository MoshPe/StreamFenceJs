import { AuthDecision, type AuthDecision as AuthDecisionValue } from '../../AuthDecision.js';
import type { TokenValidator } from '../../TokenValidator.js';

export class StaticTokenValidator implements TokenValidator {
  private readonly allowed = new Set<string>();

  constructor(tokens: readonly string[]) {
    for (const token of tokens) {
      const normalized = token.trim();
      if (normalized !== '') {
        this.allowed.add(normalized);
      }
    }
  }

  validate(token: string, _namespace: string, _topic: string | null): AuthDecisionValue {
    if (this.allowed.has(token)) {
      return AuthDecision.accept(token);
    }

    return AuthDecision.reject('invalid token');
  }
}
