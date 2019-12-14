jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/tool-cache');

const _ = require('lodash');
const core = require('@actions/core');
const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');

const main = require('..');
const policyEvaluationFixture = require('./fixtures/policy_evaluation.fixture');
const contentMergeFixture = require('./fixtures/content-merge.fixture');

describe('unit-tests', () => {
    it('tests merge of outputs into single bill of materials with os-only packages', async () => {
        let merged = main.mergeResults([contentMergeFixture["content-os.json"]]);
        //console.log("os-only output: " +JSON.stringify(merged));
        expect(merged.length).toBeGreaterThan(0);

    });

    it('tests merge of outputs into single bill of materials with all packages', async () => {
        let merged = main.mergeResults([contentMergeFixture["content-os.json"], contentMergeFixture["content-npm.json"], contentMergeFixture["content-gem.json"], contentMergeFixture["content-java.json"], contentMergeFixture["content-python.json"]]);
        //console.log("merged output: " +JSON.stringify(merged));
        expect(merged.length).toBeGreaterThan(0);
    });

    it('tests finding content files in dir', async () => {
        let testPath = path.join(__dirname, "fixtures");
        fs.readdirSync = jest.fn(() => {
            return Object.keys(contentMergeFixture);
        });

        let contentFiles = main.findContent(testPath);
        expect(contentFiles.length).toEqual(5);
    });

    it('tests loading content in list', async () => {
        fs.readFileSync = jest.fn((i) => {
            return JSON.stringify(contentMergeFixture[i]);
        });

        let contentFiles = main.loadContent(Object.keys(contentMergeFixture));
        expect(contentFiles.length).toEqual(5);
    });
});

describe('functional-tests', () => {
    beforeEach(() => {
        exec.exec = jest.fn();
        fs.readdirSync = jest.fn(() => {
            return Object.keys(contentMergeFixture);
        });
        fs.writeFileSync = jest.fn();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('localbuild/testimage:12345')  // image-reference
            .mockReturnValueOnce(null)                          // custom-policy-path
            .mockReturnValueOnce('./Dockerfile')                // dockerfile-path
            .mockReturnValueOnce('true')                        // debug
            .mockReturnValueOnce('true')                        // fail-build
            .mockReturnValueOnce('true')                        // include-app-packages
            .mockReturnValueOnce(null);                         // version
    });

    it('completes the build successfully when there are no policy violations', async () => {
        fs.readFileSync = jest.fn(() => {
            return JSON.stringify(policyEvaluationFixture);
        });
        core.setFailed = jest.fn();

        await main.run();

        expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('fails the build when there is a policy violation', async () => {
        fs.readFileSync = jest.fn(() => {
            // Set the status to fail
            _.set(policyEvaluationFixture[0], 'sha256:0c24303.nginx:latest[0].status', 'fail');

            return JSON.stringify(policyEvaluationFixture);
        });
        core.setFailed = jest.fn();

        await main.run();

        expect(core.setFailed).toHaveBeenCalled();
    });
});
