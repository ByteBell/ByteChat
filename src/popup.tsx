import React, { useState, useEffect } from 'react';
import './tailwind.css';
import Together from 'together-ai';

// Define TypeScript interfaces
interface Settings {
  provider: string;
  model: string;
  apiKey: string;
}

const Popup: React.FC = () => {
  // States
  const [activeTab, setActiveTab] = useState<string>('api');
  const [provider, setProvider] = useState<string>('openai');
  const [model, setModel] = useState<string>('gpt-4o');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Browser API
  const browserAPI = window.browser || window.chrome;

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = () => {
    if (browserAPI && browserAPI.storage) {
      browserAPI.storage.local.get(['provider', 'model', 'apiKey'], (result: Settings) => {
        if (result.provider) setProvider(result.provider);
        if (result.model) setModel(result.model);
        if (result.apiKey) setApiKey(result.apiKey);
      });
    } else {
      // Fallback to localStorage for development
      const savedSettings = localStorage.getItem('aiExtensionSettings');
      if (savedSettings) {
        const settings: Settings = JSON.parse(savedSettings);
        setProvider(settings.provider);
        setModel(settings.model);
        setApiKey(settings.apiKey);
      }
    }
  };

  const saveSettings = () => {
    const data: Settings = {
      provider,
      model,
      apiKey,
    };

    if (browserAPI && browserAPI.storage) {
      browserAPI.storage.local.set(data, () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      });
    } else {
      // Fallback to localStorage
      localStorage.setItem('aiExtensionSettings', JSON.stringify(data));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setResult('Please enter a prompt');
      return;
    }

    if (!apiKey) {
      setResult('Please enter an API key in the Settings tab');
      return;
    }

    setIsLoading(true);
    setResult('Generating response...');

    try {
      const response = await makeAIApiCall(provider, model, apiKey, prompt);
      setResult(response);
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const makeAIApiCall = async (provider: string, model: string, apiKey: string, prompt: string): Promise<string> => {
    let url: string, headers: Record<string, string>, body: string, responseHandler: (data: any) => string;
    
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
          try {
            // Initialize Together client with API key
            const together = new Together({ apiKey });
                        
            // Use the Together client to make the API call with system message
            const promptWithSystem = `Please correct the grammar of the following sentence and list the errors afterwards:\n\n"${prompt}"`;

            const completion = await together.chat.completions.create({
              model,
              messages: [{ role: 'user', content: promptWithSystem }],
              max_tokens: 1000
            });
            
            // Return the generated text from the response
            return completion.choices[0]?.message?.content || "No content returned";
          } catch (error) {
            throw new Error(`Together API error: ${error instanceof Error ? error.message : String(error)}`);
          }


    //   case 'together':
    //     url = 'https://api.together.xyz/v1/completions';
    //     headers = {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${apiKey}`
    //     };
    //     body = JSON.stringify({
    //       model: model,
    //       prompt: prompt,
    //       max_tokens: 1000
    //     });
    //     responseHandler = (data) => data.choices[0].text;
    //     break;
        
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
  };

  // Get the appropriate model options based on provider
  const getModelOptions = () => {
    switch(provider) {
      case 'openai':
        return (
          <>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </>
        );
      case 'anthropic':
        return (
          <>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
          </>
        );
      case 'together':
        return (
          <>
            <option value="meta-llama/Llama-3.3-70B-Instruct-Turbo">Llama 3.3 70B</option>
            <option value="meta-llama/Llama-3.3-70B-Instruct-Turbo-Free">Llama 3.3 70B Free</option>
            <option value="mistralai/mistral-large">Mistral Large</option>
            <option value="deepseek-ai/DeepSeek-R1-Distill-Llama-70B">Deepseek R1 Llama 70B</option>
          </>
        );
      default:
        return null;
    }
  };

  const getProviderLabel = () => {
    switch(provider) {
      case 'openai': return 'OpenAI Model';
      case 'anthropic': return 'Anthropic Model';
      case 'together': return 'Together AI Model';
      default: return 'Model';
    }
  };

  const getProviderColor = () => {
    switch(provider) {
      case 'openai': return 'bg-green-600 hover:bg-green-700';
      case 'anthropic': return 'bg-purple-600 hover:bg-purple-700';
      case 'together': return 'bg-blue-600 hover:bg-blue-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="w-[400px] p-4 font-sans bg-gray-50">
      <h1 className="text-2xl font-bold text-center mb-4">AI Extension</h1>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button 
          className={`py-2 px-4 border-t border-l border-r rounded-t-lg font-medium mr-1 transition ${
            activeTab === 'api' 
              ? 'bg-white border-gray-300 text-blue-600' 
              : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('api')}
        >
          AI Chat
        </button>
        <button 
          className={`py-2 px-4 border-t border-l border-r rounded-t-lg font-medium transition ${
            activeTab === 'settings' 
              ? 'bg-white border-gray-300 text-blue-600' 
              : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div>
            <label htmlFor="prompt" className="block font-medium text-gray-700 mb-1">Your prompt:</label>
            <textarea 
              id="prompt" 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y"
              placeholder="Enter your prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Using {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Together AI'}
            </span>
            <button 
              className={`px-4 py-2 text-white rounded-lg font-medium transition ${getProviderColor()} disabled:opacity-50 flex items-center`}
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : "Submit"}
            </button>
          </div>
          
          <div>
            <label htmlFor="result" className="block font-medium text-gray-700 mb-1">Response:</label>
            <div className="relative">
              <textarea 
                id="result" 
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 min-h-[120px] resize-y"
                value={result}
                readOnly
              />
              {result && (
                <button 
                  onClick={() => {navigator.clipboard.writeText(result)}}
                  className="absolute top-2 right-2 p-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div>
            <label htmlFor="provider" className="block font-medium text-gray-700 mb-1">AI Provider:</label>
            <select 
              id="provider" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="together">Together AI</option>
            </select>
          </div>

          <div>
            <label htmlFor="model" className="block font-medium text-gray-700 mb-1">{getProviderLabel()}:</label>
            <select 
              id="model" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {getModelOptions()}
            </select>
          </div>

          <div>
            <label htmlFor="api-key" className="block font-medium text-gray-700 mb-1">API Key:</label>
            <div className="flex gap-2">
              <input 
                type={showApiKey ? "text" : "password"} 
                id="api-key" 
                className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button 
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and never shared.</p>
          </div>

          <div className="mt-2">
            <button 
              className={`px-4 py-2 text-white rounded-lg font-medium transition ${getProviderColor()}`}
              onClick={saveSettings}
            >
              Save Settings
            </button>
            {showSuccess && (
              <div className="flex items-center text-green-600 text-sm mt-2">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Settings saved successfully!
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2">Provider Information</h3>
            {provider === 'openai' && (
              <p className="text-sm text-gray-600">Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI's API page</a> to get your API key.</p>
            )}
            {provider === 'anthropic' && (
              <p className="text-sm text-gray-600">Visit <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic's console</a> to get your API key.</p>
            )}
            {provider === 'together' && (
              <p className="text-sm text-gray-600">Visit <a href="https://api.together.xyz/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Together AI</a> to get your API key.</p>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-4 text-center text-xs text-gray-500">
        AI Extension v1.0.0
      </div>
    </div>
  );
};

export default Popup;