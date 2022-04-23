import { expect } from "chai";
import * as fs from "fs/promises";
import * as Files from "../utils/files";
import config from "../config";
import db from "../db";

suite("Db Util Test Suite", () => {
    test("load returns correct result", async () => {
        // arrange
        (fs as any).readFile = () => `{ "sessions": [1], "sm2": [2] }`;
        (config as any).throwOrGetFlashcardsHomePath = () => "test";
        (Files as any).exists = () => true;

        // act
        const result = await db.load();

        // assert
        expect(result).to.deep.contain({
            sessions: [1],
            sm2: [2],
        });
    });

    test("load returns cached data if dbPath doesn't change", async () => {
        // arrange
        (fs as any).readFile = () => `{ "sessions": [1], "sm2": [2] }`;
        (config as any).throwOrGetFlashcardsHomePath = () => "test";
        (Files as any).exists = () => true;

        // act & assert
        expect(await db.load()).to.not.null;
        expect(await db.load() === await db.load()).to.be.true;
    });

    test("load re-loads data if dbPath has changed", async () => {
        // arrange
        (Files as any).exists = () => true;
        (fs as any).readFile = () => `{ "sessions": [1], "sm2": [2] }`;
        (config as any).throwOrGetFlashcardsHomePath = () => "test";
        const result1 = await db.load();
        
        (config as any).throwOrGetFlashcardsHomePath = () => "test2";
        const result2 = await db.load();

        // assert
        expect(result1).to.not.null;
        expect(result1 === result2).to.be.false;
        expect(result1).to.deep.equal(result2);
    });
});
