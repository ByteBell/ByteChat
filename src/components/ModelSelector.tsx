import React, { useState, useEffect } from 'react';
import { fetchOpenRouterModels, OpenRouterModel, getModelDisplayName, getModelPrice } from '../services/openrouter';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  apiKey: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange, apiKey }) => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      loadModels();
    }
  }, [apiKey]);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const modelsData = await fetchOpenRouterModels(apiKey);
      setModels(modelsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (apiKey) {
      loadModels();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        AI Model
      </label>
      
      {error && (
        <div className="p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {!apiKey ? (
        <div className="p-3 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded">
          Please enter your OpenRouter API key to see available models
        </div>
      ) : loading ? (
        <div className="p-3 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 rounded">
          Loading models...
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select a model</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {getModelDisplayName(model)}
              </option>
            ))}
          </select>

          {selectedModel && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              {(() => {
                const model = models.find(m => m.id === selectedModel);
                if (!model) return null;
                
                return (
                  <div className="space-y-1">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Model:</strong> {getModelDisplayName(model)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>Price:</strong> {getModelPrice(model)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>Context:</strong> {model.context_length.toLocaleString()} tokens
                    </p>
                    {model.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-xs">
                        {model.description}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <button
            onClick={handleRefresh}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            type="button"
          >
            Refresh models
          </button>
        </div>
      )}
    </div>
  );
};