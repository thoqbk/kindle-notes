import { Sm2Request, Sm2Result } from "../types/services";

/**
 * Sm2 algorithm:
 * https://en.wikipedia.org/wiki/SuperMemo
 */
const sm2 = (request: Sm2Request): Sm2Result => {
    const retVal: Sm2Result = {
        repetitionNumber: request.repetitionNumber,
        easinessFactor: request.easinessFactor,
        interval: request.interval,
    };
    if (request.userGrade >= 2) {
        if (request.repetitionNumber === 0) {
            retVal.interval = 1;
        } else if (request.repetitionNumber === 1) {
            retVal.interval = 6;
        } else {
            retVal.interval = Math.round(request.interval * request.easinessFactor);
        }
        retVal.repetitionNumber++;
    } else {
        retVal.repetitionNumber = 0;
        retVal.interval = 1;
    }

    const newEf = request.easinessFactor
        + (0.1 - (5 - request.userGrade) * (0.08 + (5 - request.userGrade) * 0.02));
    retVal.easinessFactor = Math.max(1.3, newEf);

    return retVal;
};

export default sm2;
