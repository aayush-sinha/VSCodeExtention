import * as vscode from "vscode";
import { authenticate } from "./authenticate";
import { SidebarProvider } from "./SidebarProvider";
import { TokenManager } from "./TokenManager";
import { testView } from "./testView";
import { assigneeView } from "./assigneeView";
import { openView } from "./openView";
import { ipView} from "./inProgressView";
import { baView} from "./buildAvailableView";

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
	vscode.commands.registerCommand('vstodo.addTodo', (node) => {
    vscode.window.showInformationMessage(`Ticket added to Todo list.`)
    sidebarProvider._view?.webview.postMessage({
          type: "new-todo",
          value: node.key,
        });
  })

    // vscode.commands.registerCommand("vstodo.addTodo", (ticketName) => {
    //   const { activeTextEditor } = vscode.window;

    //   if (!activeTextEditor) {
    //     vscode.window.showInformationMessage("No active text editor");
    //     return;
    //   }

    //   // const text = activeTextEditor.document.getText(
    //   //   activeTextEditor.selection
    //   // );
    //   const text = ticketName

    //   sidebarProvider._view?.webview.postMessage({
    //     type: "new-todo",
    //     value: text,
    //   });
    // })
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

  vscode.commands.registerCommand("vstodo.refreshTestView", async () => {
    try {
      await assigneeView(context);
      console.log("tr");
    } catch (err) {
      console.log(err);
    }
  });
  vscode.commands.registerCommand("vstodo.refreshOpenView", async () => {
    try {
      await openView(context);
      console.log("tr");
    } catch (err) {
      console.log(err);
    }
  });

  vscode.commands.registerCommand("vstodo.refreshIpView", async () => {
    try {
      await ipView(context);
      console.log("tr");
    } catch (err) {
      console.log(err);
    }
  });

  vscode.commands.registerCommand("vstodo.refreshBaView", async () => {
    try {
      await baView(context);
      console.log("tr");
    } catch (err) {
      console.log(err);
    }
  });

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
  await assigneeView(context);
  await openView(context);
  await ipView(context);
  await baView(context);
}

export function deactivate() {}
