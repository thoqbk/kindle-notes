import { expect } from "chai";
import prettier from "../../../utils/prettier";
import * as Transformers from "../../../utils/transformers";

const markdown1 = `---
name: hello
---

##
Flashcard 1

##
Flashcard 2

<!--
hash: "123"
-->
`;

suite("Prettier Util Test Suite", () => {
    test("prettier should add hash and custom meta fields if missing", () => {
        // act
        const result = prettier(markdown1);

        // assert
        expect(result.status).to.eq("modified");
        const book = Transformers.markdownToBook(result.markdownContent);
        expect(book.flashcards[0].hash.length).to.greaterThan(5);
        expect(book.flashcards[0].src).to.eq("user");
    });
});
