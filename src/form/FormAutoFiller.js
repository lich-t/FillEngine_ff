"use strict";

class FormAutoFiller {
	constructor() {
		this.dictionary = generateFlatDictionary();
		this.fieldMatcher = new FieldMatcher(this.dictionary);
		this.statistics = {
			fieldsDetected: 0,
			fieldsFilled: 0,
			detectionResults: [],
			fileUploadFields: 0,
			fileUploadProcessed: 0,
			fileUploadErrors: []
		};
	}

	updateUserProfile(newProfile) {
		console.log("🔄 UPDATE USER PROFILE CALLED");
		console.log("├── New profile provided:", !!newProfile);
		console.log("├── Current USER_PROFILE before update:", USER_PROFILE);
		console.log("└── New profile data:", newProfile);

		if (newProfile) {
			Object.keys(newProfile).forEach((category) => {
				console.log(`Processing category: ${category}`, newProfile[category]);
				if (typeof newProfile[category] === "object" && newProfile[category] !== null) {
					if (!USER_PROFILE[category]) {
						USER_PROFILE[category] = {};
					}
					Object.assign(USER_PROFILE[category], newProfile[category]);
					console.log(`✅ Updated USER_PROFILE.${category}:`, USER_PROFILE[category]);
				}
			});

			console.log("📊 FINAL USER_PROFILE AFTER MERGE:", USER_PROFILE);
			console.log("🔄 Regenerating dictionary...");
			this.dictionary = generateFlatDictionary();
			console.log("📖 GENERATED DICTIONARY:", this.dictionary);
			this.fieldMatcher = new FieldMatcher(this.dictionary);
			Logger.info("User profile updated from CSV data");
			Logger.debug("Updated USER_PROFILE:", USER_PROFILE);
			console.log("✅ USER PROFILE UPDATE COMPLETE");
		} else {
			console.log("❌ No new profile provided to updateUserProfile");
		}
	}

