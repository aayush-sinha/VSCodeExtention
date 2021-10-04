import axios from "axios";

// First step: Will Return Teams list
export const teamDataApi = async (authKey) => {
  let teamData = await axios.get(`https://api.clickup.com/api/v2/team`, {
    headers: { Authorization: authKey },
  });
  return teamData.data.teams;
};

// Returns list of space in each team
export const spaceDataApi = async (authKey, id) => {
  let spaceData = await axios.get(
    `https://api.clickup.com/api/v2/team/${id}/space?archived=false`,
    {
      headers: {
        Authorization: authKey,
      },
    }
  );
  return spaceData.data.spaces;
};

// Return list of Lists for each space
export const listDataApi = async (authKey, id) => {
  let listData = await axios.get(
    `https://api.clickup.com/api/v2/space/${id}/list?archived=false`,
    {
      headers: {
        Authorization: authKey,
      },
    }
  );
  return listData.data.lists;
};

// Returns list of members in a List
export const assigneeDataApi = async (authKey, listId) => {
  let assigneeData = await axios.get(
    `https://api.clickup.com/api/v2/list/${listId}/member`,
    {
      headers: {
        Authorization: authKey,
      },
    }
  );
  return assigneeData.data.members;
};

// Returnns Tickets list
export const openDataApi = async (authKey, listId, assigneeId) => {
    let openData = await axios.get(
      `https://api.clickup.com/api/v2/list/${listId}/task?&statuses[]=open&assignees[]=${assigneeId}&subtasks=false`,
      {
        headers: {
          Authorization: authKey,
        },
      }
    );
    return openData.data.tasks;
  };
