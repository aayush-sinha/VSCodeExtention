// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { authenticate } from "./authenticate";
import { HelloWorldPanel } from "./HelloWorldPanel";
import { SidebarProvider } from "./SidebarProvider";
import { DepNodeProvider, Dependency } from './nodeDependencies';
import { TokenManager } from "./TokenManager";
import { TestView } from "./testView";
import axios, { AxiosResponse } from 'axios';

export function activate(context: vscode.ExtensionContext) {
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
      try{
        sidebarProvider._view?.webview.postMessage({
          type: "logout",
          value: "",
        });
      }
      catch(e){
        console.log(e)
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



  const main = async () => {

    const tree = {}
    const nodes = {};
    
    function  aNodeWithIdTreeDataProvider(): vscode.TreeDataProvider<{ key: string }> {
      return {
        getChildren: (element: { key: string }): { key: string }[] => {
          return getChildren(element ? element.key : undefined).map(key => getNode(key));
        },
        getTreeItem: (element: { key: string }): vscode.TreeItem => {
          const treeItem = getTreeItem(element.key);
          treeItem.id = element.key;
          return treeItem;
        },
        getParent: ({ key }: { key: string }): { key: string } => {
          const parentKey = key.substring(0, key.length - 1);
          return parentKey ? new Key(parentKey) : void 0;
        }
      };
    }
    
    function getChildren(key: string): string[] {
      if (!key) {
        return Object.keys(tree);
      }
      const treeElement = getTreeElement(key);
      if (treeElement) {
        return Object.keys(treeElement);
      }
      return [];
    }
    
    function getTreeItem(key: string): vscode.TreeItem {
      const treeElement = getTreeElement(key);
      // An example of how to use codicons in a MarkdownString in a tree item tooltip.
      const tooltip = new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
      return {
        label: /**vscode.TreeItemLabel**/<any>{ label: key, highlights: key.length > 1 ? [[key.length - 2, key.length - 1]] : void 0 },
        tooltip,
        collapsibleState: treeElement && Object.keys(treeElement).length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
      };
    }
    
    function getTreeElement(element): any {
      let parent = tree;
      for (let i = 0; i < element.length; i++) {
        parent = parent[element.substring(0, i + 1)];
        if (!parent) {
          return null;
        }
      }
      return parent;
    }
    
    function getNode(key: string): { key: string } {
      if (!nodes[key]) {
        nodes[key] = new Key(key);
      }
      return nodes[key];
    }
    
    
    
    class Key {
      constructor(readonly key: string) { }
    }
    const apiGetTeams = async () => {
      let result = await axios.get(`https://api.clickup.com/api/v2/team`,
      { headers: {'Authorization': 'pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7'}});
      return result
    } 
    const apiGetSpaces = async (team_id) => {
      let result = await axios.get(`https://api.clickup.com/api/v2/team/${team_id}/space?archived=false`,
      { headers: {'Authorization': 'pk_3344635_OKQECX1X18DADHGYTS13GY1UI8C8SCH7'}});
      return result
    } 
    const teamData = await apiGetTeams()
    teamData.data.teams.map(async (team)=> {
      tree[`${team.name}`] = {}
      const spaceData = await apiGetSpaces(team.id)
      spaceData.data.spaces.map(async(space)=>{
        console.log("-------space---",space)
        // tree[`${team.name}`][`${space.name}`] = {}
        let tempSpace = space.name
        let spaceObject = {[tempSpace]: {}}
        Object.assign(tree[team.name],[spaceObject])
      })
    })
    console.log("-----------tree----------",tree);
    const treeObj = new TestView(context,aNodeWithIdTreeDataProvider); 
  }
  main()
  
  
  // const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
  // ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
  // const nodeDependenciesProvider = new DepNodeProvider(rootPath);
	// vscode.window.registerTreeDataProvider('nodeDependencies', nodeDependenciesProvider);
	// vscode.commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());
	// vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
	// vscode.commands.registerCommand('nodeDependencies.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	// vscode.commands.registerCommand('nodeDependencies.editEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	// vscode.commands.registerCommand('nodeDependencies.deleteEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));
}

// this method is called when your extension is deactivated
export function deactivate() {}