	async fillForm() {
		console.log("🚀 FILL FORM PROCESS STARTED");
		console.log("├── USER_PROFILE.personal:", USER_PROFILE.personal);
		console.log("├── USER_PROFILE keys:", Object.keys(USER_PROFILE));
		console.log("└── Dictionary available:", !!this.dictionary);

		Logger.info("Starting form fill process...");

		if (!USER_PROFILE.personal || Object.keys(USER_PROFILE.personal).length === 0) {
			console.log("❌ NO USER DATA - form fill aborted");
			console.log("├── USER_PROFILE.personal:", USER_PROFILE.personal);
			console.log(
				"├── Keys length:",
				USER_PROFILE.personal ? Object.keys(USER_PROFILE.personal).length : 0
			);
			Logger.error("No user data loaded. Please upload a CSV file first.");
			return {
				success: false,
				message:
					"Aucune donnée utilisateur chargée. Veuillez d'abord télécharger un fichier CSV.",
				fieldsDetected: 0,
				fieldsFilled: 0,
				supportedFields: 0,
				unsupportedFields: 0,
				fieldsWithoutInput: 0,
				supportedSuccessRate: 0,
				overallSuccessRate: 0,
				detectionResults: [],
				fileUploadFields: 0,
				fileUploadProcessed: 0,
				fileUploadErrors: []
			};
		}

		this.statistics = {
			fieldsDetected: 0,
			fieldsFilled: 0,
			detectionResults: [],
			fileUploadFields: 0,
			fileUploadProcessed: 0,
			fileUploadErrors: []
		};

		const containers = FormDetector.findQuestionContainers();

		// First, process regular form fields

		containers.forEach((container, index) => {
			const questionLabel = FormDetector.extractQuestionLabel(container);
			Logger.debug(`Question ${index + 1}: "${questionLabel}"`);
			if (!questionLabel) return;
			this.statistics.fieldsDetected++;
			const inputField = FormDetector.findInputField(container);
			let matchFound = false;
			let matchedKey = "";
			let matchedValue = "";
			let inputType = "unknown";
			let fieldCategory = "unknown";
			if (inputField) {
				// Check if this is a file upload field first
				if (inputField.dataset && inputField.dataset.fieldType === 'fileupload') {
					fieldCategory = "fileupload";
					inputType = "fileupload";
					// File upload fields are considered unfilled initially
					matchFound = false;
					matchedKey = "fileupload";
					matchedValue = "File upload field (not processed yet)";
					Logger.debug(`📁 File upload field detected: "${questionLabel}"`);
				} else {
					// Regular field processing
					inputType =
						inputField.type ||
						inputField.tagName.toLowerCase() ||
						inputField.getAttribute("role") ||
						"element";
					if (inputType === "date") {
						fieldCategory = "date";
					} else if (
						inputType === "select" ||
						inputField.querySelector('[role="listbox"]') ||
						container.querySelector('[role="listbox"]')
					) {
						fieldCategory = "select";
					} else if (
						inputType === "radio" ||
						inputField.getAttribute("role") === "radio" ||
						container.querySelector('[role="radio"]')
					) {
						fieldCategory = "radio";
					} else if (
						inputType === "checkbox" ||
						inputField.getAttribute("role") === "checkbox" ||
						container.querySelector('[role="checkbox"]')
					) {
						fieldCategory = "checkbox";
					} else if (
						inputType === "text" ||
						inputType === "email" ||
						inputType === "tel" ||
						inputType === "textarea"
					) {
						fieldCategory = "text";
					} else {
						fieldCategory = "other";
					}
				}
					if (
						fieldCategory === "text" ||
						fieldCategory === "radio" ||
						fieldCategory === "checkbox" ||
						fieldCategory === "date" ||
						fieldCategory === "select"
					) {
						if (this.dictionary[questionLabel]) {
							const dictValue = this.dictionary[questionLabel];
							// Validate the value before setting
							if (dictValue !== undefined && dictValue !== null && dictValue !== '') {
								Logger.info(
									`✅ Exact match found: "${questionLabel}" -> "${dictValue}"`
								);
								const success = FieldFiller.setFieldValue(
									inputField,
									dictValue
								);
								if (success) {
									this.statistics.fieldsFilled++;
									matchFound = true;
									matchedKey = questionLabel;
									matchedValue = dictValue;
								}
							} else {
								Logger.debug(`Skipping exact match with empty/null value for: "${questionLabel}"`);
							}
						} else {
							const bestMatch = this.fieldMatcher.findBestMatch(questionLabel);
							if (bestMatch && bestMatch.value !== undefined && bestMatch.value !== null && bestMatch.value !== '') {
								Logger.info(
									`✅ Best match found: "${bestMatch.key}" -> "${bestMatch.value}" (score: ${bestMatch.score.toFixed(2)})`
								);
								const success = FieldFiller.setFieldValue(
									inputField,
									bestMatch.value
								);
								if (success) {
									this.statistics.fieldsFilled++;
									matchFound = true;
									matchedKey = bestMatch.key;
									matchedValue = bestMatch.value;
								}
							} else if (bestMatch) {
								Logger.debug(`Skipping best match with empty/null value for: "${questionLabel}" -> "${bestMatch.value}"`);
							}
						}
					} else if (fieldCategory === "fileupload") {
						// File upload fields are not filled during regular processing
						// They will be processed later in processFileUploadFields()
						Logger.debug(`📁 File upload field detected, will be processed later: "${questionLabel}"`);
					} else {
						Logger.debug(
							`⏭️ Skipped question ${index + 1}: unsupported field type "${fieldCategory}" (${inputType})`
						);
					}
			} else {
				Logger.debug(`⏭️ Skipped question ${index + 1}: no input field found`);
				inputType = "no-input-field";
				fieldCategory = "no-input";
			}
			this.statistics.detectionResults.push({
				questionLabel,
				matched: matchFound,
				key: matchedKey,
				value: matchedValue,
				inputType: inputType,
				fieldCategory: fieldCategory,
				hasInputField: !!inputField,
			});
		});

		const supportedFields = this.statistics.detectionResults.filter(
			(r) =>
				r.fieldCategory === "text" ||
				r.fieldCategory === "radio" ||
				r.fieldCategory === "checkbox" ||
				r.fieldCategory === "date" ||
				r.fieldCategory === "select"
		).length;

		const unsupportedFields = this.statistics.detectionResults.filter((r) => r.fieldCategory === "other").length;
		const fieldsWithoutInput = this.statistics.detectionResults.filter((r) => !r.hasInputField).length;
		const supportedSuccessRate =
			supportedFields > 0 ? Math.round((this.statistics.fieldsFilled / supportedFields) * 100) : 0;
		const overallSuccessRate =
			this.statistics.fieldsDetected > 0
				? Math.round((this.statistics.fieldsFilled / this.statistics.fieldsDetected) * 100)
				: 0;

		Logger.info(
			`Form fill complete: ${this.statistics.fieldsFilled}/${supportedFields} champs supportés remplis, ${unsupportedFields} champs non supportés, ${fieldsWithoutInput} sans champ d'entrée (Total: ${this.statistics.fieldsDetected} questions)`
		);
		Logger.debug("Detection results:", this.statistics.detectionResults);

		// Automatically highlight unfilled fields after form filling
		this.highlightUnfilledFields();

		// After form filling is complete, process file upload fields
		Logger.info("Form filling completed, now processing file upload fields...");
		await this.processFileUploadFields();

		// Note: Automatic clicking of "Ajouter un fichier" button has been removed

		return {
			success: true,
			message: `Analysé ${this.statistics.fieldsDetected} questions - Rempli ${this.statistics.fieldsFilled} champs (${overallSuccessRate}%) - Puis traité ${this.statistics.fileUploadProcessed} fichiers upload`,
			fieldsDetected: this.statistics.fieldsDetected,
			fieldsFilled: this.statistics.fieldsFilled,
			supportedFields: supportedFields,
			unsupportedFields: unsupportedFields,
			fieldsWithoutInput: fieldsWithoutInput,
			supportedSuccessRate: supportedSuccessRate,
			overallSuccessRate: overallSuccessRate,
			detectionResults: this.statistics.detectionResults,
			fileUploadFields: this.statistics.fileUploadFields,
			fileUploadProcessed: this.statistics.fileUploadProcessed,
			fileUploadErrors: this.statistics.fileUploadErrors,

		};
	}

