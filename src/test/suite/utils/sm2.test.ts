import { expect } from "chai";
import sm2 from "../../../utils/sm2";

suite("Sm2 Util Test Suite", () => {
    test("sm2 should return valid values", () => {
        const result = sm2({
            userGrade: 4,
            repetitionNumber: 1,
            easinessFactor: 2.6,
            interval: 1
        });

        expect(result).to.eqls({
            easinessFactor: 2.6,
            interval: 6,
            repetitionNumber: 2,
        });
    });
});