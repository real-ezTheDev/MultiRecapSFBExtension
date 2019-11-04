import {ImporterExtension, InstructionExtension, InstructionExtensionParameter,
    SceneDirection, SourceContentHelper, StoryMetadataHelper, SceneDirectionBuilder,
    SceneDirectionType, StoryStateHelper, DriverExtension, DriverExtensionParameter} from '@alexa-games/sfb-f';

import {ExtensionLoaderParameter} from '@alexa-games/sfb-skill';

import {ContentParseHelper} from './contentParseHelper';
import {FallbackInstructionHelper} from './fallbackInstructionHelper';
import {Recap} from './recap';

export class MultiRecapExtension implements ImporterExtension, InstructionExtension, DriverExtension {

    /**
     * name of the variable tracking the number of recap played in-a-row.
     */
    private readonly RECAP_COUNTER: string = "system_RecapCounter";

    /**
     * name of the variable, which is used to indicate if the recap is selected (to avoid appending other recaps).
     */
    private readonly RECAP_SELECTED_VARIABLE: string = "system_MultiRecapSelected";

    /**
     * name of the variable, which saves the recap counter per scene of the curren request.
     */
    private readonly RECAP_RECORD: string = "system_RecapRecord";

    /**
     * name of the custom instruction used to update the recap counter for the current scene.
     */
    private readonly RECORD_RECAP_INSTRUCTION: string = "recordRecap";

    // importer related varaibles
    private specialRecaps: {[key: string]: Recap[]} = {};

    // driver related variables
    private recapCounterRecord: {[key: string]: number} = {};

    constructor(private param: ExtensionLoaderParameter) {
    }    

    /**
     * Scan through the source text to find instances of `*recap [num]`.
     */
    public async extendSourceContent(sourceHelper: SourceContentHelper): Promise<void> {
        sourceHelper.getAllSourceContents().forEach((content) => {
            const scenes = ContentParseHelper.splitToScenes(content.text);
            
            scenes.forEach((scene) => {
                const sceneID = scene.id.trim();
                const recaps = ContentParseHelper.extractRecaps(scene.text);

                const conditionalRecaps = recaps.filter((recap) => {
                    return recap.condition;
                });

                const hasConditionalRecap = conditionalRecaps.length > 0;

                if (hasConditionalRecap) {
                    this.specialRecaps[sceneID] = recaps;
                }
            });

            
            const formattedContent = scenes.map((scene) => {
                const sceneID = scene.id.trim().toLowerCase();

                if (FallbackInstructionHelper.sceneHasFallback(scene.text) && !this.specialRecaps[sceneID]) {
                    this.specialRecaps[sceneID] = [];
                }
                
                return FallbackInstructionHelper.translateSceneForFallback(scene.text, this.RECAP_COUNTER);

            }).reduce((prev, curr, i) => {
                if (!prev) {
                    return prev;
                }
                return `${prev}\n${curr}`;
            });

            if (content.id) {
                sourceHelper.setSourceContent(content.id, formattedContent);
            }
        });
    }

    /**
     * For all scenes with special(extended) recaps, add a custom instruction in the beginning of the *then for conditional recaps.
     */
    public async extendImportedContent(metadataHelper: StoryMetadataHelper): Promise<void> {
        
        for (let sceneID of Object.keys(this.specialRecaps)) {
            if (["global append", "global prepend", "global"].includes(sceneID)) {
                continue;
            }
            
            if (this.hasRecap(sceneID, metadataHelper)) {
                this.removeRecap(sceneID, metadataHelper);
            }

            const recaps = this.specialRecaps[sceneID];

            const recapInstructions = this.buildRecapInstructions(recaps);

            const existingInstructions = metadataHelper.getSceneInstructions(sceneID);

            metadataHelper.setSeceneInstructions(sceneID, recapInstructions.concat(existingInstructions));

        }
    }

    /**
     * Before executing the story for the current request, save the "before" recap counters.
     */
    async pre(param: DriverExtensionParameter): Promise<void> {
        const record = param.storyState[this.RECAP_RECORD];

        if (record) {
            this.recapCounterRecord = JSON.parse(JSON.stringify(record));
        }
    }

    /**
     * Right before responding/saving state, clean up the recap record.
     */
    async post(param: DriverExtensionParameter): Promise<void> {
        const record: {[key: string]: number} = param.storyState[this.RECAP_RECORD];

        if (record) {
            const deletingScene: string[] = [];
            for (let sceneID of Object.keys(this.recapCounterRecord)) {
                if (record[sceneID] === this.recapCounterRecord[sceneID]) {
                    // recap counter didn't change on this request. Reset it
                    deletingScene.push(sceneID);
                }
            }
    
            deletingScene.forEach((id) => {
                delete record[id];
            })
        }
    }

    /**
     * Record the current scene name, and the number of times recap played in-a-row for this scene.
     */
    public async recordRecap(param: InstructionExtensionParameter): Promise<void> {
        if (!param.storyState[this.RECAP_RECORD]) {
            param.storyState[this.RECAP_RECORD] = {};
        }

        const recapCounters = param.storyState[this.RECAP_RECORD];

        const currentScene = StoryStateHelper.getCurrentSceneID(param.storyState);

        if (currentScene) {
            if (recapCounters[currentScene] === undefined) {
                recapCounters[currentScene] = -1;
            }

            recapCounters[currentScene] ++;

            // update the recap counter variable used for recap selection logic
            param.storyState[this.RECAP_COUNTER] = recapCounters[currentScene];
        } else {
            param.storyState[this.RECAP_COUNTER] = -1;
        }
    }

    /**
     * Generate a list of [[SceneDirections]] supporting the multi/branching recap behavior given the list of list of [[Recap]] needed.
     */
    private buildRecapInstructions(recaps: Recap[]): SceneDirection[] {
        const instructionBuilder = new SceneDirectionBuilder();

        instructionBuilder.clearVariable(this.RECAP_SELECTED_VARIABLE);
        instructionBuilder.customDirection(this.RECORD_RECAP_INSTRUCTION);

        recaps.forEach((recap) => {
            if (recap.condition) {
                const sfbCondition = ContentParseHelper.convertRecapCondition(recap.condition, this.RECAP_COUNTER);

                instructionBuilder.startCondition(`!{${this.RECAP_SELECTED_VARIABLE}} && (${sfbCondition})`);
            } else {
                instructionBuilder.startCondition(`!{${this.RECAP_SELECTED_VARIABLE}}`);
            }

            instructionBuilder.flag(this.RECAP_SELECTED_VARIABLE);
            
            instructionBuilder.setRecap(recap.text);

            instructionBuilder.closeCondition();
        });

        return instructionBuilder.build();
    }

    private removeRecap(id: string, story: StoryMetadataHelper) {
        const instructions = story.getSceneInstructions(id);

        const builder = new SceneDirectionBuilder();

        for (let instruction of instructions) {
            if (instruction.directionType !== SceneDirectionType.RECAP) {
                builder.addSceneDirection(instruction);
            }
        }

        story.setSeceneInstructions(id, builder.build());
    }

    private hasRecap(id: string, story: StoryMetadataHelper): boolean {
        return story.getSceneInstructions(id).filter((instruction) => {
            return instruction.directionType === SceneDirectionType.RECAP;
        }).length > 0;
    }
}
