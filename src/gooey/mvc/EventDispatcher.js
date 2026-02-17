import Controller from "./Controller.js";
import Logger from '../logging/Logger.js';

export default class EventDispatcher {
	static dispatchEvent(ev) {
		// Support both string event names and event objects with type property
		const eventName = typeof ev === 'string' ? ev : (ev.type || ev.getName?.());

		if (!eventName) {
			Logger.warn({ code: "MVC_EVENT_NAME_MISSING" }, "EventDispatcher: Unable to determine event name");
			return;
		}

		const eventCommandClass = Controller.getCommand(eventName);

		if (!eventCommandClass) {
			Logger.warn({ code: "MVC_COMMAND_NOT_REGISTERED", eventName }, "EventDispatcher: No command registered for event '%s'", eventName);
			return;
		}

		const eventCommandInstance = new eventCommandClass();
		eventCommandInstance.execute(ev);
	}
}