	getUserProfile() {
		return { ...USER_PROFILE };
	}

	getFieldMappings() {
		return { ...FIELD_MAPPINGS };
	}

	/**
	 * Highlight unfilled fields with visual indicators and labels
	 * @returns {Object} Result object with success status and statistics
	 */
	highlightUnfilledFields() {
		Logger.info("Starting automatic highlighting of unfilled fields...");
		
		// Remove any existing highlights first
		this.removeHighlights();
		
		let highlightedCount = 0;
		const containers = FormDetector.findQuestionContainers();
		
		Logger.debug(`Found ${containers.length} containers to check for highlighting`);
		Logger.debug(`Detection results available:`, this.statistics.detectionResults);
		
		containers.forEach((container, index) => {
			const questionLabel = FormDetector.extractQuestionLabel(container);
			if (!questionLabel) {
				Logger.debug(`Skipping container ${index}: no question label`);
				return;
			}
			
			// Check if this field was filled by looking at our statistics
			const fieldResult = this.statistics.detectionResults.find(
				result => result.questionLabel === questionLabel
			);
			
			Logger.debug(`Container ${index}: "${questionLabel}" - fieldResult:`, fieldResult);
			
			// Only highlight if field was not filled and is a supported field type
			if (fieldResult && !fieldResult.matched && fieldResult.hasInputField && 
				(fieldResult.fieldCategory === "text" || fieldResult.fieldCategory === "radio" || 
				 fieldResult.fieldCategory === "checkbox" || fieldResult.fieldCategory === "date" || 
				 fieldResult.fieldCategory === "select" || fieldResult.fieldCategory === "fileupload")) {
				
				Logger.debug(`Adding highlight to field: "${questionLabel}" (category: ${fieldResult.fieldCategory})`);
				this.addHighlightToField(container, questionLabel);
				highlightedCount++;
			} else {
				Logger.debug(`Skipping highlight for "${questionLabel}" - matched: ${fieldResult?.matched}, hasInput: ${fieldResult?.hasInputField}, category: ${fieldResult?.fieldCategory}`);
			}
		});
		
		Logger.info(`Highlighted ${highlightedCount} unfilled fields`);
		
		return {
			success: true,
			highlightedCount: highlightedCount,
			message: `${highlightedCount} champs non remplis surlignés`
		};
	}
	
