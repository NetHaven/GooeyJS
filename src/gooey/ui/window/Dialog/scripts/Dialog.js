import Key from '../../../../io/Key.js';
import KeyboardEvent from '../../../../events/KeyboardEvent.js';
import MouseEvent from '../../../../events/MouseEvent.js';
import Template from '../../../../util/Template.js';
import Logger from '../../../../logging/Logger.js';

export default class Dialog {
    static alert(message, callback, options = {}) {
        const { 
            timeoutMs = 300000, // 5 minute default timeout
            enableTimeout = false 
        } = options;

        return new Promise((resolve, reject) => {
            // Check if required templates exist
            let alertDialog, messageElement, okButton;
            let timeoutId = null;
            let isResolved = false;

            let clickHandler, keyHandler;

            const cleanupAndResolve = (result) => {
                if (isResolved) return;
                isResolved = true;

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                // Remove listeners to prevent accumulation on reuse
                if (okButton && clickHandler) {
                    okButton.removeEventListener(MouseEvent.CLICK, clickHandler);
                }
                if (alertDialog && keyHandler) {
                    alertDialog.removeEventListener(KeyboardEvent.KEY_DOWN, keyHandler);
                }

                if (callback) {
                    try {
                        callback();
                    } catch (error) {
                        Logger.error({ code: "DIALOG_CALLBACK_ERROR", error: error.message }, "Dialog callback error");
                    }
                }

                resolve(result);
            };

            const cleanupAndReject = (error) => {
                if (isResolved) return;
                isResolved = true;
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                // Auto-close dialog on timeout
                if (alertDialog && alertDialog.visible) {
                    try {
                        alertDialog.visible = false;
                    } catch (closeError) {
                        Logger.error({ code: "DIALOG_TIMEOUT_CLOSE_ERROR", error: closeError.message }, "Error closing timed-out dialog");
                    }
                }
                
                reject(error);
            };

            try {
                alertDialog = Dialog.createDialog("alertDialog", "alertDialogTemplate");
            
                // Set the message
                messageElement = alertDialog.querySelector('.DialogAlert-message');
                if (messageElement) {
                    messageElement.textContent = message;
                } else {
                    Logger.error({ code: "DIALOG_MESSAGE_ELEMENT_NOT_FOUND" }, "Message element not found");
                    cleanupAndReject(new Error('Dialog template missing message element'));
                    return;
                }
                            
                // Setup OK button handler
                okButton = alertDialog.querySelector('.WindowOKButton');
                if (okButton) {
                    clickHandler = () => {
                        cleanupAndResolve();
                    };

                    okButton.addEventListener(MouseEvent.CLICK, clickHandler);

                    // Add scoped Enter key handler for this specific dialog
                    keyHandler = (event) => {
                        if (event.key === Key.ENTER && alertDialog.visible) {
                            event.preventDefault();
                            event.stopPropagation();
                            cleanupAndResolve();
                        }
                    };

                    // Use capture phase to handle Enter before it can bubble
                    alertDialog.addEventListener(KeyboardEvent.KEY_DOWN, keyHandler, true);
                } else {
                    Logger.error({ code: "DIALOG_OK_BUTTON_NOT_FOUND" }, "OK button not found");
                    cleanupAndReject(new Error('Dialog template missing OK button'));
                    return;
                }

                // Set up timeout if enabled
                if (enableTimeout && timeoutMs > 0) {
                    timeoutId = setTimeout(() => {
                        Logger.warn({ code: "DIALOG_ALERT_TIMEOUT", timeoutMs }, "Dialog alert timed out after %dms", timeoutMs);
                        cleanupAndReject(new Error(`Dialog alert timed out after ${timeoutMs}ms`));
                    }, timeoutMs);
                }
                
            } catch (error) {
                Logger.error({ code: "DIALOG_ALERT_CREATE_ERROR", error: error.message }, "Error creating alert dialog");
                cleanupAndReject(new Error(`Failed to create alert dialog: ${error.message}`));
            }            
        });
    }

    static confirm(message, callback) {
        return new Promise((resolve) => {
            let confirmDialog, messageElement, okButton, cancelButton;
            let isResolved = false;

            const cleanupAndResolve = (result) => {
                if (isResolved) return;
                isResolved = true;

                // Remove listeners to prevent accumulation on reuse
                if (okButton && okClickHandler) {
                    okButton.removeEventListener(MouseEvent.CLICK, okClickHandler);
                }
                if (cancelButton && cancelClickHandler) {
                    cancelButton.removeEventListener(MouseEvent.CLICK, cancelClickHandler);
                }

                if (callback) {
                    callback(result);
                }
                resolve(result);
            };

            let okClickHandler, cancelClickHandler;

            confirmDialog = Dialog.createDialog("confirmDialog", "confirmDialogTemplate");

            // Set the message
            messageElement = confirmDialog.querySelector('.DialogConfirm-message');
            if (messageElement) {
                messageElement.textContent = message;
            } else {
                Logger.error({ code: "DIALOG_MESSAGE_ELEMENT_NOT_FOUND" }, "Message element not found");
            }

            // Setup OK button handler (returns true)
            okButton = confirmDialog.querySelector('.WindowOKButton');
            if (okButton) {
                okClickHandler = () => {
                    cleanupAndResolve(true);
                };
                okButton.addEventListener(MouseEvent.CLICK, okClickHandler);
            } else {
                Logger.error({ code: "DIALOG_OK_BUTTON_NOT_FOUND" }, "OK button not found");
            }

            // Setup Cancel button handler (returns false)
            cancelButton = confirmDialog.querySelector('.WindowCancelButton');
            if (cancelButton) {
                cancelClickHandler = () => {
                    cleanupAndResolve(false);
                };
                cancelButton.addEventListener(MouseEvent.CLICK, cancelClickHandler);
            } else {
                Logger.error({ code: "DIALOG_CANCEL_BUTTON_NOT_FOUND" }, "Cancel button not found");
            }
        });
    }

