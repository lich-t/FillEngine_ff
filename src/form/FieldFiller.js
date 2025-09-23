"use strict";

class FieldFiller {
	static setFieldValue(field, value) {
		if (!field || value === undefined || value === null) {
			return false;
		}

		const role = field.getAttribute("role");
		const fieldType = field.type ? field.type.toLowerCase() : field.tagName.toLowerCase();

		Logger.debug(`Setting field value for type "${fieldType}" with role "${role}": ${value}`);

		if (role === "listbox" || field.classList?.contains?.("jgvuAb") || field.classList?.contains?.("MocG8c")) {
			return this.setGoogleFormsSelectValue(field, value);
		} else if (role === "radio") {
			return this.setGoogleFormsRadioValue(field, value);
		} else if (role === "checkbox") {
			return this.setGoogleFormsCheckboxValue(field, value);
		}

		switch (fieldType) {
			case "radio":
				return this.setRadioValue(field, value);
			case "checkbox":
				return this.setCheckboxValue(field, value);
			case "date":
				return this.setDateFieldValue(field, value);
			case "select":
				return this.setSelectFieldValue(field, value);
			case "text":
			case "email":
			case "tel":
			case "textarea":
			default:
				return this.setTextFieldValue(field, value);
		}
	}

	static setTextFieldValue(field, value) {
		if (!field || value === undefined || value === null) {
			return false;
		}

		try {
			const stringValue = String(value);
			// Respecter maxLength si présent
			const maxLen = typeof field.maxLength === "number" && field.maxLength > -1 ? field.maxLength : null;
			const finalValue = maxLen ? stringValue.slice(0, maxLen) : stringValue;

			// contenteditable support
			const isContentEditable = field.isContentEditable || field.getAttribute && field.getAttribute("contenteditable") === "true";
			if (isContentEditable) {
				// Pour contenteditable, on écrit dans textContent puis on émet input
				field.focus?.();
				field.textContent = finalValue;
				field.dispatchEvent(new InputEvent("input", { bubbles: true }));
				field.dispatchEvent(new Event("change", { bubbles: true }));
				return true;
			}

			// Utiliser le setter natif pour compat frameworks (React, Vue)
			const tag = field.tagName;
			const proto = tag === "TEXTAREA" ? window.HTMLTextAreaElement?.prototype : window.HTMLInputElement?.prototype;
			const valueSetter = Object.getOwnPropertyDescriptor(proto || {}, "value")?.set;
			const ownSetter = Object.getOwnPropertyDescriptor(field, "value")?.set;
			const setter = valueSetter || ownSetter;

			field.focus?.();
			if (setter) {
				setter.call(field, finalValue);
			} else {
				field.value = finalValue;
			}

			// Déclencher les événements usuels
			field.dispatchEvent(new Event("input", { bubbles: true }));
			field.dispatchEvent(new Event("change", { bubbles: true }));
			field.blur?.();
			Logger.info(`✅ Text field set to: ${finalValue}`);
			return true;
		} catch (error) {
			Logger.error(`Error setting text field value: ${error.message}`);
			try {
				field.value = String(value);
				field.dispatchEvent(new Event("input", { bubbles: true }));
				field.dispatchEvent(new Event("change", { bubbles: true }));
				return true;
			} catch (_) {
				return false;
			}
		}
	}