	/**
	 * Add highlight styling to a specific field container
	 * @param {Element} container - The field container element
	 * @param {string} questionLabel - The question label text
	 */
	addHighlightToField(container, questionLabel) {
		try {
			// Add highlight class to container
			container.classList.add('autofill-highlight-unfilled');
			
			// Find input field in container and add change listener
			const inputField = FormDetector.findInputField(container);
			if (inputField) {
				this.addFieldChangeListener(container, inputField);
			}
			
			Logger.debug(`Added highlight to field: "${questionLabel}"`);
		} catch (error) {
			Logger.error(`Error adding highlight to field: ${error.message}`);
		}
	}
	
	/**
	 * Add change listener to an input field to remove highlighting when filled
	 * @param {Element} container - The field container element
	 * @param {Element} inputField - The input field element
	 */
	addFieldChangeListener(container, inputField) {
		try {
			const removeHighlightOnChange = () => {
				if (this.isFieldFilled(inputField)) {
					container.classList.remove('autofill-highlight-unfilled');
					Logger.debug('Removed highlight from filled field');
				}
			};
			
			// Special handling for file upload buttons
			if (inputField.dataset && inputField.dataset.fieldType === 'fileupload') {
				// Add click listener for file upload buttons
				inputField.addEventListener('click', () => {
					// Remove highlight immediately when file upload button is clicked
					container.classList.remove('autofill-highlight-unfilled');
					Logger.debug('Removed highlight from file upload field after click');
				});
				return; // No need for other listeners on file upload buttons
			}
			
			// Add multiple event listeners to catch different types of input
			inputField.addEventListener('input', removeHighlightOnChange);
			inputField.addEventListener('change', removeHighlightOnChange);
			inputField.addEventListener('blur', removeHighlightOnChange);
			
			// For radio buttons and checkboxes, listen for click events
			if (inputField.type === 'radio' || inputField.type === 'checkbox') {
				inputField.addEventListener('click', removeHighlightOnChange);
			}
			
			// For select elements
			if (inputField.tagName.toLowerCase() === 'select') {
				inputField.addEventListener('change', removeHighlightOnChange);
			}
			
			// For elements with role attributes (Google Forms)
			if (inputField.getAttribute('role')) {
				inputField.addEventListener('click', removeHighlightOnChange);
				// Also listen for mutations on the container for Google Forms dynamic updates
				const observer = new MutationObserver(() => {
					if (this.isFieldFilled(inputField)) {
						container.classList.remove('autofill-highlight-unfilled');
						Logger.debug('Removed highlight from filled field (mutation)');
						observer.disconnect();
					}
				});
				observer.observe(container, { childList: true, subtree: true, attributes: true });
			}
			
		} catch (error) {
			Logger.error(`Error adding field change listener: ${error.message}`);
		}
	}
	
	/**
	 * Check if a field is filled with a value
	 * @param {Element} inputField - The input field element
	 * @returns {boolean} True if field has a value
	 */
	isFieldFilled(inputField) {
		try {
			if (!inputField) return false;
			
			// For file upload fields, consider them filled if clicked
			if (inputField.dataset && inputField.dataset.fieldType === 'fileupload') {
				// Check if there's any indication of file selection or upload activity
				const container = inputField.closest('[role="listitem"], .freebirdFormviewerViewItemsItemItem, .m2, .Xb9hP, .geS5n, .AgroKb');
				if (container) {
					// Look for file names, progress indicators, or success messages
					const hasFileIndicator = container.querySelector('[data-filename], .file-name, .upload-progress, .upload-success') ||
										 container.textContent.includes('.pdf') || 
										 container.textContent.includes('.jpg') ||
										 container.textContent.includes('.png') ||
										 container.textContent.includes('.doc');
					return !!hasFileIndicator;
				}
				return false;
			}
			
			// For text inputs, textareas, selects
			if (inputField.value && inputField.value.trim() !== '') {
				return true;
			}
			
			// For radio buttons - check if any in the group is selected
			if (inputField.type === 'radio') {
				const radioGroup = document.querySelectorAll(`input[name="${inputField.name}"]`);
				return Array.from(radioGroup).some(radio => radio.checked);
			}
			
			// For checkboxes
			if (inputField.type === 'checkbox') {
				return inputField.checked;
			}
			
			// For Google Forms elements with role attributes
			if (inputField.getAttribute('role')) {
				// Check for aria-checked attribute
				if (inputField.getAttribute('aria-checked') === 'true') {
					return true;
				}
				
				// Check for selected options in dropdowns
				if (inputField.getAttribute('role') === 'listbox') {
					const selectedOption = inputField.querySelector('[aria-selected="true"]');
					return !!selectedOption;
				}
				
				// Check for text content in text-like fields
				if (inputField.textContent && inputField.textContent.trim() !== '') {
					return true;
				}
			}
			
			return false;
		} catch (error) {
			Logger.error(`Error checking if field is filled: ${error.message}`);
			return false;
		}
	}

