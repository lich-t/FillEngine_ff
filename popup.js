/**
 * Popup Script for Auto-Fill Google Forms Extension
 * Modern, minimal UI with clean interactions
 */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const fillFormBtn = document.getElementById("fillFormBtn");
  const buttonText = fillFormBtn.querySelector(".button-text");
  const statusDiv = document.getElementById("status");
  const statsDiv = document.getElementById("stats");
  const fieldsDetectedSpan = document.getElementById("fieldsDetected");
  const fieldsUnfilledSpan = document.getElementById("fieldsUnfilled");
  const fieldsFilledSpan = document.getElementById("fieldsFilled");
  const resultsDiv = document.getElementById("results");
  const csvFileInput = document.getElementById("csvFileInput");
  const fileStatus = document.getElementById("fileStatus");
  const userProfileDisplay = document.getElementById("userProfileDisplay");
  const profileName = document.getElementById("profileName");
  const profileDetails = document.getElementById("profileDetails");
  const profileId = document.getElementById("profileId");

  // New DOM Elements for profiles
  const profileModeBtn = document.getElementById("profileModeBtn");
  const csvModeBtn = document.getElementById("csvModeBtn");
  const profileSection = document.getElementById("profileSection");
  const csvSection = document.getElementById("csvSection");
  const profileSelect = document.getElementById("profileSelect");
  const refreshProfilesBtn = document.getElementById("refreshProfilesBtn");
  
  // Auto-fill settings elements
  const autoFillEnabled = document.getElementById("autoFillEnabled");

  console.log("🔧 DOM ELEMENTS FOUND:");
  console.log("├── fillFormBtn:", !!fillFormBtn);
  console.log("├── csvFileInput:", !!csvFileInput);
  console.log("├── fileStatus:", !!fileStatus);
  console.log("├── userProfileDisplay:", !!userProfileDisplay);
  console.log("├── profileModeBtn:", !!profileModeBtn);
  console.log("├── csvModeBtn:", !!csvModeBtn);
  console.log("├── profileSelect:", !!profileSelect);
  console.log("└── refreshProfilesBtn:", !!refreshProfilesBtn);

  // Configuration du stockage cloud
  const CLOUD_CONFIG = {
    // URL de votre Google Cloud Storage configuré
    baseUrl: "https://storage.googleapis.com/fillengine-profiles-prod",
    profilesFile: "profiles.csv",
    versionFile: "version.json",
    // Cache settings
    cacheKey: "cloudProfilesCache",
    versionKey: "profilesVersion",
    lastUpdateKey: "profilesLastUpdate",
    // Cache expiration: 24 heures en millisecondes
    cacheExpiration: 7 * 24 * 60 * 60 * 1000
  };

  // Current user data (will be updated when CSV is loaded or profile selected)
  let currentUserData = null;
  
  // Cloud profiles cache status
  let cloudProfilesStatus = {
    isLoading: false,
    lastAttempt: null,
    error: null
  };
  
  // Profile source tracking
  let profilesSource = 'unknown'; // 'cloud', 'cache', 'local', 'unknown'
  let profileSourceMetadata = {
    loadedAt: null,
    source: 'unknown',
    fallbackUsed: false,
    errorMessage: null
  };
  
  // Variables d'optimisation
  let resultUpdateTimer = null;
  let isUpdatingResults = false;

  /**
   * Debounced update function pour éviter les mises à jour trop fréquentes
   * @param {Array} results - Array of field fill results
   */
  function updateResultsDebounced(results) {
    if (isUpdatingResults) return;
    
    // Annuler le timer précédent
    if (resultUpdateTimer) {
      cancelAnimationFrame(resultUpdateTimer);
    }
    
    resultUpdateTimer = requestAnimationFrame(() => {
      isUpdatingResults = true;
      updateStats(results);
      showResults(results);
      isUpdatingResults = false;
    });
  }
  let currentMode = "profiles"; // "profiles" or "csv"
  let availableProfiles = [];

  /**
   * Load auto-fill settings from storage
   */
  async function loadAutoFillSettings() {
    try {
      const result = await chrome.storage.local.get('autoFillSettings');
      const settings = result.autoFillSettings || { enabled: true };
      
      autoFillEnabled.checked = settings.enabled;
      console.log("🔧 Auto-fill settings loaded:", settings);
      
      return settings;
    } catch (error) {
      console.error("Error loading auto-fill settings:", error);
      return { enabled: true };
    }
  }

  /**
   * Save auto-fill settings to storage
   */
  async function saveAutoFillSettings() {
    try {
      const settings = {
        enabled: autoFillEnabled.checked
      };
      
      await chrome.storage.local.set({ autoFillSettings: settings });
      console.log("💾 Auto-fill settings saved:", settings);
    } catch (error) {
      console.error("Error saving auto-fill settings:", error);
    }
  }

  /**
   * Save state to chrome storage
   * @param {string} selectedProfileId - ID of the selected profile
   * @param {string} mode - Current mode ("profiles" or "csv")
   */
  async function saveState(selectedProfileId = null, mode = currentMode) {
    try {
      const state = {
        selectedProfileId: selectedProfileId,
        mode: mode,
        timestamp: Date.now(),
      };

      await chrome.storage.local.set({ appState: state });
      console.log("💾 State saved:", state);
    } catch (error) {
      console.error("Error saving state:", error);
    }
  }

  /**
   * Load state from chrome storage
   * @returns {Object|null} Saved state or null if none exists
   */
  async function loadState() {
    try {
      const result = await chrome.storage.local.get("appState");
      const state = result.appState;

      if (state) {
        console.log("📖 State loaded:", state);
        return state;
      } else {
        console.log("📖 No saved state found, using defaults");
        return null;
      }
    } catch (error) {
      console.error("Error loading state:", error);
      return null;
    }
  }

  /**
   * Clear saved state
   */
  async function clearState() {
    try {
      await chrome.storage.local.remove("appState");
      console.log("🗑️ State cleared");
    } catch (error) {
      console.error("Error clearing state:", error);
    }
  }

  /**
   * Restore the saved state (mode and selected profile)
   */
  async function restoreSavedState() {
    try {
      const savedState = await loadState();

      if (!savedState) {
        console.log("📝 No saved state found, using defaults");
        // Save initial state
        await saveState(null, currentMode);
        return;
      }

      console.log("🔄 Restoring saved state...");
      console.log(`├── Restoring mode: ${savedState.mode}`);
      console.log(`└── Restoring selected profile: ${savedState.selectedProfileId}`);

      // Restore mode
      if (savedState.mode && savedState.mode !== currentMode) {
        switchMode(savedState.mode);
      }

      // Restore selected profile (only in profiles mode)
      if (savedState.mode === "profiles" && savedState.selectedProfileId) {
        // Wait for profiles to be loaded first
        await initializeProfilesMode();

        // Set the selected profile
        const profileOption = profileSelect.querySelector(`option[value="${savedState.selectedProfileId}"]`);
        if (profileOption) {
          profileSelect.value = savedState.selectedProfileId;
          handleProfileSelection(savedState.selectedProfileId);
          console.log(`✅ Restored profile: ${savedState.selectedProfileId}`);
        } else {
          console.warn(`Profile ${savedState.selectedProfileId} not found in available profiles`);
        }
      }
    } catch (error) {
      console.error("Error restoring saved state:", error);
    }
  }

  /**
   * Obtenir la version actuelle de l'extension
   * @returns {string} Version de l'extension
   */
  function getExtensionVersion() {
    return chrome.runtime.getManifest().version;
  }

  /**
   * Vérifier si une mise à jour des profils est nécessaire
   * @returns {Promise<boolean>} True si une mise à jour est nécessaire
   */
  async function shouldUpdateProfiles() {
    try {
      const result = await chrome.storage.local.get([
        CLOUD_CONFIG.versionKey,
        CLOUD_CONFIG.lastUpdateKey
      ]);
      
      const currentExtensionVersion = getExtensionVersion();
      const cachedVersion = result[CLOUD_CONFIG.versionKey];
      const lastUpdate = result[CLOUD_CONFIG.lastUpdateKey];
      
      console.log("🔍 Checking if profile update needed:");
      console.log("├── Current extension version:", currentExtensionVersion);
      console.log("├── Cached version:", cachedVersion);
      console.log("└── Last update:", lastUpdate ? new Date(lastUpdate).toISOString() : "Never");
      
      // Mise à jour nécessaire si :
      // 1. Pas de version en cache
      // 2. Version de l'extension différente
      // 3. Cache expiré (7j)
      if (!cachedVersion) {
        console.log("📥 Update needed: No cached version");
        return true;
      }
      
      if (cachedVersion !== currentExtensionVersion) {
        console.log("📥 Update needed: Extension version changed");
        return true;
      }
      
      if (!lastUpdate || (Date.now() - lastUpdate) > CLOUD_CONFIG.cacheExpiration) {
        console.log("📥 Update needed: Cache expired");
        return true;
      }
      
      console.log("✅ No update needed: Cache is valid");
      return false;
    } catch (error) {
      console.error("Error checking update necessity:", error);
      return true; // En cas d'erreur, forcer la mise à jour
    }
  }

  /**
   * Charger les profils depuis le cache local
   * @returns {Promise<Array|null>} Profils en cache ou null si pas de cache
   */
  async function loadProfilesFromCache() {
    try {
      const result = await chrome.storage.local.get(CLOUD_CONFIG.cacheKey);
      const cachedProfiles = result[CLOUD_CONFIG.cacheKey];
      
      if (cachedProfiles && Array.isArray(cachedProfiles)) {
        console.log("📦 Loaded profiles from cache:", cachedProfiles.length, "profiles");
        profilesSource = 'cache';
        profileSourceMetadata = {
          loadedAt: Date.now(),
          source: 'cache',
          fallbackUsed: false,
          errorMessage: null
        };
        return cachedProfiles;
      }
      
      console.log("📦 No valid profiles found in cache");
      return null;
    } catch (error) {
      console.error("Error loading profiles from cache:", error);
      return null;
    }
  }

  /**
   * Sauvegarder les profils dans le cache local
   * @param {Array} profiles - Profils à mettre en cache
   */
  async function saveProfilesToCache(profiles) {
    try {
      const currentVersion = getExtensionVersion();
      const now = Date.now();
      
      await chrome.storage.local.set({
        [CLOUD_CONFIG.cacheKey]: profiles,
        [CLOUD_CONFIG.versionKey]: currentVersion,
        [CLOUD_CONFIG.lastUpdateKey]: now
      });
      
      console.log("💾 Profiles saved to cache:");
      console.log("├── Profiles count:", profiles.length);
      console.log("├── Version:", currentVersion);
      console.log("└── Timestamp:", new Date(now).toISOString());
    } catch (error) {
      console.error("Error saving profiles to cache:", error);
    }
  }

  /**
   * Charger les profils depuis Google Cloud Storage
   * @returns {Promise<Array>} Array of profile objects
   */
  async function loadProfilesFromCloud() {
    try {
      console.log("☁️ Loading profiles from cloud storage...");
      
      const profilesUrl = `${CLOUD_CONFIG.baseUrl}/${CLOUD_CONFIG.profilesFile}`;
      console.log("├── URL:", profilesUrl);
      
      const response = await fetch(profilesUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvContent = await response.text();
      console.log("├── Content length:", csvContent.length);
      
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error("Empty response from cloud storage");
      }
      
      const profiles = parseProfilesCSV(csvContent);
      console.log("✅ Profiles loaded from cloud:", profiles.length, "profiles");
      
      profilesSource = 'cloud';
      profileSourceMetadata = {
        loadedAt: Date.now(),
        source: 'cloud',
        fallbackUsed: false,
        errorMessage: null
      };
      
      return profiles;
    } catch (error) {
      console.error("❌ Error loading profiles from cloud:", error);
      profileSourceMetadata.errorMessage = error.message;
      throw new Error(`Impossible de charger les profils depuis le cloud: ${error.message}`);
    }
  }

  /**
   * Load and parse the profiles database (cloud-first with cache)
   * @returns {Promise<Array>} Array of profile objects
   */
  async function loadProfilesDatabase() {
    try {
      console.log("🚀 Loading profiles database...");
      
      // Vérifier si une mise à jour est nécessaire
      const needsUpdate = await shouldUpdateProfiles();
      
      if (!needsUpdate) {
        // Utiliser le cache si disponible
        const cachedProfiles = await loadProfilesFromCache();
        if (cachedProfiles) {
          console.log("✅ Using cached profiles");
          return cachedProfiles;
        }
      }
      
      // Charger depuis le cloud
      console.log("☁️ Loading fresh profiles from cloud...");
      const cloudProfiles = await loadProfilesFromCloud();
      
      // Sauvegarder en cache
      await saveProfilesToCache(cloudProfiles);
      
      return cloudProfiles;
      
    } catch (cloudError) {
      console.warn("⚠️ Cloud loading failed, trying cache fallback...");
      
      // Fallback vers le cache en cas d'erreur cloud
      const cachedProfiles = await loadProfilesFromCache();
      if (cachedProfiles) {
        console.log("🔄 Using cached profiles as fallback");
        profileSourceMetadata.fallbackUsed = true;
        return cachedProfiles;
      }
      
      // Fallback vers le fichier local si disponible
      try {
        console.log("🔄 Trying local file fallback...");
        const response = await fetch(chrome.runtime.getURL("profiles.csv"));
        if (response.ok) {
          const csvContent = await response.text();
          const localProfiles = parseProfilesCSV(csvContent);
          console.log("✅ Using local file fallback:", localProfiles.length, "profiles");
          
          profilesSource = 'local';
          profileSourceMetadata = {
            loadedAt: Date.now(),
            source: 'local',
            fallbackUsed: true,
            errorMessage: cloudError.message
          };
          
          return localProfiles;
        }
      } catch (localError) {
        console.log("❌ Local fallback failed:", localError.message);
      }
      
      // Si aucun fallback disponible
      console.error("❌ No profiles available from any source");
      throw new Error("Impossible de charger les profils (cloud, cache et local indisponibles)");
    }
  }

  /**
   * Forcer le rafraîchissement des profils depuis le cloud
   * @param {boolean} showFeedback - Afficher un feedback à l'utilisateur
   */
  async function forceRefreshProfiles(showFeedback = true) {
    try {
      // Mettre à jour l'état du bouton de rafraîchissement
      if (refreshProfilesBtn) {
        refreshProfilesBtn.disabled = true;
        refreshProfilesBtn.classList.add('loading');
        refreshProfilesBtn.title = "Rafraîchissement en cours...";
      }
      
      if (showFeedback) {
        showStatus("Mise à jour des profils...", "info");
      }
      
      console.log("🔄 Forcing profiles refresh from cloud...");
      
      // Vider le cache pour forcer le rechargement
      await chrome.storage.local.remove([
        CLOUD_CONFIG.cacheKey,
        CLOUD_CONFIG.versionKey,
        CLOUD_CONFIG.lastUpdateKey
      ]);
      
      // Recharger les profils
      availableProfiles = await loadProfilesFromCloud();
      
      // Sauvegarder en cache
      await saveProfilesToCache(availableProfiles);
      
      // Mettre à jour l'interface
      populateProfileSelect(availableProfiles);
      
      if (showFeedback) {
        showStatus(`✅ Profils mis à jour: ${availableProfiles.length} profils chargés`, "success");
        setTimeout(() => hideStatus(), 3000);
      }
      
      console.log("✅ Profiles refreshed successfully:", availableProfiles.length, "profiles");
      
    } catch (error) {
      console.error("Error refreshing profiles:", error);
      
      if (showFeedback) {
        showStatus(`Erreur de mise à jour: ${error.message}`, "error");
      }
      
      // Fallback vers le cache en cas d'erreur
      const cachedProfiles = await loadProfilesFromCache();
      if (cachedProfiles) {
        availableProfiles = cachedProfiles;
        populateProfileSelect(availableProfiles);
        
        if (showFeedback) {
          showStatus("⚠️ Utilisation des profils en cache", "info");
        }
      }
    } finally {
      // Restaurer l'état du bouton de rafraîchissement
      if (refreshProfilesBtn) {
        refreshProfilesBtn.disabled = false;
        refreshProfilesBtn.classList.remove('loading');
        refreshProfilesBtn.title = "Rafraîchir les profils depuis le cloud";
      }
    }
  }

  /**
   * Déclencher automatiquement le rafraîchissement lors de la mise à jour de l'extension
   * @returns {Promise<boolean>} True si un rafraîchissement a été déclenché
   */
  async function checkAndTriggerAutoRefresh() {
    try {
      console.log("🔍 Checking for extension update...");
      
      // Vérifier si l'extension a été mise à jour via background.js
      const extensionUpdateCheck = await chrome.storage.local.get(['extensionUpdated', 'updateTimestamp']);
      
      if (extensionUpdateCheck.extensionUpdated) {
        console.log("🔄 Extension update flag detected, forcing refresh...");
        
        // Nettoyer le flag de mise à jour
        await chrome.storage.local.remove(['extensionUpdated', 'updateTimestamp']);
        
        // Déclencher le rafraîchissement forcé
        await forceRefreshProfiles(false);
        
        // Afficher un message de mise à jour automatique
        showStatus("🆕 Profils mis à jour automatiquement après mise à jour de l'extension", "success");
        setTimeout(() => hideStatus(), 3000);
        
        return true;
      }
      
      // Vérifier si une mise à jour est nécessaire (logique existante)
      const needsUpdate = await shouldUpdateProfiles();
      
      if (needsUpdate) {
        console.log("🔄 Standard update needed, triggering auto-refresh...");
        
        // Déclencher le rafraîchissement automatique (sans feedback visuel excessif)
        await forceRefreshProfiles(false);
        
        // Afficher un message discret de mise à jour
        showStatus("🆕 Profils mis à jour automatiquement", "success");
        setTimeout(() => hideStatus(), 2000);
        
        return true;
      }
      
      console.log("✅ No extension update detected");
      return false;
      
    } catch (error) {
      console.error("Error during auto-refresh check:", error);
      return false;
    }
  }
  window.debugCloudProfiles = async function() {
    console.log("🧪 === DEBUG CLOUD PROFILES ===");
    console.log("📍 URL:", `${CLOUD_CONFIG.baseUrl}/${CLOUD_CONFIG.profilesFile}`);
    
    try {
      // Test de connectivité
      console.log("🔄 Testing cloud connectivity...");
      const testResponse = await fetch(`${CLOUD_CONFIG.baseUrl}/${CLOUD_CONFIG.profilesFile}`, {
        method: 'HEAD'
      });
      console.log("📊 HEAD Status:", testResponse.status, testResponse.statusText);
      
      // Test de chargement complet
      console.log("🔄 Testing full load...");
      const profiles = await loadProfilesFromCloud();
      console.log("✅ Profiles loaded:", profiles.length);
      console.log("📋 First profile:", profiles[0]);
      
      return profiles;
    } catch (error) {
      console.error("❌ Debug failed:", error);
      
      // Test fallback cache
      console.log("🔄 Testing cache fallback...");
      const cached = await loadProfilesFromCache();
      if (cached) {
        console.log("✅ Cache fallback works:", cached.length, "profiles");
        return cached;
      } else {
        console.log("❌ No cache available");
      }
      
      throw error;
    }
  };

  /**
   * Parse profiles CSV content and convert to array of profile objects
   * @param {string} csvContent - Raw CSV content with multiple profiles
   * @returns {Array} Array of parsed profile objects
   */
  function parseProfilesCSV(csvContent) {
    try {
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV doit contenir au moins 2 lignes (en-tête + données)");
      }

      // Improved CSV parsing to handle quoted values
      function parseCSVLine(line) {
        const result = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"' && (i === 0 || line[i - 1] === ",")) {
            inQuotes = true;
          } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i + 1] === ",")) {
            inQuotes = false;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map((value) => value.replace(/^"(.*)"$/, "$1")); // Remove outer quotes
      }

      const headers = parseCSVLine(lines[0]);
      const profiles = [];

      console.log("📋 CSV Headers found:", headers);

      // Parse each profile line
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        if (headers.length !== values.length) {
          console.warn(
            `Ligne ${i + 1}: Nombre d'en-têtes (${headers.length}) ne correspond pas au nombre de valeurs (${values.length})`
          );
          continue;
        }

        const profile = parseProfileFromValues(headers, values);
        if (profile) {
          profiles.push(profile);
        }
      }

      console.log(`✅ Parsed ${profiles.length} profiles from database`);
      return profiles;
    } catch (error) {
      console.error("Erreur de parsing du CSV des profils:", error);
      throw error;
    }
  }

  /**
   * Parse a single profile from headers and values
   * @param {Array} headers - CSV headers
   * @param {Array} values - CSV values for this profile
   * @returns {Object|null} Parsed profile object or null if error
   */
  function parseProfileFromValues(headers, values) {
    try {
      // Create user profile object
      const userProfile = {
        id: null,
        personal: {},
        contact: {},
        location: {},
        documents: {},
        family: {},
        languages: {},
        professional: {},
        medical: {},
        dates: {},
        misc: {},
        choices: {},
      };

      // Map CSV fields to user profile structure
      const fieldMapping = {
        id: ["id"],
        lastName: ["personal", "lastName"],
        firstName: ["personal", "firstName"],
        fullName: ["personal", "fullName"],
        gender: ["personal", "gender"],
        sex: ["personal", "sex"],
        email: ["contact", "email"],
        phone: ["contact", "phone"],
        mobile: ["contact", "mobile"],
        birthPlace: ["location", "birthPlace"],
        birthCountry: ["location", "birthCountry"],
        residence: ["location", "residence"],
        residenceCountry: ["location", "residenceCountry"],
        nationality: ["location", "nationality"],
        address: ["location", "address"],
        idNumber: ["documents", "idNumber"],
        passportNumber: ["documents", "passportNumber"],
        cniNumber: ["documents", "cniNumber"],
        fatherName: ["family", "fatherName"],
        motherName: ["family", "motherName"],
        usualLanguage: ["languages", "usual"],
        motherLanguage: ["languages", "mother"],
        profession: ["professional", "profession"],
        company: ["professional", "company"],
        academicReason: ["professional", "academicReason"],
        disabilities: ["medical", "disabilities"],
        birthDate: ["dates", "birthDate"],
        idExpirationDate: ["dates", "idExpirationDate"],
        idIssuanceDate: ["dates", "idIssuanceDate"],
        examSubjects: ["misc", "examSubjects"],
        idType: ["choices", "idType"],
        examTypes: ["choices", "examTypes"],
        hasDisabilities: ["choices", "hasDisabilities"],
        agreement: ["choices", "agreement"],
        termsAccepted: ["choices", "termsAccepted"],
        preferredLanguage: ["choices", "preferredLanguage"],
        hasExperience: ["choices", "hasExperience"],
        needsAccommodation: ["choices", "needsAccommodation"],
        isFirstTime: ["choices", "isFirstTime"],
      };

      // Populate user profile
      let fieldsProcessed = 0;
      headers.forEach((header, index) => {
        console.log(`Processing field ${index}: ${header} = "${values[index]}"`);
        const mapping = fieldMapping[header];
        if (mapping && values[index] !== undefined && values[index] !== "") {
          let value = values[index];

          // Handle special data types
          if ((header === "examTypes" || header === "examSubjects") && value.includes(",")) {
            console.log(`Splitting comma-separated value for ${header}: "${value}"`);
            value = value.split(",").map((v) => v.trim());
            console.log(`Result after split:`, value);
          } else if (["agreement", "termsAccepted", "hasExperience", "needsAccommodation", "isFirstTime"].includes(header)) {
            console.log(`Converting boolean for ${header}: "${value}" -> ${value.toLowerCase() === "true"}`);
            value = value.toLowerCase() === "true";
          } else if (header === "hasDisabilities") {
            // Special handling for hasDisabilities - can be boolean or text description
            console.log(`Processing hasDisabilities: "${value}"`);
            if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
              value = value.toLowerCase() === "true";
            } else if (value.toLowerCase() === "aucun" || value.toLowerCase() === "none") {
              value = false;
            } else {
              // Keep as text if it's a description
              value = value;
            }
            console.log(`hasDisabilities result:`, value);
          }

          if (mapping.length === 1) {
            userProfile[mapping[0]] = value;
          } else {
            const [category, field] = mapping;
            userProfile[category][field] = value;

            // Auto-create examTypesFull when examTypes is processed
            if (field === "examTypes" && Array.isArray(value)) {
              const examTypesMapping = {
                CE: "Compréhension écrite",
                CO: "Compréhension orale",
                EE: "Expression écrite",
                EO: "Expression orale",
              };
              const fullNames = value.map((code) => examTypesMapping[code] || code);
              userProfile[category]["examTypesFull"] = fullNames;
              console.log(`Auto-created examTypesFull:`, fullNames);
            }

            // Auto-create examSubjectsFull when examSubjects is processed
            if (field === "examSubjects" && Array.isArray(value)) {
              userProfile.misc["examSubjectsFull"] = value;
              console.log(`Auto-created examSubjectsFull:`, value);
            }
          }
          fieldsProcessed++;
          console.log(`✅ Processed field ${header}, total: ${fieldsProcessed}`);
        } else if (mapping) {
          console.log(`⚠️ Empty value for field: ${header}`);
        } else {
          console.warn(`❌ Unknown field in CSV: ${header}`);
        }
      });

      console.log(`Successfully processed ${fieldsProcessed} fields from CSV`);
      console.log("Final user profile:", userProfile);

      // For CSV upload mode, we don't need an ID, so only check if we have processed fields
      if (fieldsProcessed === 0) {
        console.warn("Profil ignoré: aucun champ valide trouvé");
        return null;
      }

      // If no ID is provided (CSV upload mode), generate a temporary one
      if (!userProfile.id) {
        userProfile.id = `csv_upload_${Date.now()}`;
      }

      return userProfile;
    } catch (error) {
      console.error("Erreur lors du parsing du profil:", error);
      return null;
    }
  }

  /**
   * Switch between profiles and CSV upload modes
   * @param {string} mode - "profiles" or "csv"
   */
  function switchMode(mode) {
    currentMode = mode;

    if (mode === "profiles") {
      profileModeBtn.classList.add("active");
      csvModeBtn.classList.remove("active");
      profileSection.classList.remove("hidden");
      csvSection.classList.add("hidden");

      console.log("🔄 Switched to profiles mode");
    } else {
      csvModeBtn.classList.add("active");
      profileModeBtn.classList.remove("active");
      csvSection.classList.remove("hidden");
      profileSection.classList.add("hidden");

      console.log("🔄 Switched to CSV upload mode");
    }

    // Reset current data when switching modes
    currentUserData = null;
    hideUserProfile();
    updateFillButtonState();

    // Save the new mode to storage
    saveState(null, mode);
  }

  /**
   * Initialize profiles mode by loading the built-in database
   */
  async function initializeProfilesMode() {
    try {
      console.log("🚀 Initializing profiles mode...");

      // Load profiles from database
      availableProfiles = await loadProfilesDatabase();

      // Populate the dropdown
      populateProfileSelect(availableProfiles);

      console.log("✅ Profiles mode initialized successfully");
    } catch (error) {
      console.error("Error initializing profiles mode:", error);
      showStatus("Erreur lors du chargement des profils", "error");
    }
  }

  /**
   * Populate the profile selection dropdown
   * @param {Array} profiles - Array of profile objects
   */
  function populateProfileSelect(profiles) {
    profileSelect.innerHTML = '<option value="">-- Choisir un profil --</option>';

    profiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;

      const name =
        profile.personal?.fullName ||
        `${profile.personal?.firstName || ""} ${profile.personal?.lastName || ""}`.trim() ||
        `Profil ${profile.id}`;

      const profession = profile.professional?.profession || "";
      const company = profile.professional?.company || "";

      // Add source indicator to profile name
      let sourceIcon = '';
      let sourceText = '';
      
      switch (profilesSource) {
        case 'cloud':
          sourceIcon = '☁️';
          sourceText = profileSourceMetadata.fallbackUsed ? ' (Cloud/Fallback)' : ' (Cloud)';
          option.className = 'cloud-profile';
          break;
        case 'cache':
          sourceIcon = '📦';
          sourceText = ' (Cache)';
          option.className = 'cache-profile';
          break;
        case 'local':
          sourceIcon = '📝';
          sourceText = ' (Local)';
          option.className = 'local-profile';
          break;
        default:
          sourceIcon = '❓';
          sourceText = ' (Unknown)';
      }

      let displayText = `${sourceIcon} [${profile.id}] ${name}`;
      if (profession) {
        displayText += ` - ${profession}`;
      }
      displayText += sourceText;

      option.textContent = displayText;
      option.dataset.profile = JSON.stringify(profile);
      option.dataset.source = profilesSource;

      profileSelect.appendChild(option);
    });

    console.log(`✅ Populated profile selector with ${profiles.length} profiles from ${profilesSource}`);
  }

  /**
   * Handle profile selection
   * @param {string} profileId - Selected profile ID
   */
  function handleProfileSelection(profileId) {
    if (!profileId) {
      currentUserData = null;
      hideUserProfile();
      updateFillButtonState();
      // Clear saved profile ID
      saveState(null, currentMode);
      return;
    }

    const selectedOption = profileSelect.querySelector(`option[value="${profileId}"]`);
    if (!selectedOption) {
      console.error("Profile not found:", profileId);
      return;
    }

    try {
      const profile = JSON.parse(selectedOption.dataset.profile);
      currentUserData = profile;

      console.log("✅ Profile selected:", profile.id);
      console.log("├── Name:", profile.personal?.fullName);
      console.log("├── Email:", profile.contact?.email);
      console.log("└── Profession:", profile.professional?.profession);

      // Update main profile display
      updateProfileDisplay(profile);

      // Update fill button state
      updateFillButtonState();

      // Save selected profile ID to storage
      saveState(profileId, currentMode);
    } catch (error) {
      console.error("Error parsing selected profile:", error);
      currentUserData = null;
      updateFillButtonState();
    }
  }

  /**
   * Update the user profile display section
   * @param {Object} userData - User data object to display
   */
  function updateProfileDisplay(userData) {
    if (!userData) {
      hideUserProfile();
      return;
    }

    const name =
      userData.personal?.fullName ||
      `${userData.personal?.firstName || ""} ${userData.personal?.lastName || ""}`.trim() ||
      "Utilisateur";
    const email = userData.contact?.email || "";
    const profession = userData.professional?.profession || "";

    profileName.textContent = name;

    // Display profile ID if available
    if (userData.id) {
      profileId.textContent = `ID: ${userData.id}`;
      profileId.style.display = "inline-block";
    } else {
      profileId.style.display = "none";
    }

    // Clear existing content
    profileDetails.innerHTML = '';
    
    // Create elements safely
    if (email) {
      const emailDiv = document.createElement('div');
      emailDiv.textContent = `📧 ${email}`;
      profileDetails.appendChild(emailDiv);
    }
    if (profession) {
      const professionDiv = document.createElement('div');
      professionDiv.textContent = `💼 ${profession}`;
      profileDetails.appendChild(professionDiv);
    }
    if (userData.location?.nationality) {
      const nationalityDiv = document.createElement('div');
      nationalityDiv.textContent = `🌍 ${userData.location.nationality}`;
      profileDetails.appendChild(nationalityDiv);
    }
    
    // Apply source-specific styling to the profile display
    userProfileDisplay.className = 'user-profile';
    if (currentMode === 'profiles') {
      switch (profilesSource) {
        case 'cloud':
          userProfileDisplay.classList.add('cloud-source');
          break;
        case 'cache':
          userProfileDisplay.classList.add('cache-source');
          break;
        case 'local':
          userProfileDisplay.classList.add('local-source');
          break;
      }
    } else if (currentMode === 'csv' && profilesSource === 'csv-upload') {
      userProfileDisplay.classList.add('csv-upload-source');
    }
    
    // Add source badge to profile header
    const profileHeaderSpan = document.querySelector('.profile-header span:first-child');
    if (profileHeaderSpan) {
      // Remove existing badge
      const existingBadge = profileHeaderSpan.querySelector('.profile-source-badge');
      if (existingBadge) {
        existingBadge.remove();
      }
      
      // Add new source badge
      const badge = document.createElement('span');
      let badgeClass = '';
      let badgeText = '';
      
      if (currentMode === 'profiles') {
        badgeClass = `profile-source-badge ${profilesSource}`;
        switch (profilesSource) {
          case 'cloud':
            badgeText = profileSourceMetadata.fallbackUsed ? 'CLOUD*' : 'CLOUD';
            break;
          case 'cache':
            badgeText = 'CACHE';
            break;
          case 'local':
            badgeText = 'LOCAL';
            break;
          default:
            badgeText = '?';
        }
      } else if (currentMode === 'csv' && profilesSource === 'csv-upload') {
        badgeClass = 'profile-source-badge csv-upload';
        badgeText = 'CSV';
      }
      
      if (badgeText) {
        badge.className = badgeClass;
        badge.textContent = badgeText;
        profileHeaderSpan.appendChild(badge);
      }
    }
    
    userProfileDisplay.style.display = "block";

    console.log("✅ Profile display updated with source:", profilesSource);
  }

  /**
   * Hide the user profile display
   */
  function hideUserProfile() {
    userProfileDisplay.style.display = "none";
  }

  /**
   * Check if the current tab is a Google Forms page
   * @returns {Promise<boolean>} True if it's a Google Forms page
   */
  async function isGoogleFormsPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab.url && tab.url.includes("docs.google.com/forms");
    } catch (error) {
      console.error("Error checking page:", error);
      return false;
    }
  }

  /**
   * Update fill button state based on current data and page
   */
  async function updateFillButtonState() {
    try {
      console.log("🔄 Updating button state...");
      console.log("├── Current mode:", currentMode);
      console.log("├── Current user data exists:", !!currentUserData);
      console.log("└── User data:", currentUserData);

      const isFormsPage = await isGoogleFormsPage();
      console.log("├── Is Google Forms page:", isFormsPage);

      if (!isFormsPage) {
        fillFormBtn.disabled = true;
        fillFormBtn.style.background = "#f1f3f5";
        fillFormBtn.style.color = "#9ca3af";
        fillFormBtn.title = "Naviguez vers une page Google Forms";
        showStatus("Page Google Forms requise", "error");
        console.log("❌ Button disabled: Not on Google Forms page");
      } else if (!currentUserData) {
        fillFormBtn.disabled = true;
        fillFormBtn.style.background = "#f1f3f5";
        fillFormBtn.style.color = "#9ca3af";

        if (currentMode === "profiles") {
          fillFormBtn.title = "Sélectionnez d'abord un profil";
          // Only show status if no other status is currently displayed
          if (!statusDiv.textContent || statusDiv.style.display === "none") {
            showStatus("Sélectionnez un profil pour continuer", "info");
          }
          console.log("❌ Button disabled: No profile selected");
        } else {
          fillFormBtn.title = "Chargez d'abord un fichier CSV";
          // Only show status if no other status is currently displayed
          if (!statusDiv.textContent || statusDiv.style.display === "none") {
            showStatus("Chargez un fichier CSV pour continuer", "info");
          }
          console.log("❌ Button disabled: No CSV data");
        }
      } else {
        fillFormBtn.disabled = false;
        fillFormBtn.style.background = "";
        fillFormBtn.style.color = "";
        fillFormBtn.title = "";
        hideStatus();
        console.log("✅ Button enabled: Ready to fill form");
      }
    } catch (error) {
      console.error("Error updating button state:", error);
    }
  }

  /**
   * Show status message
   * @param {string} message - Status message
   * @param {string} type - Status type ("success", "error", "info")
   */
  function showStatus(message, type = "info") {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = "block";
  }

  /**
   * Hide status message
   */
  function hideStatus() {
    statusDiv.style.display = "none";
  }

  /**
   * CSV File handling for upload mode
   */
  function handleCSVFile(event) {
    const file = event.target.files[0];
    if (!file) {
      currentUserData = null;
      hideUserProfile();
      updateFillButtonState();
      return;
    }

    console.log("📄 CSV file selected:", file.name, `(${file.size} bytes)`);

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showStatus("Veuillez sélectionner un fichier CSV", "error");
      currentUserData = null;
      updateFillButtonState();
      return;
    }

    // Show loading status
    showStatus("Chargement du fichier...", "info");

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const csvContent = e.target.result;
        console.log("📄 CSV content loaded, parsing...");

        const userData = parseCSV(csvContent);

        if (userData) {
          currentUserData = userData;
          console.log("✅ CSV parsed successfully:", userData);

          // Set source for CSV upload
          profilesSource = 'csv-upload';
          profileSourceMetadata = {
            loadedAt: Date.now(),
            source: 'csv-upload',
            fallbackUsed: false,
            errorMessage: null
          };

          // Save CSV data to cache for automatic filling
          try {
            await chrome.storage.local.set({ lastCsvData: userData });
            console.log("💾 CSV data saved to cache for auto-fill");
          } catch (cacheError) {
            console.warn("Failed to save CSV data to cache:", cacheError);
          }

          // Update profile display
          updateProfileDisplay(userData);

          // Show success message
          const fieldCount =
            Object.keys(userData.personal || {}).length +
            Object.keys(userData.contact || {}).length +
            Object.keys(userData.location || {}).length +
            Object.keys(userData.choices || {}).length;

          showStatus(`✅ Fichier CSV chargé avec succès! ${fieldCount} champs détectés`, "success");

          // Auto-hide success message after 3 seconds to not interfere with button state
          setTimeout(() => {
            if (currentUserData) {
              hideStatus();
            }
          }, 3000);
        } else {
          throw new Error("Aucune donnée valide trouvée dans le CSV");
        }
      } catch (error) {
        console.error("Erreur de parsing CSV:", error);
        showStatus(`❌ Erreur CSV: ${error.message}`, "error");
        currentUserData = null;
        hideUserProfile();
      }

      // Always update button state at the end
      updateFillButtonState();
    };

    reader.onerror = function () {
      console.error("Erreur de lecture du fichier");
      showStatus("❌ Erreur lors de la lecture du fichier", "error");
      currentUserData = null;
      hideUserProfile();
      updateFillButtonState();
    };

    reader.readAsText(file, "UTF-8");
  }

  /**
   * Parse CSV content and return user data
   * @param {string} csvContent - Raw CSV content
   * @returns {Object|null} Parsed user data or null if error
   */
  function parseCSV(csvContent) {
    try {
      const lines = csvContent
        .trim()
        .split("\n")
        .filter((line) => line.trim().length > 0);
      console.log(`📋 CSV Lines found: ${lines.length}`);

      if (lines.length < 2) {
        throw new Error("CSV doit contenir au moins 2 lignes (en-tête + données)");
      }

      // Improved CSV parsing to handle quoted values with commas
      function parseCSVLine(line) {
        const result = [];
        let current = "";
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
          const char = line[i];

          if (char === '"') {
            if (!inQuotes) {
              // Starting quotes
              inQuotes = true;
            } else if (i + 1 < line.length && line[i + 1] === '"') {
              // Escaped quotes ("")
              current += '"';
              i++; // Skip next quote
            } else {
              // Ending quotes
              inQuotes = false;
            }
          } else if (char === "," && !inQuotes) {
            // Field separator (not in quotes)
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
          i++;
        }

        // Add the last field
        result.push(current.trim());

        // Clean up quotes from fields
        return result.map((field) => {
          // Remove surrounding quotes if they exist
          if (field.startsWith('"') && field.endsWith('"')) {
            return field.slice(1, -1);
          }
          return field;
        });
      }

      const headers = parseCSVLine(lines[0]);
      console.log("📋 CSV Headers:", headers);
      console.log(`📋 Headers count: ${headers.length}`);

      // Parse all data lines (skip header)
      const allUserData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        console.log(`📋 CSV Line ${i} Values (first 5):`, values.slice(0, 5));
        console.log(`📋 Line ${i} - Headers: ${headers.length}, Values: ${values.length}`);

        if (headers.length !== values.length) {
          console.error(`Line ${i} mismatch details:`);
          console.error("Headers:", headers);
          console.error("Values:", values);
          throw new Error(
            `Ligne ${i}: Nombre d'en-têtes (${headers.length}) ne correspond pas au nombre de valeurs (${values.length})`
          );
        }

        // Use the same parsing logic as profiles
        const userData = parseProfileFromValues(headers, values);

        if (!userData) {
          throw new Error(`Impossible de parser les données de la ligne ${i}`);
        }

        allUserData.push(userData);
        console.log(`✅ Parsed user data line ${i}:`, userData);
      }

      // For now, return the first user data (single user mode)
      // TODO: In the future, could support multiple profiles
      if (allUserData.length === 0) {
        throw new Error("Aucune donnée utilisateur trouvée");
      }

      console.log(`✅ Successfully parsed ${allUserData.length} user record(s)`);
      return allUserData[0]; // Return first profile for now
    } catch (error) {
      console.error("Erreur de parsing CSV:", error);
      throw error;
    }
  }

  /**
   * Keep popup open during operations
   */
  function keepPopupOpen() {
    // Prevent popup from closing during operations
    document.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  /**
   * Main form filling function
   */
  async function fillForm() {
    if (!currentUserData) {
      showStatus("Aucune donnée utilisateur disponible", "error");
      return;
    }

    try {
      // Visual feedback
      fillFormBtn.disabled = true;
      buttonText.textContent = "Remplissage...";
      showStatus("Remplissage du formulaire en cours...", "info");
      hideResults();

      console.log("🚀 Starting form fill process");
      console.log("User data:", currentUserData);

      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "fillForm",
        userData: currentUserData,
      });

      if (response && response.success) {
        console.log("✅ Form filled successfully");
        console.log("Results:", response.results);

        // Update UI with results - note: response.results should be the stats object
        let resultsData = null;
        let filledCount = 0;
        
        if (response.results && response.results.detectionResults) {
          resultsData = response.results.detectionResults;
        } else if (Array.isArray(response.results)) {
          resultsData = response.results;
        }
        
        if (resultsData) {
          // Optimisation: traitement avec debouncing
          updateResultsDebounced(resultsData);
          
          // Calculer filledCount en une seule passe
          for (let i = 0; i < resultsData.length; i++) {
            if (resultsData[i].matched) {
              filledCount++;
            }
          }
        } else {
          filledCount = response.results.fieldsFilled || 0;
        }

        // Create success message
        let successMessage = `Formulaire rempli avec succès! ${filledCount} champs remplis`;

        showStatus(successMessage, "success");
      } else {
        throw new Error(response?.error || "Erreur lors du remplissage");
      }
    } catch (error) {
      console.error("Error filling form:", error);
      showStatus(`Erreur: ${error.message}`, "error");
    } finally {
      // Reset button state
      fillFormBtn.disabled = false;
      buttonText.textContent = "Remplir le formulaire";
      updateFillButtonState();
    }
  }

  /**
   * Update statistics display
   * @param {Array} results - Array of field fill results
   */
  function updateStats(results) {
    const totalFields = results.length;
    let unfilledFields = 0;
    let filledFields = 0;
    
    // Optimisation: une seule itération au lieu de 3 filter()
    for (let i = 0; i < totalFields; i++) {
      if (results[i].matched) {
        filledFields++;
      } else {
        unfilledFields++;
      }
    }

    // Mise à jour en batch pour éviter les reflows multiples
    fieldsDetectedSpan.textContent = totalFields;
    fieldsUnfilledSpan.textContent = unfilledFields;
    fieldsFilledSpan.textContent = filledFields;

    statsDiv.style.display = "block";
    
    // Auto-close popup logic based on unfilled fields count
    console.log(`📊 Unfilled fields count: ${unfilledFields}`);
    
    if (unfilledFields === 2) {
      console.log('🔄 Auto-closing popup immediately (unfilled count = 2)');
      window.close();
    } else if (unfilledFields > 2) {
      console.log(`🔄 Auto-closing popup in 2 seconds (unfilled count = ${unfilledFields})`);
      setTimeout(() => {
        console.log('🔄 Executing delayed popup close');
        window.close();
      }, 2000);
    }
  }

  /**
   * Show detailed results with virtualization for large datasets
   * @param {Array} results - Array of field fill results
   */
  function showResults(results) {
    // Optimisation: utiliser DocumentFragment pour éviter les reflows
    const fragment = document.createDocumentFragment();
    
    // Header: Type seulement
    const header = document.createElement("div");
    header.className = "results-header";
    header.innerHTML = `<div>Type de champ</div>`;
    fragment.appendChild(header);

    // Filtrer et traiter en une seule passe
    const unfilledResults = [];
    for (let i = 0; i < results.length; i++) {
      if (!results[i].matched) {
        unfilledResults.push(results[i]);
      }
    }

    // Virtualisation pour les grandes listes (>20 éléments)
    const maxDisplayItems = 20;
    const itemsToShow = unfilledResults.length > maxDisplayItems 
      ? unfilledResults.slice(0, maxDisplayItems) 
      : unfilledResults;

    // Only show unfilled fields
    if (itemsToShow.length > 0) {
      for (let i = 0; i < itemsToShow.length; i++) {
        const result = itemsToShow[i];
        const item = document.createElement("div");
        item.className = "result-item error";
        const type = result.fieldCategory || result.inputType || "Champ inconnu";
        
        // Optimisation: créer l'élément directement
        const typeDiv = document.createElement("div");
        typeDiv.className = "result-text";
        typeDiv.textContent = type;
        
        item.appendChild(typeDiv);
        fragment.appendChild(item);
      }
      
      // Afficher info de troncature si nécessaire
      if (unfilledResults.length > maxDisplayItems) {
        const moreItem = document.createElement("div");
        moreItem.className = "result-item info";
        
        const moreDiv = document.createElement("div");
        moreDiv.className = "result-text";
        moreDiv.textContent = `... et ${unfilledResults.length - maxDisplayItems} autres champs`;
        
        moreItem.appendChild(moreDiv);
        fragment.appendChild(moreItem);
      }
    } else {
      const item = document.createElement("div");
      item.className = "result-item success";
      
      const successDiv = document.createElement("div");
      successDiv.className = "result-text";
      successDiv.textContent = "Tous les champs supportés";
      
      item.appendChild(successDiv);
      fragment.appendChild(item);
    }

    // Une seule manipulation DOM
    resultsDiv.innerHTML = "";
    resultsDiv.appendChild(fragment);
    resultsDiv.style.display = "block";
  }

  /**
   * Hide results section
   */
  function hideResults() {
    resultsDiv.style.display = "none";
    statsDiv.style.display = "none";
  }

  /**
   * Initialize the popup
   */
  async function initialize() {
    console.log("🚀 Initializing popup...");

    // Keep popup open during operations
    keepPopupOpen();

    // Load auto-fill settings
    await loadAutoFillSettings();

    // Vérifier et déclencher le rafraîchissement automatique si nécessaire
    await checkAndTriggerAutoRefresh();

    // Initialize profiles mode by default
    await initializeProfilesMode();

    // Restore saved state
    await restoreSavedState();

    // Add mode switcher handlers
    profileModeBtn.addEventListener("click", () => switchMode("profiles"));
    csvModeBtn.addEventListener("click", () => switchMode("csv"));

    // Add profile selection handler
    profileSelect.addEventListener("change", (e) => {
      console.log("📋 Profile selection changed:", e.target.value);
      handleProfileSelection(e.target.value);
    });

    // Add refresh profiles button handler
    if (refreshProfilesBtn) {
      refreshProfilesBtn.addEventListener("click", () => {
        console.log("🔄 Refresh profiles button clicked");
        forceRefreshProfiles(true);
      });
    }

    // Add CSV file input handler
    csvFileInput.addEventListener("change", handleCSVFile);

    // Add auto-fill settings handler
    autoFillEnabled.addEventListener("change", saveAutoFillSettings);

    // Add fill form button handler
    fillFormBtn.addEventListener("click", fillForm);

    // Initial button state update
    await updateFillButtonState();

    console.log("✅ Popup initialized successfully");
  }

  // Initialize the popup
  initialize();

  // Exposer les fonctions utilitaires pour le debug et le rafraîchissement manuel
  /**
   * Fonction exposée pour forcer le rafraîchissement depuis la console
   * Accessible depuis la console : window.forceRefreshProfiles()
   */
  window.forceRefreshProfiles = async function() {
    console.log("🔄 === FORCE REFRESH PROFILES (MANUAL) ===");
    await forceRefreshProfiles(true);
  };

  /**
   * Fonction pour obtenir les informations sur la source des profils
   * Accessible depuis la console : window.getProfilesSourceInfo()
   */
  window.getProfilesSourceInfo = function() {
    console.log("📊 === PROFILES SOURCE INFO ===");
    console.log("├── Current source:", profilesSource);
    console.log("├── Metadata:", profileSourceMetadata);
    console.log("├── Available profiles:", availableProfiles.length);
    console.log("└── Cloud status:", cloudProfilesStatus);
    return {
      source: profilesSource,
      metadata: profileSourceMetadata,
      profilesCount: availableProfiles.length,
      cloudStatus: cloudProfilesStatus
    };
  };

  // Exposer les fonctions utilitaires pour le debug et le rafraîchissement manuel
  /**
   * Fonction exposée pour forcer le rafraîchissement depuis la console
   * Accessible depuis la console : window.forceRefreshProfiles()
   */
  window.forceRefreshProfiles = async function() {
    console.log("🔄 === FORCE REFRESH PROFILES (MANUAL) ===");
    await forceRefreshProfiles(true);
  };

  /**
   * Fonction pour obtenir les informations sur la source des profils
   * Accessible depuis la console : window.getProfilesSourceInfo()
   */
  window.getProfilesSourceInfo = function() {
    console.log("📊 === PROFILES SOURCE INFO ===");
    console.log("├── Current source:", profilesSource);
    console.log("├── Metadata:", profileSourceMetadata);
    console.log("├── Available profiles:", availableProfiles.length);
    console.log("└── Cloud status:", cloudProfilesStatus);
    return {
      source: profilesSource,
      metadata: profileSourceMetadata,
      profilesCount: availableProfiles.length,
      cloudStatus: cloudProfilesStatus
    };
  };
});
