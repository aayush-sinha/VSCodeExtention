// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { authenticate } from "./authenticate";
import { HelloWorldPanel } from "./HelloWorldPanel";
import { SidebarProvider } from "./SidebarProvider";
import { TokenManager } from "./TokenManager";
import axios, { AxiosResponse } from "axios";
import { TestView } from "./testView";
import { AssigneeView } from "./assigneeView";
import { OpenView } from "./openView";
import { getIdFromKey } from "./utils/general";
let clickUpDtata: any = 1;

let hashmap = {};
export async function activate(context: vscode.ExtensionContext) {
  TokenManager.globalState = context.globalState;

  const sidebarProvider = new SidebarProvider(context.extensionUri);

  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  item.text = "$(beaker) Add Todo";
  item.command = "vstodo.addTodo";
  item.show();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("vstodo-sidebar", sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vstodo.addTodo", () => {
      const { activeTextEditor } = vscode.window;

      if (!activeTextEditor) {
        vscode.window.showInformationMessage("No active text editor");
        return;
      }

      const text = activeTextEditor.document.getText(
        activeTextEditor.selection
      );

      sidebarProvider._view?.webview.postMessage({
        type: "new-todo",
        value: text,
      });
    })
  );
  vscode.commands.registerCommand("extension.openPackageOnNpm", (moduleName) =>
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse("https://www.google.co.in/")
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vstodo.helloWorld", () => {
      vscode.window.showInformationMessage(
        "token value is: " + TokenManager.getToken()
      );
      // HelloWorldPanel.createOrShow(context.extensionUri);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vstodo.logout", () => {
      try {
        sidebarProvider._view?.webview.postMessage({
          type: "logout",
          value: "",
        });
      } catch (e) {
        console.log(e);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vstodo.authenticate", () => {
      try {
      } catch (err) {
        console.log(err);
      }
    })
  );

    vscode.commands.registerCommand("vstodo.refreshTestView",async () => {
      try {
        await assigneeView(context);
        console.log("tr")
      } catch (err) {
        console.log(err);
      }
    })
    vscode.commands.registerCommand("vstodo.refreshOpenView",async () => {
      try {
        await openView(context);
        console.log("tr")
      } catch (err) {
        console.log(err);
      }
    })
  

  context.subscriptions.push(
    vscode.commands.registerCommand("vstodo.refresh", async () => {
      // HelloWorldPanel.kill();
      // HelloWorldPanel.createOrShow(context.extensionUri);
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand(
        "workbench.view.extension.vstodo-sidebar-view"
      );
      // setTimeout(() => {
      //   vscode.commands.executeCommand(
      //     "workbench.action.webview.openDeveloperTools"
      //   );
      // }, 500);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vstodo.askQuestion", async () => {
      const answer = await vscode.window.showInformationMessage(
        "How was your day?",
        "good",
        "bad"
      );

      if (answer === "bad") {
        vscode.window.showInformationMessage("Sorry to hear that");
      } else {
        console.log({ answer });
      }
    })
  );
  await testView(context);
}
//*************************************************************************
//****************************Tree View************************************
//*************************************************************************
function list_to_tree(list) {
  var map = {},
    node,
    roots = [],
    i;

  for (i = 0; i < list.length; i += 1) {
    map[list[i].id] = i; // initialize the map
    list[i].children = []; // initialize the children
    //   console.log(map)
  }
  console.log(map);
  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    if (node.parent_id !== "0") {
      // if you have dangling branches check that map[node.parentId] exists
      list[map[node.parent_id]].children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
const testView = async (context) => {
  const teamDataApi = async () => {
    let teamData = await axios.get(`https://api.clickup.com/api/v2/team`, {
      headers: { Authorization: my_key },
    });
    return teamData.data.teams;
  };
  let my_key 
  my_key = "pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7"
  // my_key = "pk_3572904_UWHNW545JL1I14QV10OXTW3IUF8RHI25"
  const spaceDataApi = async (id) => {
    let spaceData = await axios.get(
      `https://api.clickup.com/api/v2/team/${id}/space?archived=false`,
      {
        headers: {
          Authorization: my_key,
        },
      }
    );
    return spaceData.data.spaces;
  };

  const listDataApi = async (id) => {
    let listData = await axios.get(
      `https://api.clickup.com/api/v2/space/${id}/list?archived=false`,
      {
        headers: {
          Authorization: my_key,
        },
      }
    );
    return listData.data.lists;
  };

  const teamData = await teamDataApi();
  teamData.forEach((element) => {
    element.parent_id = "0";
  });
  const spaceData = new Array();
  const listData = new Array();

  await Promise.all(
    teamData.map(async (el) => {
      const res = await spaceDataApi(el.id);

      await Promise.all(
        res.map(async (element) => {
          element.parent_id = el.id;
          spaceData.push(element);
          const resList = await listDataApi(element.id);

          resList.map((listItem) => {
            listItem.parent_id = element.id;
            listData.push(listItem);
          });
        })
      );
    })
  );

  //   console.log("teamDataApi", teamData);
  //   console.log("spaceDataApi", spaceData);
  //   console.log("listDataApi", listData);
  console.log("--------", [...teamData, ...spaceData, ...listData].length);

  
  const allArray = [...teamData, ...spaceData, ...listData];
  clickUpDtata = list_to_tree(allArray);

  allArray.forEach((el) => {
    hashmap[el.id] = [];
  });
  Object.keys(hashmap).forEach((key) => {
    allArray.forEach((el) => {
      if (el.parent_id === key) hashmap[key].push(`${el.name}-${el.id}`);
    });
  });

  new TestView(context);
  
  await assigneeView(context);
};

const assigneeView = async (context) => {
  const listValue = TokenManager.getSelectedValue();
  const listId = getIdFromKey(listValue);
  console.log("LISTID", listId);
  const assigneeDataApi = async (listId) => {
    let assigneeData = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/member`, {
      headers: { Authorization: "pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7" },
    });
    return assigneeData.data.members;
  };
  const assigneeData = await assigneeDataApi(listId);
  assigneeData.forEach((element) => {
    element.parent_id = "0";
  });
  console.log("XOLO",assigneeData)
  const allArray = assigneeData;
  clickUpDtata = list_to_tree(allArray);

  allArray.forEach((el) => {
    hashmap[el.id] = [];
  });
  Object.keys(hashmap).forEach((key) => {
    allArray.forEach((el) => {
      if (el.parent_id === key) hashmap[key].push(`${el.username}-${el.id}`);
    });
  });

  const a = new AssigneeView(context);
  a.refresh()
  
  await openView(context);
}

const openView = async (context) => {
  const listValue = TokenManager.getSelectedValue();
  const listId = getIdFromKey(listValue);
  const assigneeValue = TokenManager.getAssigneeValue();
  const assigneeId = getIdFromKey(assigneeValue);
  console.log("ooooooooassigneeId",assigneeValue)

  console.log("LISTID", listId);
  const openDataApi = async (listId) => {
    let openData = await axios.get(`https://api.clickup.com/api/v2/list/${listId}/task?&statuses[]=open&assignees[]=${assigneeId}&subtasks=false`, {
      headers: { Authorization: "pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7" },
    });
    return openData.data.tasks;
  };
  const openData = await openDataApi(listId);
  console.log("oooooooo",openData)
  openData.forEach((element) => {
    element.parent_id = "0";
  });
  console.log("XOLO",openData)
  const allArray = openData;
  clickUpDtata = list_to_tree(allArray);

  allArray.forEach((el) => {
    hashmap[el.id] = [];
  });
  Object.keys(hashmap).forEach((key) => {
    allArray.forEach((el) => {
      if (el.parent_id === key) hashmap[key].push(`${el.name}-${el.id}`);
    });
  });

  const ov = new OpenView(context);
  ov.refresh()
  
}
// this method is called when your extension is deactivated
export function deactivate() {}
export { clickUpDtata };
export { hashmap };
