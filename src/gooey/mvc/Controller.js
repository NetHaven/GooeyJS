export default class Controller {
	constructor() {
		this.commandList = new Map();
	}

	addCommand(commandName, newCommand) {
		this.commandList.set(commandName, newCommand);
	}

	clearCommands() {
		this.commandList.clear();
	}

	getCommand(commandName) {
		return this.commandList.get(commandName);
	}

	getCommandCount() {
		return this.commandList.size;
	}

	getCommandNames() {
		return Array.from(this.commandList.keys());
	}

	hasCommand(commandName) {
		return this.commandList.has(commandName);
	}

	removeCommand(commandName) {
		return this.commandList.delete(commandName);
	}
}
