import { expect } from "chai";
import db from "../../../db";
import * as fs from "fs/promises";
import * as Times from "../../../utils/times";
import * as Files from "../../../utils/files";
import * as Transformers from "../../../utils/transformers";
import * as BookService from "../../../services/book-service";
import * as FlashcardService from "../../../services/flashcard-service";
import { DbData } from "../../../types/services";

const book1 = Transformers.markdownToBook(`---
id: 123
name: "test book"
---

##
Hello 1

%%
backside line 1

<!--
hash: fc1
-->

##
Hello 2

<!--
hash: fc2
-->

##
Hello 3

<!--
hash: fc3
-->
`);

suite("FlashcardService Test Suite", () => {
    test("newStudySession should return scheduled flashcards with considering of sm2.interval", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        (Times as any).now = () => 1649499442925;
        mockReadDbFile({
            sessions: [],
            sm2: [{
                hash: "fc3",
                bookId: "123",
                easinessFactor: 3,
                repetitionNumber: 1.2,
                interval: 2,
                lastReview: 1649499442925,
                lastGrade: 1,
            }, {
                hash: "fc1",
                bookId: "123",
                easinessFactor: 2,
                repetitionNumber: 4.2,
                interval: 1,
                lastReview: 1649413042925,
                lastGrade: 3,
            }]
        });

        // act
        const result = await FlashcardService.newStudySession({
            bookId: "123",
            totalFlashcards: 3
        });

        // assert
        expect(result).to.deep.contain({
            bookId: "123",
            scheduled: ["fc1", "fc2"],
            totalFlashcards: 3,
            shown: 0,
            status: "on-going"
        });
    });

    test("newStudySession should return randomize flashcards if there's no validAge cards", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        (Times as any).now = () => 0;
        mockReadDbFile({
            sessions: [],
            sm2: [{
                    hash: "fc3",
                    bookId: "123",
                    easinessFactor: 3,
                    repetitionNumber: 1.2,
                    interval: 1,
                    lastReview: 0,
                    lastGrade: 1,
                }, {
                    hash: "fc1",
                    bookId: "123",
                    easinessFactor: 2,
                    repetitionNumber: 4.2,
                    interval: 1,
                    lastReview: 0,
                    lastGrade: 2,
                }, {
                    hash: "fc2",
                    bookId: "123",
                    easinessFactor: 2,
                    repetitionNumber: 4.2,
                    interval: 1,
                    lastReview: 0,
                    lastGrade: 3,
            }]
        });

        // act
        const result = await FlashcardService.newStudySession({
            bookId: "123",
            totalFlashcards: 3
        });

        // assert
        expect(result).to.deep.contain({
            scheduled: ["fc1", "fc2", "fc3"]
        });
    });

    test("nextFlashcard should pick flashcard from scheduled if needToReview is not full", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        mockReadDbFile({
            sessions: [{
                id: "test-session",
                bookId: "123",
                scheduled: ["fc1", "fc2"],
                needToReview: [],
                totalFlashcards: 5,
                shown: 1,
                status: "on-going",
                startedAt: 0,
            }],
            sm2: [],
        });

        // act
        const result = await FlashcardService.nextFlashcard("test-session");

        // assert
        expect(result).contains({
            hash: "fc2",
            position: 1,
            totalFlashcards: 5,
            src: "user",
        });
    });

    test("nextFlashcard should pick flashcards from needToReview if finish scheduled ones", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        mockReadDbFile({
            sessions: [{
                id: "test-session",
                bookId: "123",
                scheduled: ["fc1", "fc2"],
                needToReview: ["fc3"],
                totalFlashcards: 5,
                shown: 2,
                status: "on-going",
                startedAt: 0,
            }],
            sm2: []
        });

        // act
        const result = await FlashcardService.nextFlashcard("test-session");

        // assert
        expect(result).contains({
            hash: "fc3",
            position: 2,
            totalFlashcards: 5
        });
    });

    test("nextFlashcard should return lastGrade if exists", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        mockReadDbFile({
            sessions:[{
                id: "test-session",
                bookId: "123",
                scheduled: ["fc1", "fc2"],
                needToReview: [],
                totalFlashcards: 5,
                shown: 0,
                status: "on-going",
                startedAt: 0,
            }],
            sm2: [{
                hash: "fc1",
                bookId: "123",
                easinessFactor: 2,
                repetitionNumber: 4.2,
                interval: 1,
                lastReview: 1649413042925,
                lastGrade: 3,
            }]
        });

        // act
        const result = await FlashcardService.nextFlashcard("test-session");

        // assert
        expect(result.lastGrade).to.equal(3);
    });

    test("saveResult should update Sm2 in Db", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        (Times as any).now = () => 12345;
        mockReadDbFile({
            sessions: [{
                id: "test-session",
                bookId: "123",
                scheduled: ["fc1", "fc2"],
                needToReview: ["fc3"],
                totalFlashcards: 5,
                shown: 2,
                status: "on-going",
                startedAt: 0,
            }],
            sm2: [{
                bookId: "123",
                hash: "fc3",
                easinessFactor: 1.2,
                repetitionNumber: 0,
                interval: 0,
                lastReview: 0,
                lastGrade: 3,
            }]
        });

        // act
        await FlashcardService.saveResult({
            sessionId: "test-session",
            flashcardHash: "fc3",
            grade: 3,
        });

        // assert
        const loadedDb = await db.load();
        expect(loadedDb.sm2).has.lengthOf(1);
        expect(loadedDb.sessions[0]).to.deep.contains({
            scheduled: ["fc1", "fc2"],
            needToReview: [],
            status: "on-going",
        });
        expect(loadedDb.sm2[0].lastReview).to.eq(12345);
    });

    test("saveResult should mark session as completed if it's the last flashcard", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        (Times as any).now = () => 12345;
        mockReadDbFile({
            sessions:[{
                id: "test-session",
                bookId: "123",
                scheduled: ["fc1", "fc2"],
                needToReview: ["fc3"],
                totalFlashcards: 5,
                shown: 5,
                status: "on-going",
                startedAt: 0,
            }],
            sm2: [],
        });

        let savedData: any = null;
        (db as any).save = (savingData: DbData) => savedData = savingData;

        // act
        await FlashcardService.saveResult({
            sessionId: "test-session",
            flashcardHash: "fc1",
            grade: 1,
        });

        // assert
        expect(savedData.sessions[0]).to.deep.contains({
            scheduled: ["fc1", "fc2"],
            needToReview: ["fc3", "fc1"],
            status: "completed",
        });
    });
});

const mockReadDbFile = (data: DbData) => {
    db.clearCache();
    (Files as any).exists = () => true;
    (fs as any).readFile = () => JSON.stringify(data);
    (fs as any).writeFile = () => {};
};