	// Completely isolated execution context
	static executeInIsolatedContext(field, value) {
		// Create a completely sandboxed execution environment
		const executeFieldOperation = function() {
			// Store ALL potential interference sources
			const originalMethods = {
				onError: window.onerror,
				onUnhandledRejection: window.onunhandledrejection,
				addEventListener: EventTarget.prototype.addEventListener,
				removeEventListener: EventTarget.prototype.removeEventListener,
				dispatchEvent: EventTarget.prototype.dispatchEvent,
				setTimeout: window.setTimeout,
				setInterval: window.setInterval,
				requestAnimationFrame: window.requestAnimationFrame
			};

			try {
				// Ultra-aggressive error suppression for contentScript.js and sentence errors
				window.onerror = function(message, source, lineno, colno, error) {
					if (source && (source.includes('contentScript.js') || source.includes('content-script'))) {
						return true; // Suppress contentScript errors completely
					}
					if (message && (message.includes('sentence') || message.includes('Cannot read properties of undefined'))) {
						return true; // Suppress sentence-related errors completely
					}
					return true; // Block ALL errors during field operations
				};
				
				window.onunhandledrejection = function(event) {
					const reason = event.reason;
					if (reason && (reason.stack?.includes('contentScript.js') || reason.message?.includes('sentence'))) {
						event.preventDefault();
						return;
					}
					event.preventDefault(); // Block ALL promise rejections during field operations
				};
				
				// Disable event listeners temporarily
				EventTarget.prototype.addEventListener = function() { return; };
				EventTarget.prototype.removeEventListener = function() { return; };
				
				// Block async operations during field setting
				window.setTimeout = function(fn, delay) { 
					if (delay === 0 || delay === undefined) {
						return 0; // Block immediate timeouts
					}
					return originalMethods.setTimeout.call(window, fn, delay);
				};
				window.setInterval = function() { return 0; }; // Block all intervals
				window.requestAnimationFrame = function() { return 0; }; // Block animations

				// Perform field operations in this completely isolated environment
				let success = false;

				// Multiple value setting strategies
				const setValueStrategies = [
					() => {
						field.value = "";
						field.value = String(value);
					},
					() => {
						field.setAttribute('value', String(value));
					},
					() => {
						// Direct property descriptor manipulation
						if (window.HTMLInputElement && window.HTMLInputElement.prototype) {
							const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
							if (descriptor && descriptor.set) {
								descriptor.set.call(field, String(value));
							}
						}
					},
					() => {
						// Force property assignment
						Object.defineProperty(field, 'value', {
							value: String(value),
							writable: true,
							configurable: true
						});
					}
				];

				// Try each strategy with ultra-aggressive error suppression
				for (let i = 0; i < setValueStrategies.length; i++) {
					try {
						setValueStrategies[i]();
						success = true;
						break;
					} catch (strategyError) {
						// Ultra-aggressive suppression - check for sentence/contentScript errors
						if (strategyError.message && 
							(strategyError.message.includes('sentence') || 
							 strategyError.message.includes('contentScript') ||
							 strategyError.message.includes('Cannot read properties of undefined'))) {
							// These are external script errors - continue silently
							continue;
						}
						// Silently continue to next strategy for any other errors
						continue;
					}
				}

				// Safe focus (if possible)
				try {
					if (typeof field.focus === 'function') {
						field.focus();
					}
				} catch (focusError) {
					// Ignore focus errors completely
				}

				// Safe event dispatching (minimal events only)
				try {
					// Temporarily restore dispatchEvent for our use
					EventTarget.prototype.dispatchEvent = originalMethods.dispatchEvent;
					
					const safeEvents = [
						new Event("input", { bubbles: true }),
						new Event("change", { bubbles: true })
					];
					
					safeEvents.forEach(event => {
						try {
							field.dispatchEvent(event);
						} catch (eventError) {
							// Ultra-aggressive suppression for event errors
							if (eventError.message && 
								(eventError.message.includes('sentence') || 
								 eventError.message.includes('contentScript') ||
								 eventError.message.includes('Cannot read properties of undefined'))) {
								// These are external script errors - ignore completely
								return;
							}
							// Ignore all other event errors too
						}
					});
					
					// Block dispatchEvent again
					EventTarget.prototype.dispatchEvent = function() { return true; };
				} catch (eventError) {
					// Ignore all event errors completely
				}

				return success;

			} catch (outerError) {
				// Ultra-aggressive catch for any outer errors
				if (outerError.message && 
					(outerError.message.includes('sentence') || 
					 outerError.message.includes('contentScript') ||
					 outerError.message.includes('Cannot read properties of undefined'))) {
					// These are external script errors - return minimal success
					try {
						field.value = String(value);
						return true;
					} catch (fallbackError) {
						return false;
					}
				}
				return false;
			} finally {
				// ALWAYS restore all original methods
				try {
					window.onerror = originalMethods.onError;
					window.onunhandledrejection = originalMethods.onUnhandledRejection;
					EventTarget.prototype.addEventListener = originalMethods.addEventListener;
					EventTarget.prototype.removeEventListener = originalMethods.removeEventListener;
					EventTarget.prototype.dispatchEvent = originalMethods.dispatchEvent;
					window.setTimeout = originalMethods.setTimeout;
					window.setInterval = originalMethods.setInterval;
					window.requestAnimationFrame = originalMethods.requestAnimationFrame;
				} catch (restoreError) {
					// If we can't restore, log it but don't fail
					console.warn('[AutoFill] Warning: Could not restore some original methods:', restoreError.message);
				}
			}
		};

		// Execute the isolated operation
		return executeFieldOperation();
	}

	static setDateFieldValue(field, value) {
		if (!field || value === undefined || value === null) {
			return false;
		}
		
		// Apply same error isolation as text fields
		const originalOnError = window.onerror;
		const originalUnhandledRejection = window.onunhandledrejection;
		
		try {
			// Suppress external script errors during date field operations
			window.onerror = function(message, source, lineno, colno, error) {
				if (source && (source.includes('contentScript.js') || source.includes('content-script'))) {
					console.warn('[AutoFill] Suppressed external contentScript error during date field operation');
					return true;
				}
				if (message && message.includes('sentence')) {
					console.warn('[AutoFill] Suppressed sentence-related error during date field operation');
					return true;
				}
				return originalOnError ? originalOnError.apply(this, arguments) : false;
			};
			
			window.onunhandledrejection = function(event) {
				if (event.reason && event.reason.stack && 
					(event.reason.stack.includes('contentScript.js') || 
					 event.reason.message?.includes('sentence'))) {
					console.warn('[AutoFill] Suppressed external script promise rejection during date field operation');
					event.preventDefault();
					return;
				}
				return originalUnhandledRejection ? originalUnhandledRejection.call(this, event) : undefined;
			};

			// Safe focus operation
			if (typeof field.focus === 'function') {
				try {
					field.focus();
				} catch (focusError) {
					Logger.debug('Date field focus failed (external interference):', focusError.message);
				}
			}
			
			// Safe value setting
			field.value = String(value);
			
			// Safe event dispatching
			const events = [
				new Event("focus", { bubbles: true }),
				new Event("input", { bubbles: true }),
				new Event("change", { bubbles: true }),
				new Event("blur", { bubbles: true }),
			];
			
			events.forEach((event) => {
				try {
					field.dispatchEvent(event);
				} catch (eventError) {
					Logger.debug(`Date field event ${event.type} dispatch failed:`, eventError.message);
				}
			});
			
			Logger.info(`✅ Date field set to: ${value}`);
			return true;
			
		} catch (error) {
			Logger.error(`Error setting date field value: ${error.message}`);
			return false;
		} finally {
			// Always restore original handlers
			try {
				window.onerror = originalOnError;
				window.onunhandledrejection = originalUnhandledRejection;
			} catch (restoreError) {
				Logger.debug('Error restoring original handlers in date field:', restoreError.message);
			}
		}
	}

