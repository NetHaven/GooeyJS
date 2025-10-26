import Controller from "./Controller.js";

export default class EventDispatcher {
	static dispatchEvent(ev) {
		let eventCommandClass, eventCommandInstance;
		
		eventCommandClass = Controller.getCommand(ev.getName());
		eventCommandInstance = new eventCommandClass();
		eventCommandInstance.execute(ev);
	}
}
