import * as vscode from 'vscode';
export class TestView {

	constructor(context: vscode.ExtensionContext, aNodeWithIdTreeDataProvider) {
		const view = vscode.window.createTreeView('testView', { treeDataProvider: aNodeWithIdTreeDataProvider(), showCollapseAll: true });
		context.subscriptions.push(view);
		vscode.commands.registerCommand('testView.reveal', async () => {
			const key = await vscode.window.showInputBox({ placeHolder: 'Type the label of the item to reveal' });
			if (key) {
				await view.reveal({ key }, { focus: true, select: false, expand: true });
			}
		});
		vscode.commands.registerCommand('testView.changeTitle', async () => {
			const title = await vscode.window.showInputBox({ prompt: 'Type the new title for the Test View', placeHolder: view.title });
			if (title) {
				view.title = title;
			}
		});    
		console.log("------Constructor CALLED---------")
	
	}
}



