import React, { useState, useEffect } from 'react';
import { fetchOpenRouterModels, OpenRouterModel, getModelDisplayName, getModelPrice } from '../services/openrouter';
import { fetchTogetherModels, TogetherModel, getTogetherModelDisplayName, getTogetherModelPrice } from '../services/together';
import { Provider } from '../types';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  apiKey: string;
  provider: Provider;
}

type UnifiedModel = OpenRouterModel | TogetherModel;

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  apiKey, 
  provider 
}) => {
  const [models, setModels] = useState<UnifiedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey && (provider === 'openrouter' || provider === 'together')) {
      loadModels();
    } else {
      setModels([]);
      setError(null);
    }
  }, [apiKey, provider]);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    setModels([]);
    
    try {
      let modelsData: UnifiedModel[];
      
      if (provider === 'openrouter') {
        modelsData = await fetchOpenRouterModels(apiKey);
      } else if (provider === 'together') {
        console.log('Fetching Together AI models...');
        modelsData = await fetchTogetherModels(apiKey);
        console.log('Together AI models received:', modelsData);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      
      if (Array.isArray(modelsData)) {
        setModels(modelsData);
      } else {
        console.error('Invalid models data received:', modelsData);
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      console.error('Error in loadModels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (apiKey && (provider === 'openrouter' || provider === 'together')) {
      loadModels();
    }
  };

  const getDisplayName = (model: UnifiedModel): string => {
    if (provider === 'openrouter') {
      return getModelDisplayName(model as OpenRouterModel);
    } else if (provider === 'together') {
      return getTogetherModelDisplayName(model as TogetherModel);
    }
    return model.name || model.id;
  };

  const getPrice = (model: UnifiedModel): string => {
    if (provider === 'openrouter') {
      return getModelPrice(model as OpenRouterModel);
    } else if (provider === 'together') {
      return getTogetherModelPrice(model as TogetherModel);
    }
    return 'Pricing information not available';
  };

  const getProviderName = (): string => {
    return provider === 'openrouter' ? 'OpenRouter' : 'Together AI';
  };

  const getProviderIcon = (): string => {
    return provider === 'openrouter' ? '🔀' : '🚀';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getProviderIcon()}</span>
          <span className="font-medium text-foreground">{getProviderName()} Models</span>
        </div>
        {!loading && models.length > 0 && (
          <button
            onClick={handleRefresh}
            className="btn btn-ghost btn-sm text-xs"
            type="button"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>
      
      {/* Error State */}
      {error && (
        <div className="card p-3 bg-red-50 border-red-200 animate-slide-up">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Failed to load models</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-xs text-red-700 hover:text-red-800 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No API Key State */}
      {!apiKey && (
        <div className="card p-4 bg-muted/30 border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.243-6.243C11.516 9.34 11.516 8.66 12.343 7.757a6 6 0 018.9 7.486L18 12z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">API Key Required</p>
              <p className="text-xs text-muted-foreground">
                Enter your {getProviderName()} API key to see available models
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card p-4 bg-muted/30 border-border">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 spinner border-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Loading models...</p>
              <p className="text-xs text-muted-foreground">
                Fetching available models from {getProviderName()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Model Selection */}
      {!loading && !error && apiKey && (
        <div className="space-y-3">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="select w-full"
          >
            <option value="">Choose a model...</option>
            {Array.isArray(models) && models.map((model) => (
              <option key={model.id} value={model.id}>
                {getDisplayName(model)}
              </option>
            ))}
          </select>

          {/* Model Details */}
          {selectedModel && (
            <div className="card p-4 bg-muted/30 space-y-3 animate-slide-up">
              {(() => {
                const model = Array.isArray(models) ? models.find(m => m.id === selectedModel) : null;
                if (!model) return (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Model information not available</span>
                  </div>
                );
                
                return (
                  <div className="space-y-3">
                    {/* Model Header */}
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm leading-5">
                          {getDisplayName(model)}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected {getProviderName()} model
                        </p>
                      </div>
                    </div>

                    {/* Model Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Pricing
                        </p>
                        <p className="text-sm text-foreground font-mono">
                          {getPrice(model)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Context
                        </p>
                        <p className="text-sm text-foreground font-mono">
                          {model.context_length?.toLocaleString() || 'N/A'} tokens
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {model.description && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {model.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Model Count */}
          {Array.isArray(models) && models.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>{models.length} models available</span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Connected</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};