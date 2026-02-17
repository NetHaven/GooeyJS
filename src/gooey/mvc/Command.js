import Logger from '../logging/Logger.js';

export default class Command {
	execute() {
		Logger.error({ code: "MVC_COMMAND_NOT_OVERRIDDEN" }, "Class failed to override Command.execute()");
	}
}
