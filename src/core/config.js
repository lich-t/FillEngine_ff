"use strict";

// Configuration et sélecteurs par défaut
const CONFIG = {
	minMatchScore: 0.7,
	containerSelectors: [
		'[data-params*="question"]',
		'[role="listitem"]',
		'.Qr7Oae[role="listitem"]', // Google Forms question container
		'.geS5n', // Google Forms question wrapper
		".m2",
		".freebirdFormviewerViewItemsItemItem",
		".Xb9hP",
		".AgroKb",
	],
	questionTextSelectors: [
		'[role="heading"]',
		'.M7eMe', // Google Forms question text
		'.HoXoMd[role="heading"]', // Google Forms heading with role
		".freebirdFormviewerViewItemsItemItemTitle",
		".AgroKb .M7eMe",
		'span[dir="auto"]',
		'div[dir="auto"]',
	],
	inputSelectors: [
		'input[type="text"]',
		'input[type="email"]',
		'input[type="tel"]',
		'input[type="date"]',
		"select",
		"textarea",
		'input[type="radio"]',
		'input[type="checkbox"]',
		'div[role="radio"]',
		'div[role="checkbox"]',
		'div[role="listbox"]',
		'span[role="radio"]',
		'span[role="checkbox"]',
	],
	skipFieldTypes: [
		"time",
		"datetime-local",
		"color",
		"range",
		"file",
		"submit",
		"button",
		"reset",
	],
	skipKeywords: ["sélectionn", "choisir"],
	// File upload configuration  
	fileUploadSelectors: [
		// Will be handled by custom text-based detection in FormDetector
	],
	fileTypeMapping: {
		photo: ['image', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'photo'],
		pdf: ['pdf', 'document', 'cv', 'curriculum'],
		document: ['cni', 'passeport', 'passport', 'identité', 'identification', 'piece']
	},
	fileUploadModalSelectors: {
		modal: 'iframe[src*="picker"], dialog[role="dialog"], .picker-dialog',
		recentTab: 'div[data-id="recent"], [aria-label*="Recent"], [aria-label*="Récents"]',
		fileList: '.picker-dataview, .picker-photos-albumsgrid, .docs-material-grid',
		loadingIndicator: '.picker-loading, .loading'
	},
	specialKeywords: {
		motifs: ["motifs", "raison", "passez-vous", "test", "académique"],
		signature: ["signer", "nom complet", "confirmez", "document", "veuillez"],
		engagement: ["engagement", "honneur", "responsabilité", "informations"],
		fileupload: ["fichier", "télécharger", "upload", "file", "document", "photo", "image", "pdf"]
	},
};

try {
	globalThis.CONFIG = CONFIG;
} catch (e) {}