	static setSelectFieldValue(field, value) {
		if (!field || value === undefined || value === null) {
			return false;
		}

		try {
			const targetValue = String(value).toLowerCase().trim();
			const options = field.querySelectorAll("option");
			let matchFound = false;

			for (const option of options) {
				const optionText = option.textContent.toLowerCase().trim();
				const optionValue = option.value.toLowerCase().trim();

				if (
					optionText === targetValue ||
					optionValue === targetValue ||
					optionText.includes(targetValue) ||
					targetValue.includes(optionText)
				) {
					option.selected = true;
					field.value = option.value;
					matchFound = true;
					field.dispatchEvent(new Event("change", { bubbles: true }));
					Logger.info(`✅ Select option selected: "${option.textContent}"`);
					break;
				}
			}

			if (!matchFound) {
				Logger.debug(`No matching option found for: "${value}"`);
			}

			return matchFound;
		} catch (error) {
			Logger.error(`Error setting select field value: ${error.message}`);
			return false;
		}
	}

	// Helpers for Google Forms select
	static normalizeString(value) {
		return String(value ?? "")
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.trim();
	}

	static areValuesEquivalent(a, b) {
		const x = this.normalizeString(a);
		const y = this.normalizeString(b);
		if (!x || !y) return false;
		const groups = [
			["femme", "feminin", "feminin", "female", "f"],
			["homme", "masculin", "male", "m"],
		];
		return groups.some((g) => g.includes(x) && g.includes(y));
	}

	static getGoogleFormsOptions(field) {
		return field.querySelectorAll('[role="option"]');
	}

	static openGoogleFormsDropdown(field) {
		field.focus();
		field.click();
		const events = ["mousedown", "mouseup", "click"];
		events.forEach((eventType) => {
			field.dispatchEvent(new MouseEvent(eventType, { bubbles: true }));
		});
		return this.getGoogleFormsOptions(field);
	}

	static isPlaceholderOption(text) {
		const normalized = this.normalizeString(text);
		return normalized === "sélectionner" || normalized === "select";
	}

	static isGoogleOptionMatch(optionText, dataValueLower, targetValue) {
		return (
			optionText === targetValue ||
			dataValueLower === targetValue ||
			optionText.includes(targetValue) ||
			targetValue.includes(optionText) ||
			this.areValuesEquivalent(optionText, targetValue) ||
			(this.normalizeString(dataValueLower) && this.areValuesEquivalent(dataValueLower, targetValue)) ||
			(dataValueLower &&
				(dataValueLower.includes(targetValue) || targetValue.includes(dataValueLower)))
		);
	}

	static triggerOptionSelection(option) {
		option.click();
		option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		option.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
		option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	}

	static updateAriaSelected(options, selectedOption) {
		options.forEach((opt) => {
			opt.setAttribute("aria-selected", opt === selectedOption ? "true" : "false");
		});
	}

	static optionsToLogArray(options) {
		return Array.from(options).map(
			(opt) => `"${opt.textContent}" (data-value: "${opt.getAttribute("data-value")}")`
		);
	}

