import { expect } from "chai";
import * as KindleService from "../../../services/kindle-service";

suite("KindleService Test Suite", () => {
    test("login should return false if the config for kindleEmail is blank", async () => {
        expect(await KindleService.login("", "abc")).to.be.false;
    });

    test("login should return false if no pw in the keychain", async () => {
        expect(await KindleService.login("abc", "")).to.be.false;
    });
});
