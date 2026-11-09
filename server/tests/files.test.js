import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Task from "../models/Task.js";
import Attachment from "../models/Attachment.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");
const EXE = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // "MZ": a Windows program
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

async function upload(buffer, filename, contentType) {
  const member = await makeUser("team_member");
  const task = await Task.create({ title: "t", assignedUser: member._id });
  const req = request(app).post("/api/attachments").set(authHeader(member)).field("task", task._id.toString());
  return req.attach("file", buffer, contentType ? { filename, contentType } : filename);
}

describe("upload content checks", () => {
  it("accepts real files whose contents match their extension", async () => {
    expect((await upload(PNG, "photo.png")).status).toBe(201);
    expect((await upload(PDF, "spec.pdf")).status).toBe(201);
    expect((await upload(ZIP, "report.docx")).status).toBe(201);
    expect((await upload(Buffer.from("hello, plain text\n"), "notes.txt")).status).toBe(201);
    expect((await upload(Buffer.from([0x6e, 0x61, 0x6d, 0x65, 0x2c, 0xe9, 0x0a]), "list.csv")).status).toBe(201); // Windows-1252 "é"
  });

  it("refuses a program renamed to look like something harmless", async () => {
    const res = await upload(EXE, "holiday.png");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/do not match/);
    expect((await upload(EXE, "invoice.pdf")).status).toBe(400);
    expect(await Attachment.countDocuments()).toBe(0);
  });

  it("refuses text pretending to be an image or an Office file", async () => {
    expect((await upload(Buffer.from("just words"), "pic.png")).status).toBe(400);
    expect((await upload(Buffer.from("just words"), "doc.docx")).status).toBe(400);
  });

  it("refuses binary data pretending to be text, and empty files", async () => {
    expect((await upload(Buffer.from([0x68, 0x69, 0x00, 0x01, 0x02]), "notes.txt")).status).toBe(400);
    expect((await upload(Buffer.alloc(0), "empty.txt")).status).toBe(400);
  });

  it("still refuses extensions that are not allowed at all", async () => {
    expect((await upload(EXE, "setup.exe")).status).toBe(400);
    expect((await upload(Buffer.from("<script>1</script>"), "page.html")).status).toBe(400);
  });

  it("stores the content type it detected, not the one the uploader claimed", async () => {
    const res = await upload(PNG, "photo.png", "text/html");
    expect(res.status).toBe(201);
    expect(res.body.mimeType).toBe("image/png");
  });
});
