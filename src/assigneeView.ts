import * as vscode from "vscode";
// import { clickUpDtata, hashmap } from './extension';
import { TokenManager } from "./TokenManager";
import * as path from "path";
import { getLabelFromKey } from "./utils/general";
import { getIdFromKey, list_to_tree } from "./utils/general";
import { assigneeDataApi } from "./utils/api";
let clickUpData;
let hashmap = {};
let my_key = "pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7";

export const assigneeView = async (context) => {
  const listValue = TokenManager.getSelectedValue();
  const listId = getIdFromKey(listValue);
  console.log("LISTID", listId);

  const assigneeData = await assigneeDataApi(my_key, listId);
  assigneeData.forEach((element) => {
    element.parent_id = "0";
  });
  console.log("XOLO", assigneeData);
  const allArray = assigneeData;
  clickUpData = list_to_tree(allArray);

  allArray.forEach((el) => {
    hashmap[el.id] = [];
  });
  Object.keys(hashmap).forEach((key) => {
    allArray.forEach((el) => {
      if (el.parent_id === key) hashmap[key].push(`${el.username}-${el.id}`);
    });
  });

  const a = new AssigneeView(context);
  a.refresh();
};

export class AssigneeView {
  private _onDidChangeTreeData: vscode.EventEmitter<Key | undefined | void> =
    new vscode.EventEmitter<Key | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<Key | undefined | void> =
    this._onDidChangeTreeData.event;
  constructor(context: vscode.ExtensionContext) {
    console.log("aayush", hashmap, clickUpData);
    const view = vscode.window.createTreeView("assigneeView", {
      treeDataProvider: aNodeWithIdTreeDataProvider(),
      showCollapseAll: true,
    });
    context.subscriptions.push(view);
    vscode.commands.registerCommand("assigneeView.changeTitle", (name) => {
      TokenManager.setAssigneeValue(name);
      console.log("CHECKING MOMENTO", TokenManager.getAssigneeValue());
      vscode.commands.executeCommand("vstodo.refreshOpenView");
      vscode.commands.executeCommand("vstodo.refreshIpView");
      vscode.commands.executeCommand("vstodo.refreshBaView");
      view.title = "Assignee: " + getLabelFromKey(name);
    });
  }
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

const nodes = {};

function aNodeWithIdTreeDataProvider(): vscode.TreeDataProvider<{
  key: string;
}> {
  return {
    getChildren: (element: { key: string }): { key: string }[] => {
      return getChildren(element ? element.key : undefined).map((key) =>
        getNode(key)
      );
    },
    getTreeItem: (element: { key: string }): vscode.TreeItem => {
      const treeItem = getTreeItem(element.key);
      // localStorage.setItem("id", element.key);

      treeItem.id = element.key;
      return treeItem;
    },
  };
}

function getChildren(key: string): string[] {
  console.log("getChildren-key", key);
  let rootArray = new Array();
  if (!key) {
    clickUpData.forEach((el) => {
      rootArray.push(`${el.username}-${el.id}`);
    });
    return rootArray;
  }
  console.log("qwertyuio", key);
  const id = key.slice(key.lastIndexOf("-") + 1);

  if (hashmap[id].length) {
    return hashmap[id];
  }
  return [];
}

function getTreeItem(key: string): vscode.TreeItem {
  const id = key.slice(key.lastIndexOf("-") + 1);

  const tooltip = new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
  if (hashmap[id].length) {
    return {
      label: { label: key.slice(0, key.lastIndexOf("-")) },
      tooltip,
      collapsibleState: hashmap[id].length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    };
  } else {
    return {
      label: { label: key.slice(0, key.lastIndexOf("-")) },
      tooltip,
      collapsibleState: hashmap[id].length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      command: {
        command: "assigneeView.changeTitle",
        title: "",
        arguments: [key],
      },
      iconPath: {
        light: path.join(
          __filename,
          "..",
          "..",
          "resources",
          "light",
          "account.svg"
        ),
        dark: path.join(
          __filename,
          "..",
          "..",
          "resources",
          "dark",
          "account.svg"
        ),
      },
    };
  }
}

function getNode(key: string): { key: string } {
  if (!nodes[key]) {
    nodes[key] = new Key(key);
  }
  console.log("getNode-return-key", key);
  return nodes[key];
}

class Key {
  constructor(readonly key: string, public readonly command?: vscode.Command) {}
}
