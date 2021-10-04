import * as vscode from "vscode";

const KEY = "vstodotoken";
const SV = "selectedValue";
const AssigneeValue = "AssigneeValue"

export class TokenManager {
  static globalState: vscode.Memento;

  static setToken(token: string) {
    return this.globalState.update(KEY, token);
  }

  static getToken(): string | undefined {
    return this.globalState.get(KEY);
  }
  static setSelectedValue(sv: string) {
    return this.globalState.update(SV, sv);
  }

  static getSelectedValue(): string | undefined {
    return this.globalState.get(SV);
  }
  static setAssigneeValue(av: string) {
    return this.globalState.update(AssigneeValue, av);
  }

  static getAssigneeValue(): string | undefined {
    return this.globalState.get(AssigneeValue);
  }
}
