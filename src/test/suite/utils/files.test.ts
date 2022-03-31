import { expect } from "chai";
import * as Files from "../../../utils/files";

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
});
