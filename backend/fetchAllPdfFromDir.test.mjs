
// describe("fetchAllPdfFromDir", () => {
//     beforeAll(() => {
//         mockFs({
//             testDir: {
//                 "file1.pdf": "content file1",
//                 "file3.pdf": "content file3",
//             },
//         });
//     });
//
//     afterAll(() => {
//         mockFs.restore();
//     });
//
//     it("should include PDF files", async () => {
//         const files = await fetchAllPdfFromDir();
//         expect(files).toContain("file1.pdf");
//         expect(files).toContain("file3.pdf");
//         expect(files).not.toContain("file2.txt");
//     });
// });