	static setGoogleFormsSelectValue(field, value) {
		if (!field || value === undefined || value === null) {
			return false;
		}

		try {
			const targetValue = this.normalizeString(value);
			Logger.debug(`Attempting to set Google Forms dropdown to: "${value}"`);
			let options = this.getGoogleFormsOptions(field);

			// If dropdown is collapsed, open it to ensure options are interactive
			const isCollapsed = field.getAttribute && field.getAttribute("aria-expanded") === "false";
			if (isCollapsed) {
				options = this.openGoogleFormsDropdown(field);
			}
			if (options.length === 0) {
				options = this.openGoogleFormsDropdown(field);
			}
			let matchFound = false;
			Logger.debug(`Found ${options.length} options in Google Forms dropdown`);
			for (const option of options) {
				const optionText = this.normalizeString(option.textContent);
				const dataValue = option.getAttribute("data-value");
				const dataValueLower = dataValue ? this.normalizeString(dataValue) : "";
				Logger.debug(`Checking option: text="${optionText}", data-value="${dataValueLower}"`);
				if (this.isPlaceholderOption(optionText)) {
					continue;
				}
				if (this.isGoogleOptionMatch(optionText, dataValueLower, targetValue)) {
					this.triggerOptionSelection(option);
					this.updateAriaSelected(options, option);
					matchFound = true;
					Logger.info(`✅ Google Forms dropdown option selected: "${option.textContent}"`);
					break;
				}
			}
			if (!matchFound) {
				Logger.debug(`No matching option found in Google Forms dropdown for: "${value}"`);
				Logger.debug(`Available options:`, this.optionsToLogArray(options));
				// If still not found and dropdown is collapsed, try to set via aria-labelledby fallback
				try {
					const labelId = field.getAttribute("aria-labelledby");
					if (labelId) {
						const label = document.getElementById(labelId)?.textContent?.trim();
						Logger.debug(`Dropdown labeled by: ${labelId} -> ${label}`);
					}
				} catch (_) {}
			}
			return matchFound;
		} catch (error) {
			Logger.error(`Error setting Google Forms select field value: ${error.message}`);
			return false;
		}
	}

	static setRadioValue(radioField, value) {
		try {
			if (value === undefined || value === null || String(value).trim() === "") {
				Logger.debug("Skipping radio selection due to empty value");
				return false;
			}
			const container =
				radioField.closest('[role="listitem"]') ||
				radioField.closest('[data-params*="question"]');
			if (!container) {
				Logger.debug("Could not find radio button container");
				return false;
			}
			const radioGroup = container.querySelectorAll(`input[type="radio"][name="${radioField.name}"]`);
			if (radioGroup.length === 0) {
				Logger.debug("No radio group found");
				return false;
			}
			Logger.debug(`Found ${radioGroup.length} radio buttons in group`);
			const targetValue = String(value).toLowerCase().trim();
			const normalizedTarget = this.normalizeString(targetValue);
			for (const radio of radioGroup) {
				const label = this.getRadioLabel(radio);
				if (!label) continue;
				const labelValue = label.toLowerCase().trim();
				const normalizedLabel = this.normalizeString(labelValue);
				Logger.debug(`Comparing "${targetValue}" with radio label "${labelValue}"`);
				if (
					labelValue === targetValue ||
					normalizedLabel === normalizedTarget ||
					(targetValue.length > 0 && labelValue.includes(targetValue)) ||
					(normalizedTarget.length > 0 && normalizedLabel.includes(normalizedTarget)) ||
					(targetValue.length > 0 && targetValue.includes(labelValue)) ||
					(normalizedTarget.length > 0 && normalizedTarget.includes(normalizedLabel)) ||
					this.isRadioValueMatch(targetValue, labelValue)
				) {
					Logger.info(`✅ Selecting radio button: "${label}"`);
					radio.checked = true;
					radio.focus();
					const events = [
						new Event("change", { bubbles: true }),
						new Event("click", { bubbles: true }),
						new Event("input", { bubbles: true }),
					];
					events.forEach((event) => radio.dispatchEvent(event));
					return true;
				}
			}
			Logger.debug(`No matching radio button found for value: "${targetValue}"`);
			return false;
		} catch (error) {
			Logger.error(`Error setting radio value: ${error.message}`);
			return false;
		}
	}

	static setGoogleFormsRadioValue(radioField, value) {
		try {
			if (value === undefined || value === null || String(value).trim() === "") {
				Logger.debug("Skipping Google Forms radio selection due to empty value");
				return false;
			}
			const radioGroup =
				radioField.closest('[role="radiogroup"]') || radioField.parentElement;
			if (!radioGroup) {
				Logger.debug("Could not find Google Forms radio group");
				return false;
			}
			const radioOptions = radioGroup.querySelectorAll('[role="radio"]');
			if (radioOptions.length === 0) {
				Logger.debug("No radio options found in Google Forms radio group");
				return false;
			}
			Logger.debug(`Found ${radioOptions.length} Google Forms radio options`);
			const targetValue = String(value).toLowerCase().trim();
			const normalizedTarget = this.normalizeString(targetValue);
			for (const radio of radioOptions) {
				const label = this.getGoogleFormsLabel(radio);
				const dataValue = radio.getAttribute("data-value");
				if (!label && !dataValue) continue;
				const labelValue = label ? label.toLowerCase().trim() : "";
				const dataValueLower = dataValue ? dataValue.toLowerCase().trim() : "";
				const normalizedLabel = this.normalizeString(labelValue);
				const normalizedData = this.normalizeString(dataValueLower);
				Logger.debug(
					`Comparing "${targetValue}" with Google Forms radio: label="${labelValue}", data-value="${dataValueLower}"`
				);
				if (
					labelValue === targetValue ||
					dataValueLower === targetValue ||
					normalizedLabel === normalizedTarget ||
					normalizedData === normalizedTarget ||
					(targetValue.length > 0 && labelValue.includes(targetValue)) ||
					(normalizedTarget.length > 0 && normalizedLabel.includes(normalizedTarget)) ||
					(targetValue.length > 0 && dataValueLower.includes(targetValue)) ||
					(normalizedTarget.length > 0 && normalizedData.includes(normalizedTarget)) ||
					(targetValue.length > 0 && targetValue.includes(labelValue)) ||
					(normalizedTarget.length > 0 && normalizedTarget.includes(normalizedLabel)) ||
					this.isRadioValueMatch(targetValue, labelValue) ||
					this.isRadioValueMatch(targetValue, dataValueLower) ||
					// Direct normalized equivalence for Femme/Homme (aria-label/data-value)
					(normalizedData === "femme" && normalizedTarget === "feminin") ||
					(normalizedData === "homme" && normalizedTarget === "masculin") ||
					(normalizedLabel === "femme" && normalizedTarget === "feminin") ||
					(normalizedLabel === "homme" && normalizedTarget === "masculin")
				) {
					Logger.info(`✅ Selecting Google Forms radio: "${label || dataValue}"`);
					radio.setAttribute("aria-checked", "true");
					radio.click();
					const hiddenInput = radioGroup.querySelector('input[type="radio"]');
					if (hiddenInput) {
						hiddenInput.checked = true;
						hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
					}
					return true;
				}
			}
			Logger.debug(`No matching Google Forms radio found for value: "${targetValue}"`);
			return false;
		} catch (error) {
			Logger.error(`Error setting Google Forms radio value: ${error.message}`);
			return false;
		}
	}