	/**
	 * Process file upload fields in the form
	 * @returns {Promise<Object>} Processing results
	 */
	async processFileUploadFields() {
		try {
			Logger.info("Processing file upload fields after form filling completion...");
			
			// Instead of using FileUploadHandler, detect file upload fields directly
			const uploadFields = this.detectFileUploadFieldsDirectly();
			this.statistics.fileUploadFields = uploadFields.length;
			
			if (uploadFields.length === 0) {
				Logger.info("No file upload fields detected");
				return { success: true, processed: 0, errors: [] };
			}
			
			Logger.info(`Found ${uploadFields.length} file upload fields`);
			
			// For each file upload field, add it to detection results if not already there
			for (const fieldInfo of uploadFields) {
				try {
					Logger.info(`Processing file upload: ${fieldInfo.questionLabel} (expected: ${fieldInfo.expectedFileType})`);
					
					// Check if this field is already in detection results
					const existingResultIndex = this.statistics.detectionResults.findIndex(
						result => result.questionLabel === fieldInfo.questionLabel && result.fieldCategory === 'fileupload'
					);
					
					if (existingResultIndex === -1) {
						// Add new result for file upload field
						this.statistics.detectionResults.push({
							questionLabel: fieldInfo.questionLabel,
							matched: false, // File upload fields are not "filled" - they need user interaction
							key: 'fileupload',
							value: `File upload field (${fieldInfo.expectedFileType})`,
							inputType: 'fileupload',
							fieldCategory: 'fileupload',
							hasInputField: true,
							expectedFileType: fieldInfo.expectedFileType
						});
						Logger.debug(`Added file upload field to detection results: ${fieldInfo.questionLabel}`);
					}
					
					// Apply highlighting to the container immediately
					this.addHighlightToFileUploadField(fieldInfo.container, fieldInfo.uploadElement, fieldInfo.questionLabel);
					
					this.statistics.fileUploadProcessed++;
					Logger.info(`✅ Successfully processed file upload: ${fieldInfo.questionLabel}`);
					
				} catch (error) {
					this.statistics.fileUploadErrors.push({
						field: fieldInfo.questionLabel,
						error: error.message,
						step: 'processing'
					});
					Logger.error(`Exception processing file upload ${fieldInfo.questionLabel}:`, error);
				}
			}
			
			Logger.info(`File upload processing complete: ${this.statistics.fileUploadProcessed}/${this.statistics.fileUploadFields} processed`);
			
			return {
				success: true,
				processed: this.statistics.fileUploadProcessed,
				total: this.statistics.fileUploadFields,
				errors: this.statistics.fileUploadErrors
			};
			
		} catch (error) {
			Logger.error('Error in file upload processing:', error);
			return {
				success: false,
				error: error.message,
				processed: this.statistics.fileUploadProcessed,
				total: this.statistics.fileUploadFields,
				errors: this.statistics.fileUploadErrors
			};
		}
	}
	
