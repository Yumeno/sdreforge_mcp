/**
 * Prompt Handler
 * Handles prompt construction while preserving SD WebUI prompt syntax
 */

/**
 * SD WebUI Prompt Syntax:
 * - (text) = emphasis (1.1x weight)
 * - ((text)) = stronger emphasis (1.21x weight)
 * - [text] = de-emphasis (0.9x weight)
 * - {text} = literal braces (no special meaning in SD WebUI, but used by some extensions)
 * - \(text\) = escaped parentheses (literal)
 *
 * Variable substitution should be careful not to break these patterns
 */

export class PromptHandler {
  /**
   * Merge user prompt with template while preserving prompt syntax
   */
  static mergePrompts(
    userPrompt: string,
    template?: {
      positive_prefix?: string;
      positive_suffix?: string;
      negative?: string;
    }
  ): { prompt: string; negative_prompt?: string } {
    if (!template) {
      return { prompt: userPrompt };
    }

    // Build positive prompt
    const parts: string[] = [];

    if (template.positive_prefix) {
      parts.push(template.positive_prefix);
    }

    if (userPrompt) {
      parts.push(userPrompt);
    }

    if (template.positive_suffix) {
      parts.push(template.positive_suffix);
    }

    const prompt = parts.filter(p => p).join(', ');

    // Return with negative prompt if specified
    const result: { prompt: string; negative_prompt?: string } = { prompt };

    if (template.negative) {
      result.negative_prompt = template.negative;
    }

    return result;
  }

  /**
   * Validate prompt syntax
   * Checks for balanced parentheses and brackets
   */
  static validatePromptSyntax(prompt: string): { valid: boolean; error?: string } {
    let parenCount = 0;
    let bracketCount = 0;
    let braceCount = 0;
    let escaped = false;

    for (let i = 0; i < prompt.length; i++) {
      const char = prompt[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      switch (char) {
        case '(':
          parenCount++;
          break;
        case ')':
          parenCount--;
          if (parenCount < 0) {
            return { valid: false, error: `Unmatched ')' at position ${i}` };
          }
          break;
        case '[':
          bracketCount++;
          break;
        case ']':
          bracketCount--;
          if (bracketCount < 0) {
            return { valid: false, error: `Unmatched ']' at position ${i}` };
          }
          break;
        case '{':
          braceCount++;
          break;
        case '}':
          braceCount--;
          if (braceCount < 0) {
            return { valid: false, error: `Unmatched '}' at position ${i}` };
          }
          break;
      }
    }

    if (parenCount !== 0) {
      return { valid: false, error: `Unclosed parentheses: ${parenCount} open` };
    }
    if (bracketCount !== 0) {
      return { valid: false, error: `Unclosed brackets: ${bracketCount} open` };
    }
    if (braceCount !== 0) {
      return { valid: false, error: `Unclosed braces: ${braceCount} open` };
    }

    return { valid: true };
  }

  /**
   * Escape special characters in prompt if needed
   */
  static escapePrompt(text: string): string {
    // Only escape if the text contains special characters but isn't already a prompt pattern
    if (!/^[\(\[\{].*[\)\]\}]$/.test(text)) {
      // If text contains parentheses/brackets that aren't part of emphasis syntax
      return text.replace(/([()[\]{}])/g, '\\$1');
    }
    return text;
  }

  /**
   * Parse weight from emphasis syntax
   * (text) = 1.1, ((text)) = 1.21, [text] = 0.9
   */
  static parseWeight(text: string): { content: string; weight: number } {
    let weight = 1.0;
    let content = text;

    // Check for emphasis patterns
    const parenMatch = content.match(/^(\(+)(.+?)(\)+)$/);
    if (parenMatch && parenMatch[1].length === parenMatch[3].length) {
      weight = Math.pow(1.1, parenMatch[1].length);
      content = parenMatch[2];
    }

    const bracketMatch = content.match(/^(\[+)(.+?)(\]+)$/);
    if (bracketMatch && bracketMatch[1].length === bracketMatch[3].length) {
      weight = Math.pow(0.9, bracketMatch[1].length);
      content = bracketMatch[2];
    }

    return { content, weight };
  }
}