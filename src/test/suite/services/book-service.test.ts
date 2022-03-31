import * as fs from "fs/promises";
import { expect } from "chai";
import * as BookService from "../../../services/book-service";
import * as Transformers from "../../../utils/transformers";

const markdown1 = `---
id: 123
name: "Hello: tiger"
---

##
Line 1
`;

const markdown2 = `---
id: 321
name: "Hello: monkey monkey monkey monkey monkey"
---

##
Line 2
`;

const book3 = Transformers.markdownToBook(`---
id: 999
name: "Hello: rabbit rabbit rabbit rabbit rabbit rabbit"
---

##
Line 22
`);

suite("BookingService Test Suite", () => {
    test("saveBooks will append number to the file name if already exists", async () => {
        // arrange
        let savedFilePath = "";
        (fs as any).readdir = () => ["hello.md", "hello-2.md"];
        (fs as any).readFile = (filePath: string) => {
            if (filePath.indexOf("hello.md") >= 0) {
                return markdown1;
            } else if (filePath.indexOf("hello-2.md") >= 0) {
                return markdown2;
            }
            throw new Error(`Cannot read this file ${filePath}`);
        };
        (fs as any).writeFile = (filePath: string) => savedFilePath = filePath;

        // act
        await BookService.saveBooks([book3]);

        // assert
        expect(savedFilePath).to.equal("hello-3.md");
    });
});
