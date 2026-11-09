import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { startDb, stopDb, reconnectDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);

describe("when the database goes down", () => {
  it("answers 503 with a clear message, reports it on /health, and recovers by itself", async () => {
    const user = await makeUser("manager");
    const headers = authHeader(user);

    expect((await request(app).get("/health")).body).toEqual({ status: "ok", database: "connected" });
    expect((await request(app).get("/api/tasks").set(headers)).status).toBe(200);

    await mongoose.disconnect(); // the outage

    const api = await request(app).get("/api/tasks").set(headers);
    expect(api.status).toBe(503);
    expect(api.body.message).toMatch(/temporarily unavailable/);
    expect(api.headers["retry-after"]).toBe("5");

    const health = await request(app).get("/health");
    expect(health.status).toBe(503);
    expect(health.body).toEqual({ status: "degraded", database: "disconnected" });

    expect((await request(app).get("/")).status).toBe(200); // the server itself is still up

    await reconnectDb(); // the database comes back

    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/api/tasks").set(headers)).status).toBe(200);
  });
});
