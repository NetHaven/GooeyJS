import Controller from "./Controller.js";

export default class EventDispatcher {
	static dispatchEvent(ev) {
		// Support both string event names and event objects with type property
		const eventName = typeof ev === 'string' ? ev : (ev.type || ev.getName?.());

		if (!eventName) {
			console.warn('EventDispatcher: Unable to determine event name');
			return;
		}

		const eventCommandClass = Controller.getCommand(eventName);

		if (!eventCommandClass) {
			console.warn(`EventDispatcher: No command registered for event '${eventName}'`);
			return;
		}

		const eventCommandInstance = new eventCommandClass();
		eventCommandInstance.execute(ev);
	}
}