	/**
	 * Detect file upload fields directly without external handlers
	 * @returns {Array} Array of file upload field info objects
	 */
	detectFileUploadFieldsDirectly() {
		try {
			const fileUploadFields = [];
			
			// Simple approach: find all div[role="listitem"] and check for "Ajouter un fichier" text
			const containers = document.querySelectorAll('div[role="listitem"]');
			
			Logger.debug(`Checking ${containers.length} div[role="listitem"] containers for "Ajouter un fichier" text`);
			
			containers.forEach((container, containerIndex) => {
				const questionLabel = FormDetector.extractQuestionLabel(container);
				if (!questionLabel) {
					Logger.debug(`Container ${containerIndex}: No question label found`);
					return;
				}
				
				Logger.debug(`Container ${containerIndex}: Checking "${questionLabel}" for "Ajouter un fichier" text`);
				
				// Look for any element containing "Ajouter un fichier" text
				const allElements = container.querySelectorAll('*');
				for (const element of allElements) {
					if (element.textContent && element.textContent.includes('Ajouter un fichier')) {
						Logger.debug(`  Found element with "Ajouter un fichier" text:`, element);
						
						// Find the clickable element (button)
						let uploadElement = element;
						if (element.getAttribute('role') !== 'button') {
							uploadElement = element.closest('[role="button"]') || element;
						}
						
						if (FormDetector.isElementVisible(uploadElement)) {
							// Determine expected file type
							const expectedType = FormDetector.determineExpectedFileType(questionLabel, container);
							
							// Mark element as file upload
							uploadElement.dataset.fieldType = 'fileupload';
							uploadElement.dataset.expectedFileType = expectedType;
							
							fileUploadFields.push({
								questionLabel,
								expectedFileType: expectedType,
								uploadElement,
								container
							});
							
							Logger.info(`📁 Found file upload field: "${questionLabel}" (expected: ${expectedType})`);
							break; // Found one, move to next container
						} else {
							Logger.debug(`  Element found but not visible`);
						}
					}
				}
			});
			
			Logger.info(`🔍 File upload detection complete: Found ${fileUploadFields.length} file upload fields`);
			return fileUploadFields;
		} catch (error) {
			Logger.error('Error detecting file upload fields directly:', error);
			return [];
		}
	}

	/**
	 * Add highlight styling to a file upload field container and set up click removal
	 * @param {Element} container - The field container element
	 * @param {Element} uploadElement - The upload button element
	 * @param {string} questionLabel - The question label text
	 */
	addHighlightToFileUploadField(container, uploadElement, questionLabel) {
		try {
			// Add highlight class to container
			container.classList.add('autofill-highlight-unfilled');
			Logger.debug(`Added highlight to file upload field: "${questionLabel}"`);
			
			// Add click listener to remove highlight when upload button is clicked
			const removeHighlightOnClick = () => {
				container.classList.remove('autofill-highlight-unfilled');
				Logger.debug(`Removed highlight from file upload field after click: "${questionLabel}"`);
			};
			
			// Add event listener to the upload button
			uploadElement.addEventListener('click', removeHighlightOnClick, { once: true });
			
			// Also listen for any changes in the container that might indicate file selection
			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					// Check if any new nodes were added that might indicate file selection
					if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
						for (const node of mutation.addedNodes) {
							if (node.nodeType === Node.ELEMENT_NODE) {
								// Look for file indicators (file names, upload progress, etc.)
								const hasFileIndicator = node.textContent?.includes('.') || // file extension
														 node.querySelector && (
															 node.querySelector('[data-filename]') ||
															 node.querySelector('.file-name') ||
															 node.querySelector('[role="progressbar"]')
														 );
								
								if (hasFileIndicator) {
									container.classList.remove('autofill-highlight-unfilled');
									Logger.debug(`Removed highlight from file upload field after file detection: "${questionLabel}"`);
									observer.disconnect();
									break;
								}
							}
						}
					}
				});
			});
			
			// Start observing for changes in the container
			observer.observe(container, { 
				childList: true, 
				subtree: true, 
				attributes: true,
				attributeFilter: ['class', 'style'] 
			});
			
		} catch (error) {
			Logger.error(`Error adding highlight to file upload field: ${error.message}`);
		}
	}

	/**
	 * Simple delay utility
	 * @param {number} ms - Milliseconds to delay
	 * @returns {Promise} Promise that resolves after delay
	 */
	delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	/**
	 * Remove all highlighting from unfilled fields
	 * @returns {Object} Result object with success status
	 */
	removeHighlights() {
		try {
			// Remove all highlight classes
			const highlightedElements = document.querySelectorAll('.autofill-highlight-unfilled');
			highlightedElements.forEach(element => {
				element.classList.remove('autofill-highlight-unfilled');
			});
			
			Logger.debug(`Removed highlights from ${highlightedElements.length} fields`);
			
			return {
				success: true,
				removedCount: highlightedElements.length
			};
		} catch (error) {
			Logger.error(`Error removing highlights: ${error.message}`);
			return {
				success: false,
				error: error.message
			};
		}
	}
}

try {
	globalThis.FormAutoFiller = FormAutoFiller;
} catch (e) {}



try {
	globalThis.FormAutoFiller = FormAutoFiller;
} catch (e) {}


