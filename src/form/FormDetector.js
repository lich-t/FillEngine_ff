"use strict";

class FormDetector {
	static findQuestionContainers() {
		let containers = [];

		for (const selector of CONFIG.containerSelectors) {
			const elements = document.querySelectorAll(selector);
			if (elements.length > 0) {
				const validContainers = Array.from(elements).filter((container) => {
					const hasInput = container.querySelector(
						[
							'input[type="text"]',
							'input[type="email"]',
							'input[type="tel"]',
							'input[type="date"]',
							"select",
							"textarea",
							'div[role="listbox"]',
							'div[role="radio"]',
							'div[role="checkbox"]',
							'span[role="radio"]',
							'span[role="checkbox"]',
						].join(", ")
					);
					const hasText =
						container.textContent && container.textContent.trim().length > 10;

					if (selector === "div") {
						const hasQuestionStructure =
							container.querySelector(
								"h1, h2, h3, h4, h5, h6, label, legend"
							) ||
							container.classList.contains("question") ||
							container.getAttribute("role") === "listitem";
						return hasInput && hasText && hasQuestionStructure;
					}

					return hasInput && hasText;
				});

				if (validContainers.length > 0) {
					containers = validContainers;
					Logger.info(
						`Found ${containers.length} question containers using selector: ${selector}`
					);
					break;
				}
			}
		}

		if (containers.length === 0) {
			const allDivs = document.querySelectorAll("div");
			containers = Array.from(allDivs).filter((div) => {
				const hasInput = div.querySelector(
					[
						'input[type="text"]',
						'input[type="email"]',
						'input[type="tel"]',
						'input[type="date"]',
						"select",
						"textarea",
						'div[role="listbox"]',
						'div[role="radio"]',
						'div[role="checkbox"]',
						'span[role="radio"]',
						'span[role="checkbox"]',
					].join(", ")
				);
				const hasText = div.textContent && div.textContent.trim().length > 10;
				const hasQuestionIndicators =
					div.querySelector("h1, h2, h3, h4, h5, h6, label") ||
					div.classList.contains("question") ||
					div.getAttribute("role");
				return hasInput && hasText && hasQuestionIndicators;
			});
			Logger.info(`Fallback: Found ${containers.length} question containers`);
		}

		return containers;
	}

	static extractQuestionLabel(container) {
		let questionText = "";

		for (const selector of CONFIG.questionTextSelectors) {
			const element = container.querySelector(selector);
			if (element && element.textContent.trim()) {
				questionText = element.textContent.trim();
				break;
			}
		}

		if (!questionText) {
			const walker = document.createTreeWalker(
				container,
				NodeFilter.SHOW_TEXT,
				{
					acceptNode: function (node) {
						const text = node.textContent.trim();
						if (text.length > 2 && !text.includes("*")) {
							return NodeFilter.FILTER_ACCEPT;
						}
						return NodeFilter.FILTER_SKIP;
					},
				}
			);

			const firstTextNode = walker.nextNode();
			if (firstTextNode) {
				questionText = firstTextNode.textContent.trim();
			}
		}

		return questionText
			.toLowerCase()
			.replace(/\s+/g, " ")
			.replace(/[*:?]/g, "")
			.trim();
	}