	static setGoogleFormsCheckboxValue(checkboxField, value) {
		try {
			if (Array.isArray(value)) {
				return this.setGoogleFormsMultipleCheckboxValues(checkboxField, value);
			}
			let shouldCheck = false;
			if (typeof value === "boolean") {
				shouldCheck = value;
			} else if (typeof value === "string") {
				const lowerValue = value.toLowerCase().trim();
				shouldCheck =
					lowerValue === "true" ||
					lowerValue === "oui" ||
					lowerValue === "yes" ||
					lowerValue === "1" ||
					lowerValue === "coché" ||
					lowerValue === "checked";
			}
			Logger.debug(`Setting Google Forms checkbox to: ${shouldCheck}`);
			checkboxField.setAttribute("aria-checked", shouldCheck.toString());
			checkboxField.click();
			const container =
				checkboxField.closest('[role="group"]') || checkboxField.parentElement;
			const hiddenInput = container?.querySelector('input[type="checkbox"]');
			if (hiddenInput) {
				hiddenInput.checked = shouldCheck;
				hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
			}
			Logger.info(`✅ Google Forms checkbox set to: ${shouldCheck}`);
			return true;
		} catch (error) {
			Logger.error(`Error setting Google Forms checkbox value: ${error.message}`);
			return false;
		}
	}

