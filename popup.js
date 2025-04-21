document.addEventListener('DOMContentLoaded', function() {
    // Determine if we're using Firefox or Chrome/Edge
    const browserAPI = window.browser || window.chrome;
  
    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
      });
    });
    
    // Provider change handler
    const providerSelect = document.getElementById('provider');
    const openaiModels = document.getElementById('openai-models');
    const anthropicModels = document.getElementById('anthropic-models');
    const togetherModels = document.getElementById('together-models');
    
    providerSelect.addEventListener('change', function() {
      // Hide all model selectors
      openaiModels.style.display = 'none';
      anthropicModels.style.display = 'none';
      togetherModels.style.display = 'none';
      
      // Show the appropriate model selector
      if (this.value === 'openai') {
        openaiModels.style.display = 'block';
      } else if (this.value === 'anthropic') {
        anthropicModels.style.display = 'block';
      } else if (this.value === 'together') {
        togetherModels.style.display = 'block';
      }
    });
    
    // Toggle API key visibility
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const apiKeyInput = document.getElementById('api-key');
  
    toggleApiKeyBtn.addEventListener('click', function() {
      // Toggle the input type between password and text
      if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleApiKeyBtn.textContent = "Hide";
      } else {
        apiKeyInput.type = "password";
        toggleApiKeyBtn.textContent = "Show";
      }
    });
    
    // Save settings button handler
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const saveSuccess = document.getElementById('saveSuccess');
    
    saveSettingsBtn.addEventListener('click', function() {
      const provider = providerSelect.value;
      let model = '';
      
      if (provider === 'openai') {
        model = document.getElementById('openai-model').value;
      } else if (provider === 'anthropic') {
        model = document.getElementById('anthropic-model').value;
      } else if (provider === 'together') {
        model = document.getElementById('together-model').value;
      }
      
      const apiKey = document.getElementById('api-key').value;
      
      // Save to browser storage (works for both Chrome and Firefox)
      const data = {
        provider: provider,
        model: model,
        apiKey: apiKey
      };
      
      // Use storage API with compatibility for both Chrome and Firefox
      if (browserAPI && browserAPI.storage) {
        browserAPI.storage.local.set(data, function() {
          // Show success message
          saveSuccess.classList.add('show');
          setTimeout(() => {
            saveSuccess.classList.remove('show');
          }, 2000);
        });
      } else {
        // Fallback to localStorage for testing in regular browser environments
        localStorage.setItem('aiExtensionSettings', JSON.stringify(data));
        // Show success message
        saveSuccess.classList.add('show');
        setTimeout(() => {
          saveSuccess.classList.remove('show');
        }, 2000);
      }
    });
    
    // Load saved settings
    function loadSettings() {
      if (browserAPI && browserAPI.storage) {
        browserAPI.storage.local.get(['provider', 'model', 'apiKey'], function(result) {
          applySettings(result);
        });
      } else {
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('aiExtensionSettings');
        if (savedSettings) {
          applySettings(JSON.parse(savedSettings));
        }
      }
    }
    
    function applySettings(result) {
      if (result.provider) {
        providerSelect.value = result.provider;
        
        // Trigger change event to show the correct model selector
        const event = new Event('change');
        providerSelect.dispatchEvent(event);
        
        // Set the model value
        if (result.provider === 'openai' && result.model) {
          document.getElementById('openai-model').value = result.model;
        } else if (result.provider === 'anthropic' && result.model) {
          document.getElementById('anthropic-model').value = result.model;
        } else if (result.provider === 'together' && result.model) {
          document.getElementById('together-model').value = result.model;
        }
      }
      
      if (result.apiKey) {
        document.getElementById('api-key').value = result.apiKey;
      }
    }
    
    // Load settings when the popup opens
    loadSettings();
    
    // Submit button handler
    const submitBtn = document.getElementById('submitBtn');
    const promptTextarea = document.getElementById('prompt');
    const resultTextarea = document.getElementById('result');
    
    submitBtn.addEventListener('click', function() {
      // Get the prompt text
      const promptText = promptTextarea.value.trim();
      
      if (!promptText) {
        resultTextarea.value = 'Please enter a prompt';
        return;
      }
      
      // Show loading message
      resultTextarea.value = 'Generating response...';
      
      // Get saved settings
      if (browserAPI && browserAPI.storage) {
        browserAPI.storage.local.get(['provider', 'model', 'apiKey'], function(result) {
          processApiCall(result);
        });
      } else {
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('aiExtensionSettings');
        if (savedSettings) {
          processApiCall(JSON.parse(savedSettings));
        } else {
          resultTextarea.value = 'Please enter an API key in the Settings tab';
        }
      }
      
      function processApiCall(result) {
        if (!result.apiKey) {
          resultTextarea.value = 'Please enter an API key in the Settings tab';
          return;
        }
        
        const provider = result.provider || 'openai';
        const model = result.model || getDefaultModel(provider);
        const apiKey = result.apiKey;
        
        // Make API call based on the selected provider
        makeAIApiCall(provider, model, apiKey, promptText)
          .then(data => {
            resultTextarea.value = data;
          })
          .catch(error => {
            resultTextarea.value = `Error: ${error.message}`;
          });
      }
    });
    
    // Helper function to get default model for provider
    function getDefaultModel(provider) {
      switch (provider) {
        case 'openai':
          return 'gpt-3.5-turbo';
        case 'anthropic':
          return 'claude-3-sonnet';
        case 'together':
          return 'mistralai/mixtral-8x7b';
        default:
          return 'gpt-3.5-turbo';
      }
    }
    
    // Function to make API calls to different providers
    async function makeAIApiCall(provider, model, apiKey, prompt) {
      let url, headers, body, responseHandler;
      
      switch (provider) {
        case 'openai':
          url = 'https://api.openai.com/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          };
          body = JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
          });
          responseHandler = (data) => data.choices[0].message.content;
          break;
          
        case 'anthropic':
          url = 'https://api.anthropic.com/v1/messages';
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          };
          body = JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
          });
          responseHandler = (data) => data.content[0].text;
          break;
          
        case 'together':
          url = 'https://api.together.xyz/v1/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          };
          body = JSON.stringify({
            model: model,
            prompt: prompt,
            max_tokens: 1000
          });
          responseHandler = (data) => data.choices[0].text;
          break;
          
        default:
          throw new Error('Unknown provider');
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      return responseHandler(data);
    }
  });