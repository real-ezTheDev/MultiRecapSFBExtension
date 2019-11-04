import { FormatVerificationError } from './error/formatVerificationError';
import { ContentParseHelper } from './contentParseHelper';

export class FallbackInstructionHelper {

    /**
     * Given a line with `fallback` format for MultiRecapExtension, reformat to valid SFB .abc format.
     * 
     * ie.
     * expected fallback format :
     * 
     *``` abc
     *  fallback [condition] -> [destination scene]
     *```
     *
     * translated to:
     * 
     * ``` abc
     * if [fallback_condition] {
     *  -> destination scene
     * }
     * ```
     */
    public static formatFallbackInstruction(fallbackInstructionLine: string, recapCounterVarName: string): string {
        this.verifyFormat(fallbackInstructionLine);

        const fallbackFormatRegex = /^[ \t]*?fallback(.*?)->(.+?)$/i;

        const match = fallbackFormatRegex.exec(fallbackInstructionLine);

        if (match !== null) {
            const condition = match[1]? match[1].trim(): match[1];

            const destination = match[2]? match[2].trim(): match[2];

            let translatedCondition = `${recapCounterVarName} >= 1`;
            
            if (condition.length > 0) {
                translatedCondition = ContentParseHelper.convertRecapCondition(condition, recapCounterVarName);
                translatedCondition = translatedCondition.replace("{", "").replace("}", "");
            }

            const translated = `if ${translatedCondition} {\n\t-> ${destination}\n}`;

            return translated;    

        }

        return "";
    }

    /**
     * Checks if the given line is a fallback instruction.
     * @param line 
     */
    public static isFallbackInstruction(line: string): boolean {
        if (line.match(/^[ \t]*?fallback\b/i)) {
            return true;
        }

        return false;
    }

    /**
     * Given the fallback line, verify the format of the instructino.
     * Throws with appropriate error messaging if unexpected format is detected.
     */
    public static verifyFormat(line: string) {
        const fallbackFormatRegex = /^[ \t]*?fallback(.+?)$/i;

        const match = fallbackFormatRegex.exec(line);

        if (match === null) {
            throw new FormatVerificationError(`Missing Parameters: Expected format='fallback [(optional)condition] -> [scene_name]', but got ${line}`);
        }

        const parameterText = match[1];

        const parameterRegex = /^(.*?)?->(.*?)$/

        const paramMatch = parameterRegex.exec(parameterText);

        if (paramMatch === null || paramMatch[2].trim().length === 0) {
            throw new FormatVerificationError(`Missing Parameters: Destination scene is required in format='fallback [(optional)condition] -> [scene_name]', but got ${line}`);
        }
    }

    /**
     * Given a scene definition in SFB's .abc format, find and translate `fallback` lines into a correctly formatted custom instruction line.
     */
    public static translateSceneForFallback(sceneText: string, recapCounterVarName: string): string {
        const lines = sceneText.split("\n");

        const translatedScene = lines.map((line) => {
            if (this.isFallbackInstruction(line)) {
                const formattedLine = this.formatFallbackInstruction(line, recapCounterVarName);

                return formattedLine;
            } else {
                return line;
            }
        }).reduce((prev, curr, i) => {
            if (!prev) {
                return curr;
            } 
            return `${prev}\n${curr}`;
        });

        return translatedScene;
    }

    public static sceneHasFallback(sceneText: string): boolean {
        const lines = sceneText.split("\n");

        const fallbackLines = lines.map((line) => {
            return this.isFallbackInstruction(line);
        });

        return fallbackLines.length > 0;
    }
}