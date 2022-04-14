import * as fs from "fs/promises";
import { expect } from "chai";
import * as BookService from "../../../services/book-service";
import * as Transformers from "../../../utils/transformers";
import { Book } from "../../../types/services";

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

const markdownBookToTestMerging: Book = {
    id: "123",
    name: "test-123",
    author: "test author",
    photo: "test photo",
    flashcards: [{
        hash: "k-1",
        content: "k 1",
        src: "kindle",
    }, {
        hash: "k-2",
        content: "k 2",
        src: "kindle",
    }, {
        hash: "u-1",
        content: "u 1",
        src: "user",
    }, {
        hash: "u-2",
        content: "u 2",
        src: "user",
    }, {
        hash: "k-3",
        content: "k 3",
        src: "kindle",
    }],
};

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
        expect(savedFilePath).to.contain("hello-3.md");
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
    
    test("saveBooks should keep the relative order of the user's flashcards", async () => {
        // arrange
        mockReadFiles({ "book.md": Transformers.bookToMarkdown(markdownBookToTestMerging) });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;
        
        // act
        const fromKindle: Book = {
            id: "123",
            name: "test-123",
            author: "test author",
            photo: "test photo",
            flashcards: [{
                hash: "k-1",
                content: "k 1",
                src: "kindle",
            }, {
                hash: "k-3",
                content: "k 3",
                src: "kindle",
            }],
        };
        
        await BookService.saveBooks([fromKindle]);
        const savedBook = Transformers.markdownToBook(savedContent);
        
        // assert
        expect(savedBook.flashcards.map(fc => fc.hash)).to.deep.equal(["k-1", "u-1", "u-2", "k-3"]);
    });
    
    test("saveBooks should keep correct posible of the user's flashcard if no kindle flashcars before it", async () => {
        // arrange
        mockReadFiles({ "book.md": Transformers.bookToMarkdown(markdownBookToTestMerging) });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;
        
        // act
        const fromKindle: Book = {
            id: "123",
            name: "test-123",
            author: "test author",
            photo: "test photo",
            flashcards: [{
                hash: "k-3",
                content: "k 3",
                src: "kindle",
            }],
        };
        
        await BookService.saveBooks([fromKindle]);
        const savedBook = Transformers.markdownToBook(savedContent);
        
        // assert
        expect(savedBook.flashcards.map(fc => fc.hash)).to.deep.equal(["u-1", "u-2", "k-3"]);
    });
    
    test("saveBooks should pick all flashcards even kindle returns flashcards in different order", async () => {
        // arrange
        mockReadFiles({ "book.md": Transformers.bookToMarkdown(markdownBookToTestMerging) });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;
        
        // act
        const fromKindle: Book = {
            id: "123",
            name: "test-123",
            author: "test author",
            photo: "test photo",
            flashcards: [{
                hash: "k-3",
                content: "k 3",
                src: "kindle",
            }, {
                hash: "k-1",
                content: "k 1",
                src: "kindle",
            }],
        };
        
        await BookService.saveBooks([fromKindle]);
        const savedBook = Transformers.markdownToBook(savedContent);
        
        // assert
        expect(savedBook.flashcards.map(fc => fc.hash)).to.deep.equal(["k-3", "k-1", "u-1", "u-2"]);
    });

    test("saveBooks should not pick same flashcard twice", async () => {
        // arrange
        mockReadFiles({ "book.md": Transformers.bookToMarkdown(markdownBookToTestMerging) });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;
        
        // act
        const fromKindle: Book = {
            id: "123",
            name: "test-123",
            author: "test author",
            photo: "test photo",
            flashcards: [{
                hash: "k-3",
                content: "k 3",
                src: "kindle",
            }, {
                hash: "k-2",
                content: "k 2",
                src: "kindle",
            } , {
                hash: "k-1",
                content: "k 1",
                src: "kindle",
            } , {
                hash: "k-4",
                content: "k 4",
                src: "kindle",
            }],
        };
        
        await BookService.saveBooks([fromKindle]);
        const savedBook = Transformers.markdownToBook(savedContent);
        
        // assert
        expect(savedBook.flashcards.map(fc => fc.hash)).to.deep.equal(["k-3", "k-2", "u-1", "u-2", "k-1", "k-4"]);
    });

    test("saveBooks should keep user's flashcard card to be relative to the next kindle one", async () => {
        const markdownBook: Book = {
            id: "123",
            name: "test-123",
            author: "test author",
            photo: "test photo",
            flashcards: [{
                hash: "k-1",
                content: "k 1",
                src: "kindle",
            },{
                hash: "u-1",
                content: "k 1",
                src: "user",
            }, {
                hash: "u-2",
                content: "u 2",
                src: "user",
            }, {
                hash: "k-4",
                content: "k 2",
                src: "kindle",
            }],
        };
        // arrange
        mockReadFiles({ "book.md": Transformers.bookToMarkdown(markdownBook) });
        let savedContent = "";
        (fs as any).writeFile = (filePath: string, content: string) => savedContent = content;
        
        // act
        const fromKindle: Book = {
            id: "123",
            name: "test-123",
            author: "test author",
            photo: "test photo",
            flashcards: [{
                hash: "k-4",
                content: "k 4",
                src: "kindle",
            }],
        };
        
        await BookService.saveBooks([fromKindle]);
        const savedBook = Transformers.markdownToBook(savedContent);
        
        // assert
        expect(savedBook.flashcards.map(fc => fc.hash)).to.deep.equal(["u-1", "u-2", "k-4"]);
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
