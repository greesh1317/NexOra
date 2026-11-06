// The people who can be given a task in a project are the members of that project's team.
// (The server enforces this too; these helpers make the screens offer only valid choices.)
// Deactivated people are left out: the server refuses to give them tasks.
// (`isActive` is missing on older accounts, which means active, so only `false` hides someone.)
export const isActivePerson = (person) => person.isActive !== false;

export function membersForProject(projectId, projects, teams) {
  const project = projects.find((p) => p._id === projectId);
  if (!project?.team) return [];
  const teamId = project.team._id || project.team;
  const members = teams.find((t) => t._id === teamId)?.members || [];
  return members.filter(isActivePerson);
}

export const projectHasTeam = (projectId, projects) =>
  Boolean(projects.find((p) => p._id === projectId)?.team);
