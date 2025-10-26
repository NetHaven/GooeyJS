class Controller {
	// Private static instance property
	static #instance = null;

	// Flag to track if constructor is being called internally
	static #isInternalConstructing = false;

	constructor() {
		// Prevent external instantiation
		if (!Controller.#isInternalConstructing) {
			throw new Error("Controller is a singleton. Use Controller.getInstance() instead of new Controller()");
		}
		Controller.#isInternalConstructing = false;

		this.commandList = new Map();
	}

	/**
	 * Gets the singleton instance of Controller
	 * @returns {Controller} The singleton Controller instance
	 */
	static getInstance() {
		if (!Controller.#instance) {
			Controller.#isInternalConstructing = true;
			Controller.#instance = new Controller();
		}
		return Controller.#instance;
	}

	/**
	 * Destroys the singleton instance (useful for testing)
	 */
	static destroyInstance() {
		Controller.#instance = null;
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

export default Controller.getInstance();