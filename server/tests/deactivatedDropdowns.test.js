import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";
// The screens build their dropdowns with this client helper, so it is tested here against real API output
import { membersForProject } from "../../client/src/utils/teamHelpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("deactivated people in assignment dropdowns", () => {
  it("the teams API tells the screen who is deactivated, and the dropdown helper hides them", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const dino = await makeUser("team_member", { name: "Dino" });
    const steve = await makeUser("team_member", { name: "Steve" });
    const team = await Team.create({ teamName: "A", leader: leader._id, members: [dino._id, steve._id] });
    await Project.create({ title: "P", team: team._id, leader: leader._id });

    await request(app).put(`/api/users/${steve._id}/status`).set(authHeader(manager)).send({ isActive: false });

    // exactly what the Leader's screen receives
    const teams = (await request(app).get("/api/teams").set(authHeader(leader))).body;
    const projects = (await request(app).get("/api/projects").set(authHeader(leader))).body;

    const stevePayload = teams[0].members.find((m) => m.name === "Steve");
    expect(stevePayload.isActive).toBe(false); // this field was missing before the fix

    const offered = membersForProject(projects[0]._id, projects, teams).map((m) => m.name);
    expect(offered).toEqual(["Dino"]);
  });

  it("treats accounts without the isActive field (older data) as active", () => {
    const projects = [{ _id: "p1", team: { _id: "t1" } }];
    const teams = [{ _id: "t1", members: [{ _id: "a", name: "Old account" }, { _id: "b", name: "Off", isActive: false }] }];
    expect(membersForProject("p1", projects, teams).map((m) => m.name)).toEqual(["Old account"]);
  });

  it("offers nobody when the project has no team", () => {
    expect(membersForProject("p1", [{ _id: "p1" }], [])).toEqual([]);
  });
});
