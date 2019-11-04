import * as fs from 'fs';
import * as path from 'path';

export class TestResourceAccessor {
    public static loadTestResource(resourceName: string): string {
        const resourcePath = path.resolve("test", "res");
        const loadedText = fs.readFileSync(path.resolve(resourcePath, resourceName), "utf8");
    
        return loadedText;
    }
}