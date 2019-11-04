import {Recap} from './recap';

export class ContentParseHelper {
    private static readonly SCENE_NAME_REGEX = "^[ \\t]*?@[ \\t]*?(.*?)[ \\t]*?$";
    private static readonly RECAP_HEADER_REGEX = "^[ \\t]*?\\*[ \\t]*?recap(?:[ \\t]+?(.+?))?[ \\t]*?$";
    private static readonly PROPERTY_HEADER_REGEX = "^[ \\t]*?\\*[ \\t]*?(.*?)[ \\t]*?$";

    /**
     * Given a well formatted .abc file structure, split the texts into scenes.
     * @param text 
     */
    public static splitToScenes(text: string): {
        id: string;
        text: string;
    }[] {
        const lines = text.split("\n");

        const splitScenes: {
            id: string;
            text: string;
        }[] = [];

        for (let line of lines) {
            const sceneTitleRegex = new RegExp(ContentParseHelper.SCENE_NAME_REGEX);

            const match = sceneTitleRegex.exec(line);
            if (match !== null) {
                splitScenes.push({
                    id: match[1],
                    text: line
                });
            } else if (splitScenes.length > 0) {
                splitScenes[splitScenes.length - 1].text += `\n${line}`;
            }
        }

        return splitScenes;
    }

    /**
     * Given the scene text, extract special property `*recap [condition]`.
     * @param sceneText a single scene definition of SFB scene in text.
     */
    public static extractRecaps(sceneText: string): Recap[] {
        const resultingRecap: Recap[] = [];

        let inRecap: boolean = false;
        for (let line of sceneText.split("\n")) {
            const recapHeaderRegex = new RegExp(ContentParseHelper.RECAP_HEADER_REGEX, "i");

            const match = recapHeaderRegex.exec(line);

            if (match !== null) {
                inRecap = true;
                resultingRecap.push({
                    condition: match[1],
                    text: ""
                });
            } else if (line.match(new RegExp(ContentParseHelper.PROPERTY_HEADER_REGEX))) {
                inRecap = false;
            } else if (inRecap) {
                resultingRecap[resultingRecap.length - 1].text += `\n${line}`;
            }
        }
        
        return resultingRecap;
    }

    /**
     * Convert the special recap property condition to SFB if-statement condition format.
     * @param recapCondition recap property condition
     * @param checkVar name of variable, which is used to store the recap counter value.
     */
    public static convertRecapCondition(recapCondition: string, checkVar: string): string {
        let totalCondition: string = "";

        for (let conditionItem of recapCondition.split(",")) {
            let itemCondition = "";

            if (conditionItem.match(/\.\.\./)) {
                // a to b condition
                const boundary = conditionItem.split("...");

                const a = boundary[0].trim();
                const b = boundary[1].trim();

                itemCondition = `(${a} <= {${checkVar}} && ${b} >= {${checkVar}})`;
            } else {
                itemCondition = `${conditionItem.trim()} === {${checkVar}}`;
            }

            if (totalCondition.length > 0) {
                totalCondition += " ||";
            }

            totalCondition += ` ${itemCondition}`;
        }

        return totalCondition;
    }

}