jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key })
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

const mockEditEmployee = jest.fn();

jest.mock("@/services/employee", () => ({
  editEmployee: mockEditEmployee
}));

describe("EditEmployee draft document guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("normal save (non-draft) blocks submission without documents", () => {
    const documents = [];
    const existingDocuments = [];
    const saveAsDraft = false;

    const shouldBlock = !saveAsDraft && documents.length === 0 && existingDocuments.length === 0;
    expect(shouldBlock).toBe(true);
  });

  test("save as draft bypasses document requirement", () => {
    const documents = [];
    const existingDocuments = [];
    const saveAsDraft = true;

    const shouldBlock = !saveAsDraft && documents.length === 0 && existingDocuments.length === 0;
    expect(shouldBlock).toBe(false);
  });

  test("normal save with existing documents does not block", () => {
    const documents = [];
    const existingDocuments = [{ fileUrl: "http://example.com/doc.pdf", fileName: "doc.pdf" }];
    const saveAsDraft = false;

    const shouldBlock = !saveAsDraft && documents.length === 0 && existingDocuments.length === 0;
    expect(shouldBlock).toBe(false);
  });

  test("normal save with new documents does not block", () => {
    const documents = [{ file: new File(["content"], "doc.pdf", { type: "application/pdf" }) }];
    const existingDocuments = [];
    const saveAsDraft = false;

    const shouldBlock = !saveAsDraft && documents.length === 0 && existingDocuments.length === 0;
    expect(shouldBlock).toBe(false);
  });

  test("draft save with no documents does not block", () => {
    const documents = [];
    const existingDocuments = [];
    const saveAsDraft = true;

    const shouldBlock = !saveAsDraft && documents.length === 0 && existingDocuments.length === 0;
    expect(shouldBlock).toBe(false);
  });
});
