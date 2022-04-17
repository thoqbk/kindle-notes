import { expect } from "chai";
import * as path from "path";
import * as os from "os";
import * as fsAsync from "fs/promises";
import config from "../../../config";
import * as Files from "../../../utils/files";
import constants from "../../../constants";

suite("Transformers Util Test Suite", () => {
    test("determineFileName should return short name if found `:`", () => {
        expect(Files.determineFileName("abc 123   bbb ccc: eee Your vvv Around Your Life, xyz zzz ccc ddd vvv wer"))
            .to.equal("abc-123-bbb-ccc.md");
        expect(Files.determineFileName("Bbb ccc ddd, eee and bbbz : A zzz One-Step Plan vv Dddd and BB Crde"))
            .to.equal("bbb-ccc-ddd-eee-and-bbbz.md");
        expect(Files.determineFileName("Abc def: ayz mgr - hello singapore"))
            .to.equal("abc-def.md");
    });

    test("determineFileName uses dash to pick the shorter name", () => {
        expect(Files.determineFileName("System Vedre Bzsdde  - Bc dsadsad's vvvvv"))
            .to.equal("system-vedre-bzsdde.md");
    });

    test("determineFileName uses all words if name has less than or equal 5 words", () => {
        expect(Files.determineFileName("abc: def - ghz   123 456"))
            .to.equal("abc-def-ghz-123-456.md");
    });

    test("determineFileName should ignore content in `()`", () => {
        expect(Files.determineFileName("Best-Dbcven HelloScript Vdsadsad (Developer's Library)"))
            .to.equal("best-dbcven-helloscript-vdsadsad.md");
    });

    test("determineFileName returns full name if delimiter not found", () => {
        expect(Files.determineFileName("Abc dad 12312 3ddew 323d vvasd 23123 ddd-bb"))
            .to.equal("abc-dad-12312-3ddew-323d-vvasd-23123-ddd-bb.md");
    });

    test("checkAndFixWinSelectedPath return fixed filePath if is Windows OS", () => {
        // arrange
        (os as any).platform = () => "win32";

        // act & assert
        expect(Files.checkAndFixWinSelectedPath("/C:/a/b/c")).eq("C:\\a\\b\\c");
        expect(Files.checkAndFixWinSelectedPath("\\C:\\a\\b\\c")).eq("C:\\a\\b\\c");
    });

    test("getOrCreateFlashcardsDir returns value from config if exists", async () => {
        // arrange
        config.getFlashcardsHomePath = () => "test";

        // act & assert
        expect(await Files.getOrCreateFlashcardsDir()).eq("test");
    });

    test("getOrCreateFlashcardsDir creates flashcards dir if not exist", async () => {
        // arrange
        const flashcardsDir = path.join(os.homedir(), "flashcards");
        config.getFlashcardsHomePath = () => "";
        let configKeyUpdated = "";
        let configValueUpdated = "";
        (config as any).updateConfig = (key: string, value: string) => {
            configKeyUpdated = key;
            configValueUpdated = value;
        };
        (Files as any).exists = () => false;
        let checkOrCreateCalled = false;
        (Files as any).checkOrCreate = () => {
            checkOrCreateCalled = true;
        };

        // act & assert
        expect(await Files.getOrCreateFlashcardsDir()).eq(flashcardsDir);
        expect(checkOrCreateCalled).is.true;
        expect(configKeyUpdated).to.eq(constants.flashcardsHomePathConfigKey);
        expect(configValueUpdated).to.eq(flashcardsDir);
    });

    test("getOrCreateFlashcardsDir copies demo books if folder not exist", async () => {
        // arrange
        const flashcardsDir = path.join(os.homedir(), "flashcards");
        config.getFlashcardsHomePath = () => "";
        (config as any).updateConfig = () => {};
        (Files as any).exists = () => false;
        (Files as any).checkOrCreate = () => {};
        (Files as any).getFileNames = (folderPath: string, extension: string) => {
            if (folderPath.indexOf("demo") >= 0) {
                return ["hello.md"];
            } else {
                return [];
            }
        };
        let copySrc = "";
        let copyDest = "";
        (fsAsync as any).copyFile = (src: string, dest: string) => {
            copySrc = src;
            copyDest = dest;
        };

        // act
        await Files.getOrCreateFlashcardsDir();

        // assert
        expect(copySrc).contains(path.join("demo", "hello.md"));
        expect(copyDest).to.equal(path.join(flashcardsDir, "hello.md"));
    });
});