	static setGoogleFormsMultipleCheckboxValues(checkboxField, values) {
		if (!Array.isArray(values)) {
			return false;
		}
		try {
			let checkboxGroup = checkboxField.closest('[role="group"]');
			if (!checkboxGroup) {
				checkboxGroup = checkboxField.closest('[data-params*="checkbox"]');
			}
			if (!checkboxGroup) {
				checkboxGroup = checkboxField.closest("div[data-params]");
			}
			if (!checkboxGroup) {
				let parent = checkboxField.parentElement;
				while (parent && parent !== document.body) {
					const checkboxesInParent = parent.querySelectorAll('[role="checkbox"]');
					if (checkboxesInParent.length > 1) {
						checkboxGroup = parent;
						break;
					}
					parent = parent.parentElement;
				}
			}
			if (!checkboxGroup) {
				Logger.debug("Could not find Google Forms checkbox group, searching in entire document");
				checkboxGroup = document;
			}
			let checkboxes = checkboxGroup.querySelectorAll('[role="checkbox"]');
			let successCount = 0;
			const availableOptions = Array.from(checkboxes)
				.map((checkbox) => {
					const label = this.getGoogleFormsLabel(checkbox);
					return label ? label.toLowerCase().trim() : "";
				})
				.filter((label) => label);
			Logger.debug(`Available Google Forms checkbox options:`, availableOptions);
			const isCodesFormat = availableOptions.some((option) => ["ce", "co", "ee", "eo"].includes(option));
			const isFullNamesFormat = availableOptions.some((option) => option.includes("compréhension") || option.includes("comprehension") || option.includes("expression") || option.includes("écrite") || option.includes("orale"));
			let valuesToUse = [];
			if (isCodesFormat) {
				if (USER_PROFILE.choices && USER_PROFILE.choices.examTypes) {
					valuesToUse = Array.isArray(USER_PROFILE.choices.examTypes) ? USER_PROFILE.choices.examTypes : [USER_PROFILE.choices.examTypes];
					Logger.debug(`Using short codes from examTypes for Google Forms:`, valuesToUse);
				} else if (USER_PROFILE.misc && USER_PROFILE.misc.examSubjects) {
					const examSubjects = Array.isArray(USER_PROFILE.misc.examSubjects) ? USER_PROFILE.misc.examSubjects : [USER_PROFILE.misc.examSubjects];
					const codeMapping = {
						"Compréhension écrite": "CE",
						"comprehension écrite": "CE",
						"Compréhension orale": "CO",
						"comprehension orale": "CO",
						"Expression écrite": "EE",
						"expression ecrite": "EE",
						"Expression orale": "EO",
						"expression orale": "EO",
					};
					valuesToUse = examSubjects.map((subject) => codeMapping[subject] || subject);
					Logger.debug(`Using short codes from examSubjects for Google Forms:`, valuesToUse);
				}
			} else if (isFullNamesFormat) {
				if (USER_PROFILE.choices && USER_PROFILE.choices.examTypesFull) {
					valuesToUse = Array.isArray(USER_PROFILE.choices.examTypesFull) ? USER_PROFILE.choices.examTypesFull : [USER_PROFILE.choices.examTypesFull];
					Logger.debug(`Using full names from examTypesFull for Google Forms:`, valuesToUse);
				} else if (USER_PROFILE.misc && USER_PROFILE.misc.examSubjectsFull) {
					valuesToUse = Array.isArray(USER_PROFILE.misc.examSubjectsFull) ? USER_PROFILE.misc.examSubjectsFull : [USER_PROFILE.misc.examSubjectsFull];
					Logger.debug(`Using full names from examSubjectsFull for Google Forms:`, valuesToUse);
				} else if (USER_PROFILE.misc && USER_PROFILE.misc.examSubjects) {
					valuesToUse = Array.isArray(USER_PROFILE.misc.examSubjects) ? USER_PROFILE.misc.examSubjects : [USER_PROFILE.misc.examSubjects];
					Logger.debug(`Using examSubjects directly for Google Forms:`, valuesToUse);
				}
			}
			if (valuesToUse.length === 0) {
				valuesToUse = Array.isArray(values) ? values : [values];
				Logger.debug(`Using fallback values for Google Forms:`, valuesToUse);
			}
			Logger.debug(`Using values for Google Forms matching:`, valuesToUse);
			valuesToUse.forEach((value) => {
				const targetValue = String(value).toLowerCase().trim();
				let matchedForThisValue = false;
				for (const checkbox of checkboxes) {
					const label = this.getGoogleFormsLabel(checkbox);
					const dataValue = checkbox.getAttribute("data-value");
					if (!label && !dataValue) continue;
					const labelValue = label ? label.toLowerCase().trim() : "";
					const dataValueLower = dataValue ? dataValue.toLowerCase().trim() : "";
					if (
						labelValue === targetValue ||
						dataValueLower === targetValue ||
						this.isCheckboxValueMatch(targetValue, labelValue) ||
						this.isCheckboxValueMatch(targetValue, dataValueLower)
					) {
						checkbox.setAttribute("aria-checked", "true");
						checkbox.click();
						const hiddenInput =
							checkbox.querySelector('input[type="checkbox"]') ||
							checkbox.parentElement.querySelector('input[type="checkbox"]');
						if (hiddenInput) {
							hiddenInput.checked = true;
							hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
						}
						Logger.info(`✅ Checking Google Forms checkbox: "${label || dataValue}" for value "${value}"`);
						successCount++;
						matchedForThisValue = true;
						break;
					}
				}
				if (!matchedForThisValue) {
					Logger.debug(`❌ No Google Forms checkbox found for value: "${value}"`);
				}
			});
			Logger.info(`✅ Successfully checked ${successCount}/${valuesToUse.length} Google Forms checkboxes`);
			return successCount > 0;
		} catch (error) {
			Logger.error(`Error setting Google Forms multiple checkbox values: ${error.message}`);
			return false;
		}
	}

	static getGoogleFormsLabel(element) {
		try {
			let span = element.querySelector('span[dir="auto"]');
			if (span && span.textContent.trim()) {
				return span.textContent.trim();
			}
			// Google Forms variant: label within aria-labelledby
			const labelId = element.getAttribute("aria-labelledby");
			if (labelId) {
				const lbl = document.getElementById(labelId);
				if (lbl && lbl.textContent.trim()) return lbl.textContent.trim();
			}
			if (element.getAttribute("aria-label")) {
				return element.getAttribute("aria-label");
			}
			if (element.getAttribute("data-value")) {
				return element.getAttribute("data-value");
			}
			const text = element.textContent.trim();
			if (text) return text;
			const parent = element.parentElement;
			if (parent) {
				const parentSpan = parent.querySelector('span[dir="auto"]');
				if (parentSpan && parentSpan.textContent.trim()) {
					return parentSpan.textContent.trim();
				}
				// Some structures place label 2 levels up
				const grand = parent.parentElement;
				if (grand) {
					const grandSpan = grand.querySelector('span[dir="auto"]');
					if (grandSpan && grandSpan.textContent.trim()) {
						return grandSpan.textContent.trim();
					}
				}
			}
			return null;
		} catch (error) {
			Logger.debug(`Error getting Google Forms label: ${error.message}`);
			return null;
		}
	}

