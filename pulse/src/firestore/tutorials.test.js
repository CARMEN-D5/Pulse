const mockDoc = jest.fn((...parts) => parts.join("/"));
const mockUpdateDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => "SERVER_TIMESTAMP");

jest.mock("../firebase", () => ({ db: "DB" }));
jest.mock("firebase/firestore", () => ({
  doc: (...args) => mockDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

import { resetTutorialProgress, saveTutorialResult } from "./tutorials";

describe("tutorial Firestore helpers", () => {
  beforeEach(() => jest.clearAllMocks());

  test("stores a versioned completed or skipped result on the user document", async () => {
    mockUpdateDoc.mockResolvedValueOnce();
    await expect(saveTutorialResult("u1", "financeSpending", 1, "completed")).resolves.toEqual({
      ok: true,
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith("DB/users/u1", {
      "tutorialProgress.financeSpending": {
        version: 1,
        status: "completed",
        updatedAt: "SERVER_TIMESTAMP",
      },
      updatedAt: "SERVER_TIMESTAMP",
    });
  });

  test("reset replaces tutorial progress with an empty map", async () => {
    mockUpdateDoc.mockResolvedValueOnce();
    await expect(resetTutorialProgress("u1")).resolves.toEqual({ ok: true });
    expect(mockUpdateDoc).toHaveBeenCalledWith("DB/users/u1", {
      tutorialProgress: {},
      updatedAt: "SERVER_TIMESTAMP",
    });
  });

  test("returns a result error instead of throwing", async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error("offline"));
    await expect(saveTutorialResult("u1", "todo", 1, "skipped")).resolves.toEqual({
      ok: false,
      error: "offline",
    });
  });
});
