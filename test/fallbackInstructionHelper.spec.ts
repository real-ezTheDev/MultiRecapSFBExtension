import {TestResourceAccessor} from './testResourceAccessor';
import {FallbackInstructionHelper} from './../lib/fallbackInstructionHelper';
import {FormatVerificationError} from './../lib/error/formatVerificationError';

const loadTestResource = TestResourceAccessor.loadTestResource;

import {strict as assert} from 'assert';

describe("FallbackInstructionHelper Unit Tests", function () {

    it("Translate scene with conditional fallback.", async function () {
        const testCase = loadTestResource("fallbackWithCondition.abc");
        const translated = FallbackInstructionHelper.translateSceneForFallback(testCase, "testVar");

        assert.equal(translated, `@start\n*say\n\tThis is a say message.\n\tSay hello to continue, and say recap for a recap.\n*reprompt\n\tthis is a reprompt messsage.\n*recap\n\tdefault recap.\n*then\n\thear continue, hello {\n\t\t-> continue scene\n\t}\n\n\thear recap, * {\n\t\t-> start *recap\n\t}\n\nif  2 === testVar {\n\t-> fallback scene\n}`);
    });

    it("Translate scene with conditional fallback.", async function () {
        const testCase = loadTestResource("fallbackWithoutCondition.abc");
        const translated = FallbackInstructionHelper.translateSceneForFallback(testCase, "testVar");

        assert.equal(translated, `@start\n*say\n\tThis is a say message.\n\tSay hello to continue, and say recap for a recap.\n*reprompt\n\tthis is a reprompt messsage.\n*recap\n\tdefault recap.\n*then\n\thear continue, hello {\n\t\t-> continue scene\n\t}\n\n\thear recap, * {\n\t\t-> start *recap\n\t}\n\nif testVar >= 1 {\n\t-> fallback scene\n}`);
    });

    it("Verify bad format - Missing Parameters", async function() {
        const testingLine = `fallback`;
        try {
            FallbackInstructionHelper.verifyFormat(testingLine);
            assert.fail("Exptected error FormatVerificationError not thrown.");
        } catch (err) {
            if (!(err instanceof FormatVerificationError)) {
                assert.fail(`Unexpected error thrown: ${err}`);
            }
        }
    });

    it("Verify bad format - Missing Destination Only", async function() {
        const testingLine = `fallback 1 ->`;
        try {
            FallbackInstructionHelper.verifyFormat(testingLine);
            assert.fail("Exptected error FormatVerificationError not thrown.");
        } catch (err) {
            if (!(err instanceof FormatVerificationError)) {
                assert.fail(`Unexpected error thrown: ${err}`);
            }
        }
    });

    it("Verify bad format - Missing Destination Section Only", async function() {
        const testingLine = `fallback 1`;
        try {
            FallbackInstructionHelper.verifyFormat(testingLine);
            assert.fail("Exptected error FormatVerificationError not thrown.");
        } catch (err) {
            if (!(err instanceof FormatVerificationError)) {
                assert.fail(`Unexpected error thrown: ${err}`);
            }
        }
    });

    it("Verify format pass - missing condition", async function() {
        const testingLine = `fallback -> destination`;
        FallbackInstructionHelper.verifyFormat(testingLine);
    });
});