    static createDialog(dialogId, templateId) {
        let newDialog;

        newDialog = document.getElementById(dialogId);
        if (newDialog === null) {
            Template.activate(templateId);
            newDialog = document.getElementById(dialogId);
        }

        // Remove all previous listeners to prevent accumulation on reuse
        const okBtn = newDialog.querySelector(".WindowOKButton");
        if (okBtn) {
            okBtn.removeAllEventListeners(MouseEvent.CLICK);
        }
        const cancelBtn = newDialog.querySelector(".WindowCancelButton");
        if (cancelBtn) {
            cancelBtn.removeAllEventListeners(MouseEvent.CLICK);
        }

        okBtn.addEventListener(MouseEvent.CLICK, function() {
            newDialog.close();
        });

        newDialog.open();

        return newDialog;
    }

    static prompt(message, defaultValue = '', callback) {
        return new Promise((resolve) => {
            let promptDialog, messageElement, inputElement, okButton, cancelButton;
            let isResolved = false;
            let okClickHandler, cancelClickHandler, keyHandler;

            const cleanupAndResolve = (result) => {
                if (isResolved) return;
                isResolved = true;

                // Remove listeners to prevent accumulation on reuse
                if (okButton && okClickHandler) {
                    okButton.removeEventListener(MouseEvent.CLICK, okClickHandler);
                }
                if (cancelButton && cancelClickHandler) {
                    cancelButton.removeEventListener(MouseEvent.CLICK, cancelClickHandler);
                }
                if (inputElement && keyHandler) {
                    inputElement.removeEventListener(KeyboardEvent.KEY_DOWN, keyHandler);
                }

                if (callback) {
                    callback(result);
                }
                resolve(result);
            };

            promptDialog = Dialog.createDialog("promptDialog", "promptDialogTemplate");

            // Set the message
            messageElement = promptDialog.querySelector('.DialogPrompt-message');
            if (messageElement) {
                messageElement.textContent = message;
            } else {
                Logger.error({ code: "DIALOG_MESSAGE_ELEMENT_NOT_FOUND" }, "Message element not found");
            }

            // Set up the input field
            inputElement = promptDialog.querySelector('.DialogPrompt-input');
            if (inputElement && defaultValue) {
                inputElement.value = defaultValue;
            }

            // Focus the input field
            setTimeout(() => {
                if (inputElement) {
                    inputElement.focus();
                    // Select all text if there's a default value
                    if (defaultValue) {
                        const textField = inputElement.querySelector('input');
                        if (textField) {
                            textField.select();
                        }
                    }
                }
            }, 100);

            // Setup OK button handler (returns input value)
            okButton = promptDialog.querySelector('.WindowOKButton');
            if (okButton) {
                okClickHandler = () => {
                    const value = inputElement ? inputElement.value : '';
                    cleanupAndResolve(value);
                };
                okButton.addEventListener(MouseEvent.CLICK, okClickHandler);
            } else {
                Logger.error({ code: "DIALOG_OK_BUTTON_NOT_FOUND" }, "OK button not found");
            }

            // Setup Cancel button handler (returns null)
            cancelButton = promptDialog.querySelector('.WindowCancelButton');
            if (cancelButton) {
                cancelClickHandler = () => {
                    cleanupAndResolve(null);
                };
                cancelButton.addEventListener(MouseEvent.CLICK, cancelClickHandler);
            } else {
                Logger.error({ code: "DIALOG_CANCEL_BUTTON_NOT_FOUND" }, "Cancel button not found");
            }

            // Handle Enter key to submit
            if (inputElement) {
                keyHandler = (e) => {
                    if (e.key === Key.ENTER) {
                        e.preventDefault();
                        const value = inputElement ? inputElement.value : '';
                        cleanupAndResolve(value);
                    } else if (e.key === Key.ESCAPE) {
                        e.preventDefault();
                        cleanupAndResolve(null);
                    }
                };
                inputElement.addEventListener(KeyboardEvent.KEY_DOWN, keyHandler);
            }
        });
    }

    static info(message, callback) {
        return new Promise((resolve) => {
            let infoDialog, messageElement, okButton;
            let isResolved = false;
            let clickHandler;

            const cleanupAndResolve = () => {
                if (isResolved) return;
                isResolved = true;

                // Remove listeners to prevent accumulation on reuse
                if (okButton && clickHandler) {
                    okButton.removeEventListener(MouseEvent.CLICK, clickHandler);
                }

                if (callback) {
                    callback();
                }
                resolve();
            };

            infoDialog = Dialog.createDialog("infoDialog", "infoDialogTemplate");

            // Set the message
            messageElement = infoDialog.querySelector('.DialogInfo-message');
            if (messageElement) {
                messageElement.textContent = message;
            } else {
                Logger.error({ code: "DIALOG_MESSAGE_ELEMENT_NOT_FOUND" }, "Message element not found");
            }

            // Setup OK button handler
            okButton = infoDialog.querySelector('.WindowOKButton');
            if (okButton) {
                clickHandler = () => {
                    cleanupAndResolve();
                };
                okButton.addEventListener(MouseEvent.CLICK, clickHandler);
            } else {
                Logger.error({ code: "DIALOG_OK_BUTTON_NOT_FOUND" }, "OK button not found");
            }
        });
    }
}
