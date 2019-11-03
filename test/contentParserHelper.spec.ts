import {ContentParseHelper} from '../lib/contentParseHelper';

import {strict as assert} from 'assert';

import * as fs from 'fs';
import * as path from 'path';

describe("ContentParserHelpr Unit Tests", function () {
    describe ("Scene Split Tests", function () {
        it("single scene", async function () {
            const testCase = loadTestResource("singleNormalScene.abc");
            const splitResult = ContentParseHelper.splitToScenes(testCase);

            assert.equal(splitResult.length, 1, "Number of parse scene check.");
            assert.equal(splitResult[0].id, "test scene 1")
            assert.equal(splitResult[0].text, `@test scene 1\n*say\n    This is a test scene 1.\n*reprompt\n    This is a test scene 1 reprompt.\n*recap\n    This is a test scene 1 recap.\n*then\n    // test scene 1 then section\n    set dummyVariable as 1\n    hear continue {\n        -> test scene 2\n    }`, "Extracted scene content check.");
        });

        it("multiple scenes", async function () {
            const testCase = loadTestResource("normalScene.abc");
            const splitResult = ContentParseHelper.splitToScenes(testCase);

            assert.equal(splitResult.length, 3, "Number of parse scene check.");
            assert.equal(splitResult[0].text, `@test scene 1\n*say\n    This is a test scene 1.\n*reprompt\n    This is a test scene 1 reprompt.\n*recap\n    This is a test scene 1 recap.\n*then\n    // test scene 1 then section\n    set dummyVariable as 1\n    hear continue {\n        -> test scene 2\n    }\n`, "Extracted first scene content check.");
            assert.equal(splitResult[0].id, "test scene 1")

            assert.equal(splitResult[1].text, `@test scene 2\n*say\n    This is a test scene 2.\n*reprompt\n    This is a test scene 2 reprompt.\n*recap\n    This is a test scene 2 recap.\n*then\n    // test scene 2 then section\n    set dummyVariable as 2\n    hear continue {\n        -> test scene 3\n    }\n`, "Extracted second scene content check.");
            assert.equal(splitResult[1].id, "test scene 2")

            assert.equal(splitResult[2].text, `@test scene 3\n*say\n    This is a test scene 3.\n*reprompt\n    This is a test scene 3 reprompt.\n*recap\n    This is a test scene 3 recap.\n*then\n    // test scene 3 then section\n    set dummyVariable as 3\n    hear continue {\n        -> test scene 1\n    }\n`, "Extracted third scene content check.");
            assert.equal(splitResult[2].id, "test scene 3")

        });
    });

    it ("Recap Extract Tests - for standard scenes", function() {
        const testCase = loadTestResource("normalScene.abc");
        const splitResult = ContentParseHelper.splitToScenes(testCase);

        splitResult.forEach((scene) => {
            const recaps = ContentParseHelper.extractRecaps(scene.text);

            assert.equal(recaps.length, 1, "Number of recap properties defined.");
            assert.ok(!recaps[0].condition, "Empty recap condition check");
            assert.ok(recaps[0].text.length > 0, "Extracted recap content sanity check");
        });
    });

    it ("Recap Extract Tests - for extended(modified) scenes", function() {
        const testCase = loadTestResource("multiRecapScene.abc");
        const splitResult = ContentParseHelper.splitToScenes(testCase);

        const conditions = [
            "1",
            "2...4",
            "2,4,6"
        ];

        splitResult.forEach((scene, i) => {
            const recaps = ContentParseHelper.extractRecaps(scene.text);

            assert.equal(recaps.length, 2, "Number of recap properties defined.");
            assert.ok(!recaps[0].condition, "Empty recap condition check");
            assert.ok(recaps[0].text.length > 0, "Extracted recap content sanity check");
            assert.ok(recaps[1].condition, "Condition defined check");
            assert.equal(recaps[1].condition, conditions[i], "Condition content check");
            assert.ok(recaps[1].text.length > 0, "Extracted recap content sanity check");
        });
    });

    it ("Recap Extract Tests - for complex scene", function() {
        const testCase = loadTestResource("complexRecapScene.abc");
        const splitResult = ContentParseHelper.splitToScenes(testCase);

        splitResult.forEach((scene) => {
            const recaps = ContentParseHelper.extractRecaps(scene.text);

            assert.equal(recaps.length, 4, "Number of recap properties defined.");
        });

    });

    describe("Recap Condition Translation Tests", function () {
        it ("a ... b condition", async function() {
            const conditions = [
                "1 ... 2",
                " 1...2 ",
                "1...2",
                "1 ...   2  "
            ];

            const expectedResult = "(1 <= {sampleVar} && 2 >= {sampleVar})";

            conditions.forEach((condition) => {
                const convertedCondition = ContentParseHelper.convertRecapCondition(condition, "sampleVar");

                assert.equal(convertedCondition.trim(), expectedResult, `Conversion check for test case: ${condition}`);
            });
        });

        it ("a, b, c condition", async function() {
            const conditions = [
                "1, 2, 3",
                "1,2,3",
                " 1,   2,3 "
            ];

            const expectedResult = "1 === {sampleVar} || 2 === {sampleVar} || 3 === {sampleVar}";

            conditions.forEach((condition) => {
                const convertedCondition = ContentParseHelper.convertRecapCondition(condition, "sampleVar");

                assert.equal(convertedCondition.trim(), expectedResult, `Conversion check for test case: ${condition}`);
            });
        });

        it ("single condition", async function() {
            const conditions = [
                "1",
                "  1",
                " 1 ",
                "1  "
            ];

            const expectedResult = "1 === {sampleVar}";

            conditions.forEach((condition) => {
                const convertedCondition = ContentParseHelper.convertRecapCondition(condition, "sampleVar");

                assert.equal(convertedCondition.trim(), expectedResult, `Conversion check for test case: ${condition}`);
            });
        });

        it ("mixed condition", async function() {
            const conditions = [
                "1, 3...4",
                "  1, 3 ... 4",
                " 1, 3... 4 ",
                "1, 3...4   "
            ];

            const expectedResult = "1 === {sampleVar} || (3 <= {sampleVar} && 4 >= {sampleVar})";

            conditions.forEach((condition) => {
                const convertedCondition = ContentParseHelper.convertRecapCondition(condition, "sampleVar");

                assert.equal(convertedCondition.trim(), expectedResult, `Conversion check for test case: ${condition}`);
            });
        });
    });
});

function loadTestResource(resourceName: string): string {
    const resourcePath = path.resolve("test", "res");
    const loadedText = fs.readFileSync(path.resolve(resourcePath, resourceName), "utf8");

    return loadedText;
}