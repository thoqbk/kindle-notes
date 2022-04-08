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

const markdown4V1 = `---
id: vvv123
name: "Hello vvv123"
---

##
Old Line 1

<!--
hash: eee1232
-->`;

const markdown4V1Empty = `---
id: vvv123
name: "Hello vvv123"
---

##



<!--
hash: eee1232
-->`;

const markdown4V2 = `---
id: vvv123
name: "Hello vvv123"
---

##
New Line 1

<!--
hash: eee1232
-->`;

suite("BookingService Test Suite", () => {
    test("saveBooks should append number to the file name if already exists", async () => {
        // arrange
        mockReadFiles({
            "hello.md": markdown1,
            "hello-2.md": markdown2
        });
        let savedFilePath = "";
        (fs as any).writeFile = (filePath: string) => savedFilePath = filePath;

        // act
        await BookService.saveBooks([book3]);

        // assert
        expect(savedFilePath).to.equal("hello-3.md");
    });

    test("saveBooks should not override the flashcard if modified", async () => {
        // arrange
        mockReadFiles({ "book-4.md": markdown4V1 });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;

        // act
        await BookService.saveBooks([Transformers.markdownToBook(markdown4V2)]);

        // assert
        expect(savedContent).to.contains("Old Line 1");
    });

    test("saveBooks should override the flashcard if the old content is empty", async () => {
        // arrange
        mockReadFiles({ "book-4.md": markdown4V1Empty });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;

        // act
        await BookService.saveBooks([Transformers.markdownToBook(markdown4V2)]);

        // assert
        expect(savedContent).to.contains("New Line 1");
    });

    test("getFlashcardLocation returns correct location", async () => {
        // arrange
        mockReadFiles({ "book-4.md": markdown4V1 });

        // act
        const location = await BookService.getFlashcardLocation("vvv123", "eee1232");

        // assert
        expect(location?.fullFilePath).contains("book-4.md");
        expect(location?.line).to.equal(6);
    });
});

const mockReadFiles = (files: any) => {
    (fs as any).readdir = () => Object.keys(files);
    (fs as any).readFile = (filePath: string) => {
        for (let name of Object.keys(files)) {
            if (filePath.indexOf(name) >= 0) {
                return files[name];
            }
        }
        throw new Error(`Content not found ${filePath}`);
    };
};
