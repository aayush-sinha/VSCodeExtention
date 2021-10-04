import * as vscode from 'vscode';
import { clickUpDtata, hashmap } from './extension';
import { TokenManager } from "./TokenManager";
import * as path from 'path';
// import CustomLocalStorage from './storageHelper';
// const customLocalStorage = CustomLocalStorage.getInstance();

// customLocalStorage.setSelectedValue('aayushsinha9');
// const selectedValue = customLocalStorage.getSelectedValue();
export class OpenView {
	private _onDidChangeTreeData: vscode.EventEmitter<Key | undefined | void> = new vscode.EventEmitter<Key | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Key | undefined | void> = this._onDidChangeTreeData.event;
	constructor(context: vscode.ExtensionContext) {
		console.log('aayush', hashmap, clickUpDtata);
		const view = vscode.window.createTreeView('openView', {
			treeDataProvider: aNodeWithIdTreeDataProvider(),
			showCollapseAll: true,
		});
		context.subscriptions.push(view);
		// vscode.commands.registerCommand('openView.changeTitle',  (name) => {
		// 		TokenManager.setAssigneeValue(name);
		// 		console.log("CHECKING MOMENTO",TokenManager.getAssigneeValue())
		// 		view.title = "Assignee: " + name;
		// 	}
		// );
		
	}
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}

const nodes = {};

function aNodeWithIdTreeDataProvider(): vscode.TreeDataProvider<{ key: string }> {
	return {
		getChildren: (element: { key: string }): { key: string }[] => {
			return getChildren(element ? element.key : undefined).map((key) => getNode(key));
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
	console.log('getChildren-key', key);
	let rootArray = new Array();
	if (!key) {
		clickUpDtata.forEach((el) => {
			rootArray.push(`${el.name}-${el.id}`);
		});
		return rootArray;
	}
	console.log('qwertyuio', key);
	const id = key.slice(key.lastIndexOf('-') + 1);

	if (hashmap[id].length) {
		return hashmap[id];
	}
	return [];
}

function getTreeItem(key: string): vscode.TreeItem {
	const id = key.slice(key.lastIndexOf('-') + 1);

	const tooltip = new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
	if(hashmap[id].length){
		return {
			label: { label: key.slice(0, key.lastIndexOf('-')) },
			tooltip,
			collapsibleState: hashmap[id].length
				? vscode.TreeItemCollapsibleState.Collapsed
				: vscode.TreeItemCollapsibleState.None,
		};
	} else {
		return {

			label: { label: key.slice(0, key.lastIndexOf('-')) },
			tooltip,
			collapsibleState: hashmap[id].length
				? vscode.TreeItemCollapsibleState.Collapsed
				: vscode.TreeItemCollapsibleState.None,
			// command: {
			// 	command: 'assigneeView.changeTitle',
			// 	title: '',
			// 	arguments: [key.slice(0, key.lastIndexOf('-'))]
			// }
            iconPath : {
                light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
            }
		};
	}
	
}

function getNode(key: string): { key: string } {
	if (!nodes[key]) {
		nodes[key] = new Key(key);
	}
	console.log('getNode-return-key', key);
	return nodes[key];
}

class Key {
	constructor(readonly key: string,
		public readonly command?: vscode.Command) {}

}
