import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Team from "../models/Team.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const createTeam = (user, body) => request(app).post("/api/teams").set(authHeader(user)).send(body);

describe("creating and editing teams", () => {
  it("lets a manager create a team with a leader and members", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const m1 = await makeUser("team_member");
    const m2 = await makeUser("team_member");
    const res = await createTeam(manager, { teamName: "  Alpha ", leader: leader._id, members: [m1._id, m2._id, m1._id] });
    expect(res.status).toBe(201);
    expect(res.body.teamName).toBe("Alpha");
    expect(res.body.members).toHaveLength(2); // duplicate removed
    expect(res.body.leader.name).toBe(leader.name);
  });

  it("only lets a manager manage teams", async () => {
    const leader = await makeUser("team_leader");
    const res = await createTeam(leader, { teamName: "Mine", leader: leader._id });
    expect(res.status).toBe(403);
  });

  it("rejects wrong roles: a member as leader, a leader as member", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const member = await makeUser("team_member");
    expect((await createTeam(manager, { teamName: "A", leader: member._id })).status).toBe(400);
    expect((await createTeam(manager, { teamName: "B", members: [leader._id] })).status).toBe(400);
    expect((await createTeam(manager, { teamName: "", leader: leader._id })).status).toBe(400);
  });

  it("allows a member in only one team and a leader leading only one team", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const other = await makeUser("team_leader");
    const member = await makeUser("team_member");
    await createTeam(manager, { teamName: "First", leader: leader._id, members: [member._id] });

    const sameMember = await createTeam(manager, { teamName: "Second", leader: other._id, members: [member._id] });
    expect(sameMember.status).toBe(400);
    expect(sameMember.body.message).toMatch(/already in the team "First"/);

    const sameLeader = await createTeam(manager, { teamName: "Third", leader: leader._id });
    expect(sameLeader.status).toBe(400);
    expect(sameLeader.body.message).toMatch(/already leads/);
  });

  it("lets a team be edited without clashing with itself", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const m1 = await makeUser("team_member");
    const m2 = await makeUser("team_member");
    const team = (await createTeam(manager, { teamName: "A", leader: leader._id, members: [m1._id] })).body;
    const res = await request(app)
      .put(`/api/teams/${team._id}`)
      .set(authHeader(manager))
      .send({ teamName: "A2", members: [m1._id, m2._id] });
    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(2);
    expect(res.body.leader._id).toBe(leader._id.toString());
  });

  it("moves a team's projects to the new leader when the leader changes", async () => {
    const manager = await makeUser("manager");
    const oldLeader = await makeUser("team_leader");
    const newLeader = await makeUser("team_leader");
    const team = await Team.create({ teamName: "A", leader: oldLeader._id });
    const project = await Project.create({ title: "P", team: team._id, leader: oldLeader._id });
    const res = await request(app).put(`/api/teams/${team._id}`).set(authHeader(manager)).send({ leader: newLeader._id });
    expect(res.status).toBe(200);
    expect((await Project.findById(project._id)).leader.toString()).toBe(newLeader._id.toString());
  });

  it("blocks deleting a team that projects still use", async () => {
    const manager = await makeUser("manager");
    const team = await Team.create({ teamName: "A" });
    const project = await Project.create({ title: "P", team: team._id });
    const blocked = await request(app).delete(`/api/teams/${team._id}`).set(authHeader(manager));
    expect(blocked.status).toBe(409);
    await Project.deleteOne({ _id: project._id });
    const ok = await request(app).delete(`/api/teams/${team._id}`).set(authHeader(manager));
    expect(ok.status).toBe(200);
  });

  it("hides other teams from a member (404 on direct access)", async () => {
    const mine = await makeUser("team_member");
    const outsider = await makeUser("team_member");
    const team = await Team.create({ teamName: "A", members: [mine._id] });
    expect((await request(app).get(`/api/teams/${team._id}`).set(authHeader(mine))).status).toBe(200);
    expect((await request(app).get(`/api/teams/${team._id}`).set(authHeader(outsider))).status).toBe(404);
  });
});

describe("linking projects to teams", () => {
  it("makes the team's leader the project leader", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const team = await Team.create({ teamName: "A", leader: leader._id });
    const res = await request(app).post("/api/projects").set(authHeader(manager)).send({ title: "P", team: team._id });
    expect(res.status).toBe(201);
    expect(res.body.leader.toString()).toBe(leader._id.toString());
  });

  it("rejects a project leader who is not the team's leader", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const other = await makeUser("team_leader");
    const team = await Team.create({ teamName: "A", leader: leader._id });
    const res = await request(app)
      .post("/api/projects")
      .set(authHeader(manager))
      .send({ title: "P", team: team._id, leader: other._id });
    expect(res.status).toBe(400);
  });

  it("switches a project to another team and takes that team's leader", async () => {
    const manager = await makeUser("manager");
    const l1 = await makeUser("team_leader");
    const l2 = await makeUser("team_leader");
    const t1 = await Team.create({ teamName: "One", leader: l1._id });
    const t2 = await Team.create({ teamName: "Two", leader: l2._id });
    const project = await Project.create({ title: "P", team: t1._id, leader: l1._id });
    const res = await request(app).put(`/api/projects/${project._id}`).set(authHeader(manager)).send({ team: t2._id });
    expect(res.status).toBe(200);
    expect(res.body.leader.toString()).toBe(l2._id.toString());
  });
});

describe("task assignment follows the team", () => {
  async function setup() {
    const leader = await makeUser("team_leader");
    const inTeam = await makeUser("team_member");
    const outsider = await makeUser("team_member");
    const team = await Team.create({ teamName: "A", leader: leader._id, members: [inTeam._id] });
    const project = await Project.create({ title: "P", team: team._id, leader: leader._id });
    return { leader, inTeam, outsider, team, project };
  }
  const create = (user, body) => request(app).post("/api/tasks").set(authHeader(user)).send(body);

  it("accepts a team member and rejects an outsider", async () => {
    const { leader, inTeam, outsider, project } = await setup();
    expect((await create(leader, { title: "t", project: project._id, assignedUser: inTeam._id })).status).toBe(201);
    const bad = await create(leader, { title: "t", project: project._id, assignedUser: outsider._id });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/not a member/);
  });

  it("rejects assigning a task to a leader or manager", async () => {
    const { leader, project } = await setup();
    const manager = await makeUser("manager");
    expect((await create(leader, { title: "t", project: project._id, assignedUser: manager._id })).status).toBe(400);
  });

  it("asks for a team first when the project has none", async () => {
    const leader = await makeUser("team_leader");
    const member = await makeUser("team_member");
    const project = await Project.create({ title: "No team", leader: leader._id });
    const res = await create(leader, { title: "t", project: project._id, assignedUser: member._id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/team/i);
  });

  it("still allows an unassigned task", async () => {
    const { leader, project } = await setup();
    expect((await create(leader, { title: "later", project: project._id })).status).toBe(201);
  });

  it("re-checks the assignee when a task is reassigned", async () => {
    const { leader, inTeam, outsider, project } = await setup();
    const task = await Task.create({ title: "t", project: project._id, assignedUser: inTeam._id });
    const bad = await request(app).put(`/api/tasks/${task._id}`).set(authHeader(leader)).send({ assignedUser: outsider._id });
    expect(bad.status).toBe(400);
    const unassign = await request(app).put(`/api/tasks/${task._id}`).set(authHeader(leader)).send({ assignedUser: "" });
    expect(unassign.status).toBe(200);
  });
});
