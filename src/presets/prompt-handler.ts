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
   * Check if prompt contains Regional Prompter syntax
   */
  static hasRegionalPrompterSyntax(prompt: string): boolean {
    const rpKeywords = ['ADDBASE', 'ADDCOL', 'ADDROW', 'ADDCOMM', 'BREAK'];
    return rpKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * Merge prompts with Regional Prompter support
   */
  static mergePromptsWithRegionalPrompter(
    userPrompt: string,
    template?: {
      positive_prefix?: string;
      positive_suffix?: string;
      negative?: string;
    },
    rpConfig?: {
      rp_use_common?: boolean;
      rp_use_base?: boolean;
      rp_use_ncommon?: boolean;
      rp_not_change_and?: boolean;
      rp_use_neg_common?: boolean;
    },
    userNegativePrompt?: string
  ): { prompt: string; negative_prompt?: string } {
    if (!template) {
      return { prompt: userPrompt };
    }

    // For Regional Prompter, we need to carefully place prefix/suffix
    let processedPrompt = userPrompt;

    // Correct Regional Prompter algorithm per specification

    // (i) Split prompt by chunk delimiters
    let chunkDelimiters = ['ADDCOMM', 'ADDBASE', 'ADDCOL', 'ADDROW', 'BREAK'];
    // Add AND delimiter only when Not Change AND = false
    if (!rpConfig?.rp_not_change_and) {
      chunkDelimiters.push('AND');
    }

    // Find delimiters present in prompt
    const presentDelimiters = chunkDelimiters.filter(delimiter =>
      processedPrompt.includes(delimiter)
    );

    if (presentDelimiters.length > 0) {
      // Split into chunks
      const delimiterRegex = new RegExp(`(${presentDelimiters.join('|')})`, 'g');
      const splitResult = processedPrompt.split(delimiterRegex);
      const chunks = splitResult.filter(chunk => chunk.trim() && !presentDelimiters.includes(chunk.trim()));

      // Debug log chunk extraction
      const fs = require('fs');
      const debugLogPath = require('path').join(process.cwd(), 'rp-debug.log');
      fs.appendFileSync(debugLogPath, `Split result: ${JSON.stringify(splitResult)}\n`);
      fs.appendFileSync(debugLogPath, `Filtered chunks: ${JSON.stringify(chunks)}\n`);

      if (chunks.length > 0) {
        // (ii) Always apply prefix/suffix to first chunk
        const firstChunk = chunks[0].trim();
        const wrappedFirstChunk = [
          template.positive_prefix,
          firstChunk,
          template.positive_suffix
        ].filter(p => p && p.trim()).join(', ');

        // Replace first chunk with wrapped version - use safer string replacement
        processedPrompt = processedPrompt.replace(firstChunk.trim(), wrappedFirstChunk);

        // (iii) Determine if remaining chunks need prefix/suffix
        // Apply correct specification: wrap all chunks when ALL conditions are false
        // Handle both boolean and string "false" values
        const shouldWrapAllChunks =
          rpConfig?.rp_use_common !== true && (rpConfig?.rp_use_common as any) !== "true" &&  // Use common prompt = false
          !userPrompt.includes('ADDCOMM') &&                                          // ADDCOMM not present
          rpConfig?.rp_use_base !== true && (rpConfig?.rp_use_base as any) !== "true" &&      // Use base prompt = false
          !userPrompt.includes('ADDBASE');                                            // ADDBASE not present

        // Debug: Enhanced condition analysis
        const fs = require('fs');
        const debugLogPath = require('path').join(process.cwd(), 'rp-debug.log');

        // Log all condition values for debugging
        const hasAddcomm = userPrompt.includes('ADDCOMM');
        const hasAddbase = userPrompt.includes('ADDBASE');

        fs.appendFileSync(debugLogPath, `rpConfig: ${JSON.stringify(rpConfig)}\n`);
        fs.appendFileSync(debugLogPath, `rpConfig.rp_use_common: ${rpConfig?.rp_use_common}, rpConfig.rp_use_base: ${rpConfig?.rp_use_base}\n`);
        fs.appendFileSync(debugLogPath, `userPrompt.includes('ADDCOMM'): ${hasAddcomm}, userPrompt.includes('ADDBASE'): ${hasAddbase}\n`);
        fs.appendFileSync(debugLogPath, `Condition1 (!rp_use_common): ${!rpConfig?.rp_use_common}\n`);
        fs.appendFileSync(debugLogPath, `Condition2 (!ADDCOMM): ${!hasAddcomm}\n`);
        fs.appendFileSync(debugLogPath, `Condition3 (!rp_use_base): ${!rpConfig?.rp_use_base}\n`);
        fs.appendFileSync(debugLogPath, `Condition4 (!ADDBASE): ${!hasAddbase}\n`);
        fs.appendFileSync(debugLogPath, `shouldWrapAllChunks: ${shouldWrapAllChunks}\n`);
        fs.appendFileSync(debugLogPath, `Chunks detected: ${chunks.length}\n`);
        chunks.forEach((chunk, i) => {
          fs.appendFileSync(debugLogPath, `Chunk[${i}]: "${chunk.trim()}"\n`);
        });

        if (shouldWrapAllChunks) {
          // Apply prefix/suffix to all remaining chunks
          chunks.slice(1).forEach((chunk, index) => {
            const trimmedChunk = chunk.trim();
            const wrappedChunk = [
              template.positive_prefix,
              trimmedChunk,
              template.positive_suffix
            ].filter(p => p && p.trim()).join(', ');

            fs.appendFileSync(debugLogPath, `Wrapping chunk ${index + 1}: "${trimmedChunk}" -> "${wrappedChunk}"\n`);
            fs.appendFileSync(debugLogPath, `Before replacement: "${processedPrompt}"\n`);

            // Safer string replacement to prevent character corruption
            processedPrompt = processedPrompt.replace(trimmedChunk, wrappedChunk);

            fs.appendFileSync(debugLogPath, `After replacement: "${processedPrompt}"\n`);
          });
        }
      }
    } else {
      // No Regional Prompter syntax - standard processing
      const parts = [
        template.positive_prefix,
        processedPrompt,
        template.positive_suffix
      ].filter(p => p && p.trim());
      processedPrompt = parts.join(', ');
    }

    // Handle negative prompt with Regional Prompter support (simplified per user specification)
    let processedNegativePrompt = template.negative;

    if (userNegativePrompt && template.negative) {
      // Check if Regional Prompter is enabled
      const rpEnabled = presentDelimiters.length > 0; // Has RP syntax

      if (!rpEnabled) {
        // Regional Prompter disabled or no definition - standard processing
        processedNegativePrompt = [template.negative, userNegativePrompt]
          .filter(p => p && p.trim()).join(', ');
      } else {
        // Regional Prompter enabled - follow 3-step specification

        // (i) Split user negative prompt by chunk delimiters
        const presentNegDelimiters = chunkDelimiters.filter(delimiter =>
          userNegativePrompt.includes(delimiter)
        );

        if (presentNegDelimiters.length > 0) {
          const negDelimiterRegex = new RegExp(`(${presentNegDelimiters.join('|')})`, 'g');
          const negChunks = userNegativePrompt.split(negDelimiterRegex)
            .filter(chunk => chunk.trim() && !presentNegDelimiters.includes(chunk.trim()));

          // (ii) Check if single chunk OR Use Neg-Common = true
          if (negChunks.length === 1 || rpConfig?.rp_use_neg_common) {
            // Standard processing: preset negative + user negative
            processedNegativePrompt = [template.negative, userNegativePrompt]
              .filter(p => p && p.trim()).join(', ');
          } else {
            // (iii) Multiple chunks AND Use Neg-Common = false
            // Apply preset negative to each chunk
            let result = userNegativePrompt;
            negChunks.forEach(chunk => {
              const trimmedChunk = chunk.trim();
              const wrappedChunk = [template.negative, trimmedChunk]
                .filter(p => p && p.trim()).join(', ');
              result = result.replace(trimmedChunk, wrappedChunk);
            });
            processedNegativePrompt = result;
          }
        } else {
          // No delimiters in negative prompt - standard processing
          processedNegativePrompt = [template.negative, userNegativePrompt]
            .filter(p => p && p.trim()).join(', ');
        }
      }
    }

    const result: { prompt: string; negative_prompt?: string } = {
      prompt: processedPrompt
    };

    if (processedNegativePrompt) {
      result.negative_prompt = processedNegativePrompt;
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