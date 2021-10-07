import * as vscode from "vscode";
// import { clickUpDtata, hashmap } from './extension';
import { TokenManager } from "./TokenManager";
import { getIdFromKey, list_to_tree } from "./utils/general";
import { teamDataApi, spaceDataApi, listDataApi } from "./utils/api";
import axios from "axios";
let testViewClickUpData;
let testViewhashmap = {};
let my_key = "pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7";

export const testView = async (context) => {
  const teamData = await teamDataApi(my_key);
  teamData.forEach((element) => {
    element.parent_id = "0";
  });
  const spaceData = new Array();
  const listData = new Array();

  await Promise.all(
    teamData.map(async (el) => {
      const res = await spaceDataApi(my_key, el.id);
      await Promise.all(
        res.map(async (element) => {
          element.parent_id = el.id;
          spaceData.push(element);
          const resList = await listDataApi(my_key, element.id);

          resList.map((listItem) => {
            listItem.parent_id = element.id;
            listData.push(listItem);
          });
        })
      );
    })
  );

  const allArray = [...teamData, ...spaceData, ...listData];
  testViewClickUpData = list_to_tree(allArray);

  allArray.forEach((el) => {
    testViewhashmap[el.id] = [];
  });
  Object.keys(testViewhashmap).forEach((key) => {
    allArray.forEach((el) => {
      if (el.parent_id === key)
        testViewhashmap[key].push(`${el.name}-${el.id}`);
    });
  });

  new TestView(context);
};

export class TestView {
  private _onDidChangeTreeData: vscode.EventEmitter<Key | undefined | void> =
    new vscode.EventEmitter<Key | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<Key | undefined | void> =
    this._onDidChangeTreeData.event;
  constructor(context: vscode.ExtensionContext) {
    const view = vscode.window.createTreeView("testView", {
      treeDataProvider: aNodeWithIdTreeDataProvider(),
      showCollapseAll: true,
    });
    context.subscriptions.push(view);
    vscode.commands.registerCommand("testView.changeTitle", (name) => {
      TokenManager.setSelectedValue(name);
      console.log("CHECKING MOMENTO", TokenManager.getSelectedValue());
      view.title = name.slice(0, name.lastIndexOf("-"));
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
    testViewClickUpData.forEach((el) => {
      rootArray.push(`${el.name}-${el.id}`);
    });
    return rootArray;
  }
  console.log("qwertyuio", key);
  const id = key.slice(key.lastIndexOf("-") + 1);

  if (testViewhashmap[id].length) {
    return testViewhashmap[id];
  }
  return [];
}

function getTreeItem(key: string): vscode.TreeItem {
  const id = key.slice(key.lastIndexOf("-") + 1);

  const tooltip = new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
  if (testViewhashmap[id].length) {
    return {
      label: { label: key.slice(0, key.lastIndexOf("-")) },
      tooltip,
      collapsibleState: testViewhashmap[id].length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    };
  } else {
    return {
      label: { label: key.slice(0, key.lastIndexOf("-")) },
      tooltip,
      collapsibleState: testViewhashmap[id].length
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      command: {
        command: "testView.changeTitle",
        title: "",
        arguments: [key],
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
