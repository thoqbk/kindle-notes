import { expect } from "chai";
import db from "../../../db";
import * as Times from "../../../utils/times";
import * as Transformers from "../../../utils/transformers";
import * as BookService from "../../../services/book-service";
import * as FlashcardService from "../../../services/flashcard-service";

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
        db.sm2 = [{
            hash: "fc3",
            bookId: "123",
            easinessFactor: 3,
            repetitionNumber: 1.2,
            interval: 2,
            lastReview: 1649499442925
        }, {
            hash: "fc1",
            bookId: "123",
            easinessFactor: 2,
            repetitionNumber: 4.2,
            interval: 1,
            lastReview: 1649413042925
        }];

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
        db.sm2 = [{
            hash: "fc3",
            bookId: "123",
            easinessFactor: 3,
            repetitionNumber: 1.2,
            interval: 1,
            lastReview: 0
        }, {
            hash: "fc1",
            bookId: "123",
            easinessFactor: 2,
            repetitionNumber: 4.2,
            interval: 1,
            lastReview: 0
        }, {
            hash: "fc2",
            bookId: "123",
            easinessFactor: 2,
            repetitionNumber: 4.2,
            interval: 1,
            lastReview: 0
        }];

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
        db.sessions = [{
            id: "test-session",
            bookId: "123",
            scheduled: ["fc1", "fc2"],
            needToReview: [],
            totalFlashcards: 5,
            shown: 1,
            status: "on-going",
            startedAt: 0,
        }];

        // act
        const result = await FlashcardService.nextFlashcard("test-session");

        // assert
        expect(result).contains({
            hash: "fc2",
            position: 1,
            totalFlashcards: 5
        });
    });

    test("nextFlashcard should pick flashcards from needToReview if finish scheduled ones", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        db.sessions = [{
            id: "test-session",
            bookId: "123",
            scheduled: ["fc1", "fc2"],
            needToReview: ["fc3"],
            totalFlashcards: 5,
            shown: 2,
            status: "on-going",
            startedAt: 0,
        }];

        // act
        const result = await FlashcardService.nextFlashcard("test-session");

        // assert
        expect(result).contains({
            hash: "fc3",
            position: 2,
            totalFlashcards: 5
        });
    });

    test("saveResult should update Sm2 in Db", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        (Times as any).now = () => 12345;
        db.sessions = [{
            id: "test-session",
            bookId: "123",
            scheduled: ["fc1", "fc2"],
            needToReview: ["fc3"],
            totalFlashcards: 5,
            shown: 2,
            status: "on-going",
            startedAt: 0,
        }];
        db.sm2 = [{
            bookId: "123",
            hash: "fc3",
            easinessFactor: 1.2,
            repetitionNumber: 0,
            interval: 0,
            lastReview: 0,
        }];

        // act
        await FlashcardService.saveResult({
            sessionId: "test-session",
            flashcardHash: "fc3",
            grade: 3,
        });

        // assert
        expect(db.sm2).has.lengthOf(1);
        expect(db.sessions[0]).to.deep.contains({
            scheduled: ["fc1", "fc2"],
            needToReview: [],
            status: "on-going",
        });
        expect(db.sm2[0].lastReview).to.eq(12345);
    });

    test("saveResult should mark session as completed if it's the last flashcard", async () => {
        // arrange
        (BookService as any).getBook = () => book1;
        (Times as any).now = () => 12345;
        db.sessions = [{
            id: "test-session",
            bookId: "123",
            scheduled: ["fc1", "fc2"],
            needToReview: ["fc3"],
            totalFlashcards: 5,
            shown: 5,
            status: "on-going",
            startedAt: 0,
        }];
        db.sm2 = [];

        // act
        await FlashcardService.saveResult({
            sessionId: "test-session",
            flashcardHash: "fc1",
            grade: 1,
        });

        // assert
        expect(db.sessions[0]).to.deep.contains({
            scheduled: ["fc1", "fc2"],
            needToReview: ["fc3", "fc1"],
            status: "completed",
        });
    });
});