	static setCheckboxValue(checkboxField, value) {
		try {
			const container =
				checkboxField.closest('[role="listitem"]') ||
				checkboxField.closest('[data-params*="question"]');
			if (Array.isArray(value)) {
				return this.setMultipleCheckboxValues(container, value);
			}
			let shouldCheck = false;
			if (typeof value === "boolean") {
				shouldCheck = value;
			} else if (typeof value === "string") {
				const lowerValue = value.toLowerCase().trim();
				shouldCheck =
					lowerValue === "true" ||
					lowerValue === "oui" ||
					lowerValue === "yes" ||
					lowerValue === "1" ||
					lowerValue === "coché" ||
					lowerValue === "checked";
			}
			Logger.debug(`Setting checkbox to: ${shouldCheck}`);
			checkboxField.checked = shouldCheck;
			checkboxField.focus();
			const events = [
				new Event("change", { bubbles: true }),
				new Event("click", { bubbles: true }),
				new Event("input", { bubbles: true }),
			];
			events.forEach((event) => checkboxField.dispatchEvent(event));
			Logger.info(`✅ Checkbox set to: ${shouldCheck}`);
			return true;
		} catch (error) {
			Logger.error(`Error setting checkbox value: ${error.message}`);
			return false;
		}
	}

	static setMultipleCheckboxValues(container, values) {
		if (!container || !Array.isArray(values)) {
			return false;
		}
		try {
			const checkboxes = container.querySelectorAll('input[type="checkbox"]');
			let successCount = 0;
			const availableOptions = Array.from(checkboxes)
				.map((checkbox) => {
					const label = this.getCheckboxLabel(checkbox);
					return label ? label.toLowerCase().trim() : "";
				})
				.filter((label) => label);
			Logger.debug(`Available checkbox options:`, availableOptions);
			const isCodesFormat = availableOptions.some((option) => ["ce", "co", "ee", "eo"].includes(option));
			const isFullNamesFormat = availableOptions.some((option) => option.includes("compréhension") || option.includes("comprehension") || option.includes("expression") || option.includes("écrite") || option.includes("orale"));
			let valuesToUse = [];
			if (isCodesFormat) {
				if (USER_PROFILE.choices && USER_PROFILE.choices.examTypes) {
					valuesToUse = Array.isArray(USER_PROFILE.choices.examTypes) ? USER_PROFILE.choices.examTypes : [USER_PROFILE.choices.examTypes];
					Logger.debug(`Using short codes from examTypes:`, valuesToUse);
				} else if (USER_PROFILE.misc && USER_PROFILE.misc.examSubjects) {
					const examSubjects = Array.isArray(USER_PROFILE.misc.examSubjects) ? USER_PROFILE.misc.examSubjects : [USER_PROFILE.misc.examSubjects];
					const codeMapping = {
						"Compréhension écrite": "CE",
						"comprehension écrite": "CE",
						"Compréhension orale": "CO",
						"comprehension orale": "CO",
						"Expression écrite": "EE",
						"expression ecrite": "EE",
						"Expression orale": "EO",
						"expression orale": "EO",
					};
					valuesToUse = examSubjects.map((subject) => codeMapping[subject] || subject);
					Logger.debug(`Using short codes from examSubjects:`, valuesToUse);
				}
			} else if (isFullNamesFormat) {
				if (USER_PROFILE.choices && USER_PROFILE.choices.examTypesFull) {
					valuesToUse = Array.isArray(USER_PROFILE.choices.examTypesFull) ? USER_PROFILE.choices.examTypesFull : [USER_PROFILE.choices.examTypesFull];
					Logger.debug(`Using full names from examTypesFull:`, valuesToUse);
				} else if (USER_PROFILE.misc && USER_PROFILE.misc.examSubjectsFull) {
					valuesToUse = Array.isArray(USER_PROFILE.misc.examSubjectsFull) ? USER_PROFILE.misc.examSubjectsFull : [USER_PROFILE.misc.examSubjectsFull];
					Logger.debug(`Using full names from examSubjectsFull:`, valuesToUse);
				} else if (USER_PROFILE.misc && USER_PROFILE.misc.examSubjects) {
					valuesToUse = Array.isArray(USER_PROFILE.misc.examSubjects) ? USER_PROFILE.misc.examSubjects : [USER_PROFILE.misc.examSubjects];
					Logger.debug(`Using examSubjects directly:`, valuesToUse);
				}
			}
			if (valuesToUse.length === 0) {
				valuesToUse = Array.isArray(values) ? values : [values];
				Logger.debug(`Using fallback values:`, valuesToUse);
			}
			Logger.debug(`Final values to use for matching:`, valuesToUse);
			valuesToUse.forEach((value) => {
				const targetValue = String(value).toLowerCase().trim();
				let matchedForThisValue = false;
				for (const checkbox of checkboxes) {
					const label = this.getCheckboxLabel(checkbox);
					if (!label) continue;
					const labelValue = label.toLowerCase().trim();
					if (this.isCheckboxValueMatch(targetValue, labelValue)) {
						Logger.info(`✅ Checking checkbox: "${label}" for value "${value}"`);
						checkbox.checked = true;
						checkbox.focus();
						const events = [
							new Event("change", { bubbles: true }),
							new Event("click", { bubbles: true }),
							new Event("input", { bubbles: true }),
						];
						events.forEach((event) => checkbox.dispatchEvent(event));
						successCount++;
						matchedForThisValue = true;
					}
				}
				if (!matchedForThisValue) {
					Logger.debug(`❌ No checkbox found for value: "${value}"`);
				}
			});
			Logger.info(`✅ Successfully checked ${successCount}/${valuesToUse.length} checkboxes`);
			return successCount > 0;
		} catch (error) {
			Logger.error(`Error setting multiple checkbox values: ${error.message}`);
			return false;
		}
	}