	static findInputField(container) {
		// First check for file upload fields
		const fileUploadField = this.detectFileUploadField(container);
		if (fileUploadField) {
			return fileUploadField;
		}

		let input = container.querySelector(
			[
				// Prefer role-based elements (Google Forms)
				'div[role="listbox"]', // GF select
				'div[role="radio"]',
				'div[role="checkbox"]',
				'span[role="radio"]',
				'span[role="checkbox"]',
				// GF select common wrapper classes
				'.jgvuAb',
				'.MocG8c',
				// Then standard controls
				"select",
				'input[type="date"]',
				'input[type="text"]',
				'input[type="email"]',
				'input[type="tel"]',
				"textarea",
				'input[type="radio"]',
				'input[type="checkbox"]',
			].join(", ")
		);

		if (!input) {
			const radioGroup = container.querySelector('div[role="radiogroup"]');
			if (radioGroup) {
				const firstRadio = radioGroup.querySelector('div[role="radio"]');
				if (firstRadio) return firstRadio;
			}

			const checkboxGroup = container.querySelector('div[role="group"]');
			if (checkboxGroup) {
				const firstCheckbox = checkboxGroup.querySelector(
					'div[role="checkbox"]'
				);
				if (firstCheckbox) return firstCheckbox;
			}

			const selectGroup =
				container.querySelector(".jgvuAb") ||
				container.querySelector('.MocG8c') ||
				container.querySelector('[role="listbox"]');
			if (selectGroup) {
				return selectGroup;
			}
		}

		if (!input) {
			const candidateInput = container.querySelector(
				'input:not([type]), input[type=""]'
			);
			if (candidateInput) {
				const parent =
					candidateInput.closest('[role="listitem"]') ||
					candidateInput.parentElement;
				const hasSpecialElements =
					parent &&
					parent.querySelector(
						'input[type="file"], input[type="submit"], input[type="button"], input[type="reset"]'
					);
				if (!hasSpecialElements) {
					input = candidateInput;
				}
			}
		}

		if (input) {
			const containerText = container.textContent.toLowerCase();
			const shouldSkip = ["captcha", "file upload", "signature pad"].some(
				(pattern) => containerText.includes(pattern)
			);

			if (shouldSkip) {
				Logger.debug(
					`Skipping container with unsupported functionality: ${containerText.substring(
						0,
						50
					)}...`
				);
				return null;
			}
		}

		return input;
	}

	/**
	 * Detect file upload fields in a container
	 * @param {Element} container - The container to search in
	 * @returns {Element|null} File upload element or null
	 */
	static detectFileUploadField(container) {
		try {
			Logger.debug('Checking container for file upload fields:', container);
			
			// Simple approach: look for any element containing "Ajouter un fichier" text
			const allElements = container.querySelectorAll('*');
			for (const element of allElements) {
				if (element.textContent && element.textContent.includes('Ajouter un fichier')) {
					Logger.debug(`Found element with "Ajouter un fichier" text:`, element);
					
					// Check if this element or its parent is clickable (role="button" or similar)
					let clickableElement = element;
					if (element.getAttribute('role') !== 'button') {
						// Look for parent with role="button"
						clickableElement = element.closest('[role="button"]') || element;
					}
					
					if (this.isElementVisible(clickableElement)) {
						// Mark as file upload type for later processing
						clickableElement.dataset.fieldType = 'fileupload';
						
						// Determine expected file type based on context
						const questionText = this.extractQuestionLabel(container);
						const expectedType = this.determineExpectedFileType(questionText, container);
						clickableElement.dataset.expectedFileType = expectedType;
						
						Logger.debug(`Found file upload field: ${questionText} (expected: ${expectedType})`);
						return clickableElement;
					} else {
						Logger.debug('Element with "Ajouter un fichier" found but not visible');
					}
				}
			}
			
			Logger.debug('No "Ajouter un fichier" text found in container');
			return null;
		} catch (error) {
			Logger.error('Error detecting file upload field:', error);
			return null;
		}
	}

	/**
	 * Check if element is visible
	 * @param {Element} element - Element to check
	 * @returns {boolean} True if visible
	 */
	static isElementVisible(element) {
		if (!element) return false;
		const rect = element.getBoundingClientRect();
		const style = window.getComputedStyle(element);
		return rect.width > 0 && rect.height > 0 && 
			   style.visibility !== 'hidden' && 
			   style.display !== 'none';
	}

	/**
	 * Determine expected file type from question context
	 * @param {string} questionText - The question text
	 * @param {Element} container - The container element
	 * @returns {string} Expected file type
	 */
	static determineExpectedFileType(questionText, container) {
		const text = (questionText + ' ' + container.textContent).toLowerCase();
		
		// Check for photo/image indicators
		const photoKeywords = CONFIG.fileTypeMapping.photo;
		if (photoKeywords.some(keyword => text.includes(keyword))) {
			return 'photo';
		}

		// Check for PDF/document indicators
		const pdfKeywords = CONFIG.fileTypeMapping.pdf;
		if (pdfKeywords.some(keyword => text.includes(keyword))) {
			return 'pdf';
		}
		
		// Check for specific document types from French text
		if (text.includes('cni') || text.includes('passeport') || text.includes('passport') || 
			text.includes('identité') || text.includes('identification')) {
			return 'document';
		}
		
		if (text.includes('cv') || text.includes('curriculum')) {
			return 'pdf';
		}

		return 'any';
	}
}

try {
	globalThis.FormDetector = FormDetector;
} catch (e) {}


try {
	globalThis.FormDetector = FormDetector;
} catch (e) {}


