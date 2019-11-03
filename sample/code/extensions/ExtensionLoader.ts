import { DriverExtension, InstructionExtension, ImporterExtension } from '@alexa-games/sfb-f';
import { ExtensionLoaderParameter, AlexaExtension, AlexaAudioPlayerExtension, AlexaMonetizationExtension } from '@alexa-games/sfb-skill';

import { MultiRecapExtension } from 'sfb-multi-recap-extension';

type ExtensionType = DriverExtension|InstructionExtension|ImporterExtension;

export class ExtensionLoader {
    private registeredExtensions: ExtensionType[];

    constructor(param: ExtensionLoaderParameter) {
        this.registeredExtensions = [
            new MultiRecapExtension(param),
            
            // Alexa SFB extensions
            new AlexaExtension(),
            new AlexaAudioPlayerExtension(param.locale, param.configAccessor),            
            new AlexaMonetizationExtension(param.locale, param.configAccessor),

        ];
    }

    public getExtensions(): ExtensionType[] {
        return this.registeredExtensions;
    }
}