	static getRadioLabel(radio) {
		try {
			let label = radio.nextElementSibling;
			if (label && (label.tagName === "LABEL" || label.tagName === "SPAN")) {
				return label.textContent.trim();
			}
			const parent = radio.parentElement;
			if (parent) {
				const clone = parent.cloneNode(true);
				const radioClone = clone.querySelector('input[type="radio"]');
				if (radioClone) radioClone.remove();
				const text = clone.textContent.trim();
				if (text) return text;
			}
			if (radio.getAttribute("aria-label")) {
				return radio.getAttribute("aria-label");
			}
			if (radio.id) {
				const labelElement = document.querySelector(`label[for="${radio.id}"]`);
				if (labelElement) return labelElement.textContent.trim();
			}
			return null;
		} catch (error) {
			Logger.debug(`Error getting radio label: ${error.message}`);
			return null;
		}
	}

	static getCheckboxLabel(checkbox) {
		return this.getRadioLabel(checkbox);
	}

	static isRadioValueMatch(targetValue, labelValue) {
		const normalize = (s) =>
			String(s || "")
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.trim();
		const tv = normalize(targetValue);
		const lv = normalize(labelValue);
		const equivalences = {
			masculin: ["homme", "male", "masculin", "m"],
			feminin: ["femme", "female", "feminin", "f"],
			homme: ["masculin", "male", "homme", "m"],
			femme: ["feminin", "female", "femme", "f"],
			cni: ["carte nationale", "carte identite", "cni", "carte d'identite"],
			passeport: ["passeport", "passport"],
			francais: ["francais", "french", "france", "français"],
			anglais: ["anglais", "english", "english language"],
			aucun: ["aucun", "aucune", "non", "pas de handicap", "sans handicap"],
			vision: ["vision", "visuel", "vue", "malvoyant", "aveugle"],
		};
		for (const values of Object.values(equivalences)) {
			if (values.includes(tv) && values.includes(lv)) {
				return true;
			}
		}
		// Direct match for common labels
		if ((tv === "femme" && lv === "femme") || (tv === "homme" && lv === "homme")) {
			return true;
		}
		return false;
	}

	static isCheckboxValueMatch(targetValue, labelValue) {
		Logger.debug(`🔍 Matching "${targetValue}" with "${labelValue}"`);
		const normalize = (str) => {
			return str
				.toLowerCase()
				.replace(/é/g, "e")
				.replace(/è/g, "e")
				.replace(/ê/g, "e")
				.replace(/à/g, "a")
				.replace(/ç/g, "c")
				.trim();
		};
		const normalizedTarget = normalize(targetValue);
		const normalizedLabel = normalize(labelValue);
		if (normalizedLabel === normalizedTarget) {
			Logger.debug(`✅ Normalized exact match: "${targetValue}" = "${labelValue}"`);
			return true;
		}
		const examEquivalences = {
			ce: ["comprehension ecrite"],
			co: ["comprehension orale"],
			ee: ["expression ecrite"],
			eo: ["expression orale"],
			"comprehension ecrite": ["ce"],
			"comprehension orale": ["co"],
			"expression ecrite": ["ee"],
			"expression orale": ["eo"],
		};
		if (examEquivalences[normalizedTarget]) {
			for (const equiv of examEquivalences[normalizedTarget]) {
				if (normalizedLabel === normalize(equiv)) {
					Logger.debug(`✅ Exam equivalence match: "${targetValue}" → "${equiv}" = "${labelValue}"`);
					return true;
				}
			}
		}
		const disabilityEquivalences = {
			aucun: ["aucune", "non", "pas de handicap", "sans handicap"],
			aucune: ["aucun", "non", "pas de handicap", "sans handicap"],
			vision: ["visuel", "vue", "malvoyant", "aveugle"],
			visuel: ["vision", "vue", "malvoyant", "aveugle"],
		};
		if (disabilityEquivalences[targetValue]) {
			for (const equiv of disabilityEquivalences[targetValue]) {
				if (labelValue === equiv.toLowerCase()) {
					Logger.debug(`✅ Disability equivalence match: "${targetValue}" → "${equiv}" = "${labelValue}"`);
					return true;
				}
			}
		}
		if (targetValue.length > 3 && labelValue.length > 3) {
			if (labelValue.includes(targetValue) || targetValue.includes(labelValue)) {
				Logger.debug(`✅ Partial match found: "${targetValue}" ↔ "${labelValue}"`);
				return true;
			}
		}
		Logger.debug(`❌ No match found for "${targetValue}" with "${labelValue}"`);
		return false;
	}
}

try {
	globalThis.FieldFiller = FieldFiller;
} catch (e) {}


