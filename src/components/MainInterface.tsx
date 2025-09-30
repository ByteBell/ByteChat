import React, { useState, useEffect, useRef } from 'react';
import { OpenRouterModel, fetchOpenRouterModels, refreshModelsCache, getModelPrice, isImageGenerationModel } from '../services/openrouter';
import { categorizeModels, getAllModelPreferences, getBestModelForCapability, saveModelPreference, type ModelsByCategory } from '../services/modelCategories';
import { getCachedBalanceInfo, type BalanceInfo } from '../services/balance';
import { SYSTEM_PROMPTS } from '../constants';
import { sendChatRequest } from '../services/api';
import { callLLMStream } from '../utils';
import { Settings, ModelCapability, MessageContent, ChatSession } from '../types';
import SessionSelector from './SessionSelector';
import ChatHistory from './ChatHistory';
import Icon from './Icon';
import { GoogleUser } from '../services/googleAuth';
import { encodeFileToBase64, getMimeTypeFromExtension, formatFileSize } from '../utils/fileEncoder';
import {
  handleAppRefresh,
  getOrCreateCurrentSession,
  addMessageToCurrentSession,
  getCurrentSession,
  setCurrentSession,
  getAllSessions
} from '../utils/sessionManager';

interface MainInterfaceProps {
  apiKey: string;
  googleUser?: GoogleUser | null;
  authMethod?: 'apikey' | 'google';
  onApiKeyChange?: () => void;
}

type Tool = {
  id: keyof typeof SYSTEM_PROMPTS;
  name: string;
  icon: string;
  description: string;
};

const languages = [
  'Auto-detect',
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Dutch',
  'Polish',
  'Turkish',
  'Swedish',
  'Danish',
  'Norwegian',
  'Finnish'
];

const tools: Tool[] = [
  {
    id: 'Translate',
    name: 'Translate',
    icon: 'translate',
    description: 'Translate between languages'
  },
  {
    id: 'Summarize',
    name: 'Summarize',
    icon: 'document-text',
    description: 'Create concise summaries'
  },
  {
    id: 'Reply',
    name: 'Reply',
    icon: 'chat-bubble-left-right',
    description: 'Generate social media replies'
  },
  {
    id: 'Fact Check',
    name: 'Fact Check',
    icon: 'magnifying-glass',
    description: 'Verify information accuracy'
  },
  {
    id: 'Fix Grammar',
    name: 'Fix Grammar',
    icon: 'pencil-square',
    description: 'Correct grammar and spelling'
  }
];

const MainInterface: React.FC<MainInterfaceProps> = ({ apiKey, googleUser, authMethod, onApiKeyChange }) => {
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [categorizedModels, setCategorizedModels] = useState<ModelsByCategory>({
    text: [], image: [], file: [], audio: []
  });
  const [selectedModels, setSelectedModels] = useState<Record<ModelCapability, string>>({
    text: '', image: '', file: '', audio: ''
  });
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSessionState] = useState<ChatSession | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const streamingResponseRef = useRef('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<MessageContent[]>([]);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  const [fromLanguage, setFromLanguage] = useState<string>('Auto-detect');
  const [toLanguage, setToLanguage] = useState<string>('English');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Handle textarea input change (fixed height to match icon stack)
  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  useEffect(() => {
    loadModels();
    checkForPendingText();
    loadBalance();
    initializeSession();
    loadZoomPreference();

    // Listen for storage changes (when context menu stores new pending text)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pending_text && changes.pending_text.newValue) {
        console.log('[MainInterface] Detected new pending text from storage change');
        checkForPendingText();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Also check for pending text when window gains focus (side panel becomes visible)
    const handleFocus = () => {
      console.log('[MainInterface] Window focused, checking for pending text');
      checkForPendingText();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [apiKey]);

  // Initialize session on app start
  const initializeSession = async () => {
    // Don't create a session immediately - wait until user sends first message
    // Just check if there are existing sessions to load
    const sessions = await getAllSessions();
    if (sessions.length > 0) {
      // Load the most recent session
      setCurrentSessionState(sessions[0]);
    }
    // If no sessions exist, currentSession will be null until first message
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Close audio menu if clicking outside
      if (showAudioMenu && !target.closest('.audio-menu-container')) {
        setShowAudioMenu(false);
      }
      
      // Close tools menu if clicking outside
      if (showTools && !target.closest('.tools-dropdown') && !target.closest('[title="Select Tool"]')) {
        setShowTools(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAudioMenu, showTools]);

  // Check for text sent from context menu
  const checkForPendingText = async () => {
    try {
      console.log('[MainInterface] Checking for pending text...');

      const result = await chrome.storage.local.get([
        'pending_text',
        'pending_tool',
        'pending_is_custom_prompt',
        'pending_timestamp'
      ]);

      console.log('[MainInterface] Storage result:', result);

      if (result.pending_text && result.pending_timestamp) {
        // Check if the pending text is recent (within 30 seconds)
        const age = Date.now() - result.pending_timestamp;
        const isRecent = age < 30000;

        console.log('[MainInterface] Pending text found:', {
          textLength: result.pending_text.length,
          tool: result.pending_tool,
          isCustomPrompt: result.pending_is_custom_prompt,
          age: age,
          isRecent: isRecent
        });

        if (isRecent) {
          // Set the text
          setInput(result.pending_text);
          console.log('[MainInterface] Set input text:', result.pending_text.substring(0, 100) + '...');

          // Handle custom prompt vs tool selection
          if (result.pending_is_custom_prompt) {
            // For custom prompt, clear any selected tool and show chat mode
            setSelectedTool(null);
            setShowTools(false);
            console.log('[MainInterface] Set up for custom prompt mode');
          } else if (result.pending_tool) {
            // Select the appropriate tool if specified
            const tool = tools.find(t => t.name === result.pending_tool);
            if (tool) {
              setSelectedTool(tool);
              setShowTools(false);
              console.log('[MainInterface] Selected tool:', result.pending_tool);

              // If it's a translate tool, ensure target language is set to English by default
              if (result.pending_tool === 'Translate') {
                setToLanguage('English');
                console.log('[MainInterface] Set target language to English (default)');
              }
            } else {
              console.error('[MainInterface] Tool not found:', result.pending_tool);
            }
          }

          // Clear the pending data
          chrome.storage.local.remove([
            'pending_text',
            'pending_tool',
            'pending_is_custom_prompt',
            'pending_timestamp'
          ]);

          console.log('[MainInterface] Pending data cleared');
        } else {
          console.log('[MainInterface] Pending text too old, ignoring');
        }
      } else {
        console.log('[MainInterface] No pending text found');
      }
    } catch (error) {
      console.error('[MainInterface] Failed to check pending text:', error);
    }
  };

  // No dropdown click outside handler needed for select elements

  const loadModels = async (forceRefresh = false) => {
    setLoadingModels(true);
    try {
      const fetchedModels = forceRefresh 
        ? await refreshModelsCache(apiKey)
        : await fetchOpenRouterModels(apiKey);
        
      setAllModels(fetchedModels);
      console.log(`[MainInterface] Loaded ${fetchedModels.length} models`);
      
      // Categorize models by capability
      const categorized = categorizeModels(fetchedModels);
      setCategorizedModels(categorized);
      
      // Set specific default models for each capability
      const newSelectedModels: Record<ModelCapability, string> = {
        text: '',
        image: '',
        file: '',
        audio: ''
      };

      // Set default models based on your requirements
      for (const capability of (['text', 'image', 'file', 'audio'] as ModelCapability[])) {
        const modelsInCategory = categorized[capability];

        if (capability === 'text') {
          // Default to x-ai/grok-3-mini for text
          const grokModel = modelsInCategory.find(model => 
            model.id === 'x-ai/grok-3-mini' || 
            model.id === 'grok-3-mini'
          );
          
          if (grokModel) {
            newSelectedModels.text = grokModel.id;
          } else {
            // Fallback to GPT-4 or best available
            const gpt4Model = modelsInCategory.find(model => 
              model.id.includes('gpt-4') || 
              model.id.includes('openai/gpt-4')
            );
            newSelectedModels.text = gpt4Model?.id || (await getBestModelForCapability(capability, categorized)) || '';
          }
        } else if (capability === 'image' || capability === 'file') {
          // Default to google/gemini-2.5-flash-image-preview for images and files
          const geminiImageModel = modelsInCategory.find(model =>
            model.id === 'google/gemini-2.5-flash-image-preview' ||
            model.id === 'gemini-2.5-flash-image-preview' ||
            model.id === 'google/gemini-flash-1.5' ||
            model.id.includes('gemini') && model.id.includes('flash')
          );
          
          if (geminiImageModel) {
            newSelectedModels[capability] = geminiImageModel.id;
          } else {
            // Fallback to any Gemini vision model
            const anyGeminiModel = modelsInCategory.find(model =>
              model.id.toLowerCase().includes('gemini')
            );
            newSelectedModels[capability] = anyGeminiModel?.id || (await getBestModelForCapability(capability, categorized)) || '';
          }
        } else if (capability === 'audio') {
          // Default to google/gemini-2.5-flash-lite for audio
          const geminiLiteModel = modelsInCategory.find(model =>
            model.id === 'google/gemini-2.5-flash-lite' ||
            model.id === 'gemini-2.5-flash-lite' ||
            model.id === 'google/gemini-flash-1.5-8b' ||
            model.id.includes('gemini') && model.id.includes('lite')
          );
          
          if (geminiLiteModel) {
            newSelectedModels.audio = geminiLiteModel.id;
          } else {
            // Fallback to any Gemini model or Whisper for audio
            const audioModel = modelsInCategory.find(model =>
              model.id.toLowerCase().includes('gemini') ||
              model.id.toLowerCase().includes('whisper')
            );
            newSelectedModels.audio = audioModel?.id || (await getBestModelForCapability(capability, categorized)) || '';
          }
        }
      }
      
      setSelectedModels(newSelectedModels);
      console.log('[MainInterface] Loaded model preferences:', newSelectedModels);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const loadBalance = async () => {
    try {
      const balanceInfo = await getCachedBalanceInfo(apiKey);
      setBalance(balanceInfo);
      console.log('[MainInterface] Loaded balance:', balanceInfo);
    } catch (error) {
      console.error('[MainInterface] Failed to load balance:', error);
    }
  };

  const loadZoomPreference = async () => {
    try {
      const result = await chrome.storage.local.get(['zoomLevel']);
      if (result.zoomLevel && typeof result.zoomLevel === 'number') {
        setZoomLevel(result.zoomLevel);
      }
    } catch (error) {
      console.error('[MainInterface] Failed to load zoom preference:', error);
    }
  };

  const handleZoomIn = async () => {
    const newZoom = Math.min(zoomLevel + 10, 200); // Max 200%
    console.log('[MainInterface] Zoom In clicked:', zoomLevel, '->', newZoom);
    setZoomLevel(newZoom);
    try {
      await chrome.storage.local.set({ zoomLevel: newZoom });
      console.log('[MainInterface] Zoom saved to storage:', newZoom);
    } catch (error) {
      console.error('[MainInterface] Failed to save zoom preference:', error);
    }
  };

  const handleZoomOut = async () => {
    const newZoom = Math.max(zoomLevel - 10, 50); // Min 50%
    console.log('[MainInterface] Zoom Out clicked:', zoomLevel, '->', newZoom);
    setZoomLevel(newZoom);
    try {
      await chrome.storage.local.set({ zoomLevel: newZoom });
      console.log('[MainInterface] Zoom saved to storage:', newZoom);
    } catch (error) {
      console.error('[MainInterface] Failed to save zoom preference:', error);
    }
  };

  const resetZoom = async () => {
    console.log('[MainInterface] Reset Zoom clicked:', zoomLevel, '-> 100');
    setZoomLevel(100);
    try {
      await chrome.storage.local.set({ zoomLevel: 100 });
      console.log('[MainInterface] Zoom reset and saved to storage');
    } catch (error) {
      console.error('[MainInterface] Failed to save zoom preference:', error);
    }
  };

  const handleRefreshModels = () => {
    loadModels(true);
  };

  const handleModelChange = async (capability: ModelCapability, modelId: string) => {
    const newSelectedModels = { ...selectedModels, [capability]: modelId };
    setSelectedModels(newSelectedModels);
    await saveModelPreference(capability, modelId);
  };

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setShowTools(false);
    setInput('');
  };

  const handleSubmit = async () => {
    if (!input.trim()) {
      return;
    }

    // Ensure we have a current session
    const session = await getOrCreateCurrentSession();
    if (!currentSession || currentSession.id !== session.id) {
      setCurrentSessionState(session);
    }

    // Determine which model to use based on attached content
    let modelToUse = '';
    let capabilityNeeded: ModelCapability = 'text';

    // Check for different attachment types and select appropriate model
    const hasPDF = attachedFiles.some(file => 
      file.type === 'file' && 'file' in file && file.file?.filename.toLowerCase().endsWith('.pdf')
    );
    const hasCSV = attachedFiles.some(file => 
      file.type === 'file' && 'file' in file && file.file?.filename.toLowerCase().endsWith('.csv')
    );
    const hasTextContent = attachedFiles.some(file => file.type === 'text');
    
    if (attachedFiles.some(file => file.type === 'input_audio')) {
      // Audio takes precedence - use audio model (google/gemini-2.5-flash-lite)
      capabilityNeeded = 'audio';
      modelToUse = selectedModels.audio;
    } else if (hasPDF || hasCSV) {
      // PDFs and CSVs - use file model (google/gemini-2.5-flash-image-preview)
      capabilityNeeded = 'file';
      modelToUse = selectedModels.file;
    } else if (hasTextContent) {
      // Other documents converted to text - use text model (x-ai/grok-3-mini)
      capabilityNeeded = 'text';
      modelToUse = selectedModels.text || 'x-ai/grok-3-mini'; // Fallback to grok-3-mini
    } else if (attachedFiles.some(file => file.type === 'image_url')) {
      // Images - use image model (google/gemini-2.5-flash-image-preview)
      capabilityNeeded = 'image';
      modelToUse = selectedModels.image;
    } else {
      // Plain text - use text model (openai/gpt-5)
      capabilityNeeded = 'text';
      modelToUse = selectedModels.text;
    }

    if (!modelToUse) {
      // Add an error message to the chat instead of setting output
      const errorMessage = capabilityNeeded === 'audio'
        ? 'Please select an audio model that supports transcription (e.g., Whisper models) before submitting audio.'
        : `Please select a ${capabilityNeeded} model before submitting.`;

      await addMessageToCurrentSession('assistant', errorMessage, 'system');
      const updatedSession = await getCurrentSession();
      if (updatedSession) {
        setCurrentSessionState(updatedSession);
      }
      return;
    }

    console.log('Starting streaming request with input:', input);
    console.log('Selected model:', modelToUse, 'for capability:', capabilityNeeded);

    // Add user message to session
    await addMessageToCurrentSession('user', input, modelToUse, attachedFiles.length > 0 ? attachedFiles : undefined);
    const userInput = input; // Store input before clearing

    setIsLoading(true);
    setStreamingResponse(''); // Clear any previous streaming response
    streamingResponseRef.current = ''; // Clear ref
    setInput(''); // Clear input immediately
    clearAllAttachments(); // Clear attachments immediately

    try {
      const settings: Settings = {
        provider: 'openrouter',
        apiKey,
        model: modelToUse,
        temperature: 0.1
      };

      // Prepare system prompt
      let systemPrompt = '';
      if (selectedTool) {
        if (selectedTool.id === 'Translate') {
          // Custom prompt for translation with language specifications
          systemPrompt = `Translate the following text from ${fromLanguage} to ${toLanguage}. If the source language is set to "Auto-detect", first identify the language, then translate to ${toLanguage}. Provide only the translated text without any additional commentary or explanation.\n\nText to translate:`;
        } else {
          systemPrompt = SYSTEM_PROMPTS[selectedTool.id];
        }
        console.log('Using tool:', selectedTool.name, 'with system prompt');
      }

      // Build multimodal content if attachments exist
      let promptContent: string | MessageContent[];

      if (attachedFiles.length > 0) {
        // Create multimodal content array
        promptContent = [
          // Add user text if provided
          ...(userInput ? [{ type: 'text' as const, text: userInput }] : []),
          // Add all attached files exactly as they are
          ...attachedFiles
        ];
      } else {
        // Simple text message
        promptContent = userInput;
      }

      console.log('Starting streaming with system prompt:', systemPrompt);
      console.log('Final prompt content:', promptContent);

      // Check if we have PDFs or CSVs and need to add plugin configuration
      const hasPDFOrCSV = attachedFiles.some(file => 
        file.type === 'file' && 'file' in file && file.file && 
        (file.file.filename.toLowerCase().endsWith('.pdf') || file.file.filename.toLowerCase().endsWith('.csv'))
      );

      // Prepare plugins for PDF/CSV processing if needed
      const plugins = hasPDFOrCSV ? [
        {
          id: 'file-parser',
          pdf: {
            engine: 'mistral-ocr' // Use pdf-text engine (free option for well-structured PDFs)
          }
        }
      ] : undefined;

      if (plugins) {
        console.log('📄 Using PDF processing with pdf-text engine (free)');
      }

      // Stream the response with optional plugins
      await callLLMStream(
        settings,
        systemPrompt,
        promptContent,
        (chunk: string) => {
          console.log('Received chunk:', chunk.length, 'characters');
          // Update both state and ref
          streamingResponseRef.current += chunk;
          setStreamingResponse(streamingResponseRef.current);
          console.log('Current response length:', streamingResponseRef.current.length);
        },
        '', // existingAnswer (empty for new requests)
        plugins // Pass plugins for PDF processing
      );

      // After streaming is complete, add the full response to session
      const finalResponse = streamingResponseRef.current;
      console.log('Streaming completed, final response:', finalResponse);

      if (finalResponse.trim()) {
        await addMessageToCurrentSession('assistant', finalResponse, modelToUse);
        const updatedSession = await getCurrentSession();
        if (updatedSession) {
          setCurrentSessionState(updatedSession);
        }
        console.log('Streaming response added to session successfully');
      } else {
        await addMessageToCurrentSession('assistant', 'No response received', modelToUse);
        const updatedSession = await getCurrentSession();
        if (updatedSession) {
          setCurrentSessionState(updatedSession);
        }
      }

      // Clear streaming response after adding to session
      console.log('Clearing streaming response after successful save');
      setStreamingResponse('');
      streamingResponseRef.current = '';

    } catch (error) {
      console.error('Streaming request failed:', error);
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide specific feedback for common file processing errors
      if (errorMessage.includes('Failed to extract') && errorMessage.includes('image')) {
        errorMessage = 'Image processing failed. Please try:\n1. Using a smaller image (under 5MB)\n2. Converting to JPG/PNG format\n3. Using a different model that supports vision\n4. Compressing the image before uploading';
      } else if (errorMessage.includes('Internal Server Error') || errorMessage.includes('500')) {
        if (attachedFiles.some(file => file.type === 'image_url' && 'image_url' in file)) {
          errorMessage = 'Image processing failed on the server. Please try:\n1. Using a smaller image file\n2. Converting to a standard format (JPG/PNG)\n3. Selecting a different vision model';
        } else if (attachedFiles.some(file => file.type === 'file')) {
          errorMessage = 'The selected model may not support document processing. Please try:\n1. Using a different model (like GPT-4 Vision)\n2. Converting your document to text\n3. Using a smaller file size';
        } else {
          errorMessage = 'Server error occurred. Please try again or select a different model.';
        }
      } else if (errorMessage.includes('400') && attachedFiles.length > 0) {
        const hasImages = attachedFiles.some(file => file.type === 'image_url');
        const hasFiles = attachedFiles.some(file => file.type === 'file');

        if (hasImages) {
          errorMessage = 'Invalid request with images. Please try:\n1. Using smaller images (under 5MB)\n2. Using standard image formats (JPG, PNG)\n3. Selecting a model that supports vision\n4. Reducing the number of attached images';
        } else if (hasFiles) {
          errorMessage = 'Invalid request with files. Please try:\n1. Using smaller files\n2. Using supported file formats\n3. Selecting a different model';
        } else {
          errorMessage = 'Invalid request format. Please try again or contact support.';
        }
      } else if (errorMessage.includes('QuotaExceededError')) {
        errorMessage = 'Storage quota exceeded. Please clear browser storage or use smaller files.';
      }

      // Add error message to session
      await addMessageToCurrentSession('assistant', `Error: ${errorMessage}`, modelToUse);
      const updatedSession = await getCurrentSession();
      if (updatedSession) {
        setCurrentSessionState(updatedSession);
      }
      console.log('Error added to session:', errorMessage);

      // Clear streaming response on error too
      setStreamingResponse('');
      streamingResponseRef.current = '';
    } finally {
      setIsLoading(false);
      console.log('Streaming request completed');
    }
  };

  // Handle session change from dropdown
  const handleSessionChange = async (session: ChatSession) => {
    await setCurrentSession(session.id);
    setCurrentSessionState(session);

    // Clear current input when switching sessions
    setInput('');
    setSelectedTool(null);
    clearAllAttachments();
  };

  // Voice recording functions with improved Chrome extension support
  const startRecording = async () => {
    try {
      console.log('Starting voice recording...');
      setRecordingStatus('Requesting microphone access...');
      
      // Simple, direct microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      console.log('✅ Microphone access granted');
      setRecordingStatus('Recording your voice... (click to stop)');

      // Create recorder
      const supportedTypes = [
        'audio/wav',
        'audio/mp3',
        'audio/mpeg',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];

      let mimeType = 'audio/wav';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log('Audio chunk received:', e.data.size, 'bytes');
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped, processing audio...');
        const blob = new Blob(chunks, { type: mimeType });
        console.log('Audio blob size:', blob.size, 'bytes');
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          if (base64) {
            console.log('Voice recording completed, base64 length:', base64.length);
            
            const audioContent: MessageContent = {
              type: 'input_audio',
              input_audio: {
                data: base64,
                format: mimeType.includes('mp3') || mimeType.includes('mpeg') ? 'mp3' : 'wav'
              }
            };
            
            addFileAttachment(audioContent);
            console.log('Audio recording attached for multimodal request');
            setRecordingStatus('Voice recording attached!');
            setTimeout(() => setRecordingStatus(''), 2000); // Clear after 2 seconds
          } else {
            console.error('Failed to convert audio to base64');
            setRecordingStatus('Failed to process audio');
          }
        };
        reader.readAsDataURL(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Audio track stopped');
        });
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
      };

      recorder.start(1000); // Record in 1-second chunks
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingStatus('Recording... (click to stop)');
      
      console.log('Voice recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingStatus('Recording failed');
      setIsRecording(false);
      
      // Detailed error handling as suggested
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.log('User blocked or dismissed the microphone prompt');
          alert('Microphone access denied!\n\nTo fix this:\n1. Look for a microphone icon in your browser address bar and click it\n2. Select "Allow" for microphone access\n3. Or go to chrome://extensions/ > Byte Chat > Details > Site settings > Microphone > Allow\n5. Reload the extension and try again');
        } else if (error.name === 'NotFoundError') {
          console.log('No microphone found');
          alert('No microphone found. Please:\n1. Connect a microphone to your computer\n2. Check your system audio settings\n3. Try using "Upload Audio" instead');
        } else if (error.name === 'NotReadableError') {
          console.log('Microphone is busy or in use by another app');
          alert('Microphone is busy or being used by another application.\n\nPlease:\n1. Close other apps that might be using your microphone\n2. Try again in a few seconds\n3. Use "Upload Audio" as an alternative');
        } else {
          console.log('Other microphone error:', error.name, error.message);
          alert(`Recording failed: ${error.message}\n\nTry:\n1. Reloading the extension\n2. Restarting Chrome\n3. Using "Upload Audio" instead`);
        }
      } else {
        alert('Unknown recording error. Please try reloading the extension.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      setRecordingStatus('Processing audio...');
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      console.log('Voice recording stopped');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // File attachment helpers
  const addFileAttachment = (content: MessageContent) => {
    setAttachedFiles(prev => [...prev, content]);
  };

  const removeFileAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllAttachments = () => {
    setAttachedFiles([]);
  };

  // Check microphone permissions using getUserMedia instead of permissions API
  const checkMicrophonePermission = async (): Promise<string> => {
    try {
      // Try to get user media to check permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop immediately
        return 'granted';
      }
      return 'unknown';
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'unknown';
    }
  };

  // Audio helper functions  
  const handleAudioRecord = async () => {
    setShowAudioMenu(false);
    
    // Check permissions first with detailed info
    const permissionState = await checkMicrophonePermission();
    console.log('Permission check result:', permissionState);
    console.log('Current location:', window.location.href);
    console.log('Extension origin:', chrome.runtime.getURL(''));
    
    // Debug system microphone permissions
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Available microphones:', audioInputs.length, audioInputs.map(d => d.label || 'Unnamed'));
      } catch (e) {
        console.log('Could not enumerate devices:', e);
      }
    }
    
    if (permissionState === 'denied') {
      alert('Microphone access is blocked. Please:\n1. Click the camera/microphone icon in your browser address bar\n2. Select "Allow" for microphone access\n3. Or go to chrome://extensions/ > Byte Chat > Details > Site settings > Microphone > Allow\n4. Reload the extension and try again');
      return;
    }
    
    toggleRecording();
  };

  const handleAudioUpload = () => {
    setShowAudioMenu(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size (max 25MB for audio)
        if (file.size > 25 * 1024 * 1024) {
          alert('Audio file too large. Please use files smaller than 25MB.\n\nTip: You can compress audio files using online tools.');
          return;
        }

        // Validate file type
        if (!file.type.startsWith('audio/')) {
          alert('Invalid file type. Please select an audio file (MP3, WAV, etc.)');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const dataUrl = e.target?.result as string;
            if (!dataUrl || !dataUrl.includes(',')) {
              throw new Error('Invalid audio data');
            }

            const base64 = dataUrl.split(',')[1];
            if (!base64) {
              throw new Error('Failed to extract audio data');
            }

            console.log('Audio file uploaded:', file.name, 'Size:', file.size);

            const audioContent: MessageContent = {
              type: 'input_audio',
              input_audio: {
                data: base64,
                format: file.type.includes('mp3') || file.type.includes('mpeg') ? 'mp3' : 'wav'
              }
            };

            addFileAttachment(audioContent);
            console.log('Audio file attached for multimodal request');
          } catch (error) {
            console.error('Error processing audio file:', error);
            alert('Failed to process audio file. Please try a different audio file.');
          }
        };
        reader.onerror = (error) => {
          console.error('FileReader error for audio:', error);
          alert('Failed to read audio file. Please try again.');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div
      className="flex flex-col h-full bg-white min-w-0 max-w-full"
      style={{
        zoom: `${zoomLevel}%`,
        fontSize: `${Math.max(10, 14 * (zoomLevel / 100))}px`
      }}
    >
      {/* Header */}
      <div className="p-2 sm:p-3 border-b border-gray-200 flex-shrink-0">
        {/* Logo, Title, and Balance Row */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">

            {/* Balance Display - Inline */}
            {balance && (
              <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                <div className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                  balance.color === 'red' ? 'text-red-500' :
                  balance.color === 'yellow' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  💰 {balance.display}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {balance.usageDisplay}
                </div>
                {balance.isFreeAccount && (
                  <div className="text-xs text-accent font-medium whitespace-nowrap">
                    🆓 Free Tier
                  </div>
                )}
              </div>
            )}

            {/* Settings Button */}
            {onApiKeyChange && (
              <button
                onClick={() => {
                  if (confirm('Do you want to change your API key? This will clear your current session.')) {
                    // Clear stored API key
                    chrome.storage.local.remove(['openRouterApiKey']);
                    onApiKeyChange();
                  }
                }}
                className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors flex-shrink-0"
                title="Change API Key"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Controls Row - Zoom, Advanced, Refresh */}
        <div className="flex items-center justify-between">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="p-1 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed rounded transition-colors"
              title="Zoom Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>

            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 rounded transition-colors min-w-[3rem]"
              title="Reset Zoom"
            >
              {zoomLevel}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="p-1 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed rounded transition-colors"
              title="Zoom In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>

          {/* Advanced and Refresh Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshModels}
              disabled={loadingModels}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              title="Refresh all models"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-medium text-accent hover:text-accent px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              {showAdvanced ? 'Simple' : 'Advanced'}
            </button>
          </div>
        </div>
        
        {/* Model Selectors - Simplified Layout */}
        <div className="space-y-2">

          {/* Always Visible: Text Model and Session */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            {/* Text Model Selector */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <label className="text-xs font-medium text-gray-600 w-12 sm:w-16 flex-shrink-0">Text</label>
              <select
                value={selectedModels.text}
                onChange={(e) => handleModelChange('text', e.target.value)}
                disabled={loadingModels}
                className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 focus:ring-1 focus:ring-accent focus:border-transparent bg-white"
              >
                <option value="">Select text model</option>
                {categorizedModels.text.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name || model.id} - {getModelPrice(model)}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Selector */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <label className="text-xs font-medium text-gray-600 w-12 sm:w-16 flex-shrink-0">Session</label>
              <SessionSelector
                currentSession={currentSession}
                onSessionChange={handleSessionChange}
              />
            </div>
          </div>

          {/* Advanced Model Selectors - Only shown when toggled */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-2 border-t border-gray-100">
              {/* Image Model Selector */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <label className="text-xs font-medium text-gray-600 w-12 sm:w-16 flex-shrink-0">Image</label>
                <select
                  value={selectedModels.image}
                  onChange={(e) => handleModelChange('image', e.target.value)}
                  disabled={loadingModels}
                  className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 focus:ring-1 focus:ring-accent focus:border-transparent bg-white"
                >
                  <option value="">Select image model</option>
                  {categorizedModels.image.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id} - {getModelPrice(model)}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Model Selector */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <label className="text-xs font-medium text-gray-600 w-12 sm:w-16 flex-shrink-0">File</label>
                <select
                  value={selectedModels.file}
                  onChange={(e) => handleModelChange('file', e.target.value)}
                  disabled={loadingModels}
                  className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 focus:ring-1 focus:ring-accent focus:border-transparent bg-white"
                >
                  <option value="">Select file model</option>
                  {categorizedModels.file.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id} - {getModelPrice(model)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audio Model Selector */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 w-12 sm:w-16 flex-shrink-0">Audio</label>
                <select
                  value={selectedModels.audio}
                  onChange={(e) => handleModelChange('audio', e.target.value)}
                  disabled={loadingModels}
                  className="flex-1 min-w-0 text-xs border border-gray-200 rounded-md px-1.5 sm:px-2 py-1 sm:py-1.5 focus:ring-1 focus:ring-accent focus:border-transparent bg-white"
                >
                  <option value="">Select audio model</option>
                  {categorizedModels.audio.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name || model.id} - {getModelPrice(model)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Main Content - ChatGPT Style */}
      <div className="flex-1 flex flex-col">
        {/* Chat History Area */}
        <ChatHistory
          messages={currentSession?.messages || []}
          isLoading={isLoading}
          streamingResponse={streamingResponse}
        />

        {/* Input Area - Centered in bottom section */}
        <div className="border-t border-gray-200 p-3 sm:p-4 bg-white flex flex-col justify-center min-h-[120px] sm:min-h-[140px] flex-shrink-0">
          {/* Selected Tool Indicator */}
          {selectedTool && (
            <div className="mb-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name={selectedTool.icon} className="w-5 h-5 text-accent" />
                  <span className="text-sm font-medium text-gray-900">{selectedTool.name}</span>
                  <span className="text-xs text-gray-600">• {selectedTool.description}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedTool(null);
                    setFromLanguage('Auto-detect');
                    setToLanguage('English');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* Language Selectors for Translate Tool */}
              {selectedTool.id === 'Translate' && (
                <div className="flex items-center space-x-2 mt-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 flex-1">
                    <label className="text-xs font-medium text-gray-600">From:</label>
                    <select
                      value={fromLanguage}
                      onChange={(e) => setFromLanguage(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-accent focus:border-transparent bg-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Swap languages (except when from is Auto-detect)
                      if (fromLanguage !== 'Auto-detect') {
                        const temp = fromLanguage;
                        setFromLanguage(toLanguage);
                        setToLanguage(temp);
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                    title="Swap languages"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center space-x-2 flex-1">
                    <label className="text-xs font-medium text-gray-600">To:</label>
                    <select
                      value={toLanguage}
                      onChange={(e) => setToLanguage(e.target.value)}
                      className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-accent focus:border-transparent bg-white"
                    >
                      {languages.filter(lang => lang !== 'Auto-detect').map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Attached Files ({attachedFiles.length})
                </span>
                <button
                  onClick={clearAllAttachments}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 px-2 py-1 bg-accent100 text-accent rounded text-xs"
                  >
                    <span>
                      {file.type === 'file' && 'file' in file && file.file ? (
                        file.file.filename.endsWith('.pdf') ? '📄' :
                        file.file.filename.endsWith('.csv') ? '📊' :
                        '📄'
                      ) :
                      file.type === 'text' ? '📝' :
                      file.type === 'image_url' && 'image_url' in file ? '🖼️' : 
                      file.type === 'input_audio' ? '🎤' : '📎'}
                    </span>
                    <span>
                      {file.type === 'file' && 'file' in file && file.file ? file.file.filename : 
                       file.type === 'text' && 'text' in file ? (
                         file.text.startsWith('File: ') ? file.text.split('\n')[0].replace('File: ', '') : 'Text Content'
                       ) :
                       file.type === 'image_url' && 'image_url' in file ? 'Image' :
                       file.type === 'input_audio' ? 'Audio Recording' :
                       'File'}
                    </span>
                    
                    {/* Audio Play Button */}
                    {file.type === 'input_audio' && 'input_audio' in file && (
                      <button
                        onClick={async () => {
                          try {
                            const format = file.input_audio.format;
                            let mimeType = '';
                            
                            // Map format to proper MIME type
                            switch(format) {
                              case 'mp3':
                                mimeType = 'audio/mpeg';
                                break;
                              case 'wav':
                                mimeType = 'audio/wav';
                                break;
                              case 'ogg':
                                mimeType = 'audio/ogg';
                                break;
                              default:
                                mimeType = `audio/${format}`;
                            }
                            
                            console.log(`Playing audio with format: ${format}, MIME type: ${mimeType}`);
                            
                            const dataUrl = `data:${mimeType};base64,${file.input_audio.data}`;
                            const audio = new Audio(dataUrl);
                            
                            // Set playing state
                            setPlayingAudioIndex(index);
                            
                            // Add event listeners
                            audio.addEventListener('canplay', () => console.log('Audio can play'));
                            audio.addEventListener('error', (e) => {
                              console.error('Audio error:', e);
                              setPlayingAudioIndex(null);
                            });
                            audio.addEventListener('ended', () => {
                              console.log('Audio playback ended');
                              setPlayingAudioIndex(null);
                            });
                            audio.addEventListener('loadstart', () => console.log('Audio loading started'));
                            
                            await audio.play();
                            console.log('Audio playback started successfully');
                          } catch (error) {
                            console.error('Audio playback failed:', error);
                            setPlayingAudioIndex(null);
                            alert(`Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                        className={`ml-1 ${playingAudioIndex === index ? 'text-red-500 animate-pulse' : 'text-green-500 hover:text-green-700'}`}
                        title={playingAudioIndex === index ? "Audio playing..." : "Play audio"}
                        disabled={playingAudioIndex !== null && playingAudioIndex !== index}
                      >
                        {playingAudioIndex === index ? '🔴' : '▶️'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => removeFileAttachment(index)}
                      className="text-accent hover:text-accent ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recording Status Display */}
          {recordingStatus && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">🎙️</span>
                <span className="text-sm font-medium text-yellow-700">{recordingStatus}</span>
                {isRecording && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          )}

          {/* Input Box with Vertical Icon Stack */}
          <div className="flex items-start gap-2">
            {/* Vertical Icon Stack - Left Side */}
            <div className="flex flex-col space-y-1 pt-2 flex-shrink-0">
              {/* Tools Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTools(!showTools);
                }}
                className="flex items-center justify-center w-8 h-8 text-accent hover:text-accent hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                title="Select Tool"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Universal File Upload Button */}
              <button
                onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.yaml,.yml,.txt,.md,.rtf,.xml,.html,.epub,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,image/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        try {
                          // Check file size based on type
                          const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for images, 5MB for documents
                          if (file.size > maxSize) {
                            alert(`File too large. Please use files smaller than ${formatFileSize(maxSize)}.\n\nTip: You can compress files using online tools.`);
                            return;
                          }

                          // Handle images separately for better compatibility
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              try {
                                const content = e.target?.result as string;
                                if (!content || !content.startsWith('data:')) {
                                  throw new Error('Invalid image data');
                                }

                                const imageContent: MessageContent = {
                                  type: 'image_url',
                                  image_url: {
                                    url: content
                                  }
                                };

                                addFileAttachment(imageContent);
                                console.log('Image attached:', file.name, 'Size:', formatFileSize(file.size));
                              } catch (error) {
                                console.error('Error processing image:', error);
                                alert('Failed to process image. Please try a different file.');
                              }
                            };
                            reader.readAsDataURL(file);
                          } else {
                            // Use the encoder for all other file types
                            const encodedFile = await encodeFileToBase64(file);

                            const mimeType = encodedFile.type || getMimeTypeFromExtension(file.name);
                            console.log('File encoded:', file.name, 'Size:', formatFileSize(file.size), 'Type:', mimeType);

                            // PDFs and CSVs use special file type with nested structure
                            if (mimeType === 'application/pdf' || mimeType === 'text/csv') {
                              // PDF and CSV use nested file object structure
                              const fileContent: MessageContent = {
                                type: 'file',
                                file: {
                                  filename: file.name,
                                  file_data: `data:${mimeType};base64,${encodedFile.data}`
                                }
                              };

                              addFileAttachment(fileContent);
                              console.log('PDF/CSV attached with file structure:', file.name);
                            } else if (mimeType.includes('word') ||
                                mimeType.includes('document') ||
                                mimeType.includes('excel') ||
                                mimeType.includes('spreadsheet') ||
                                mimeType === 'application/json' ||
                                mimeType.includes('yaml') ||
                                mimeType === 'text/plain' ||
                                mimeType === 'text/markdown' ||
                                mimeType === 'text/html' ||
                                mimeType === 'application/xml' ||
                                mimeType === 'text/xml') {

                              // For other documents, decode the base64 and send as plain text
                              try {
                                // Decode base64 to get the actual text content
                                const textContent = atob(encodedFile.data);

                                // Add as plain text message
                                const fileContent: MessageContent = {
                                  type: 'text',
                                  text: `File: ${file.name}\n\nContent:\n${textContent}`
                                };

                                addFileAttachment(fileContent);
                                console.log('Document content extracted and added as text:', file.name);
                              } catch (decodeError) {
                                // If decoding fails, fall back to sending the data URL
                                console.error('Failed to decode file as text:', decodeError);
                                alert('Unable to read this file as text. Please try a different format.');
                              }
                            } else {
                              // Use image_url for other types
                              const fileDataUrl = `data:${mimeType};base64,${encodedFile.data}`;
                              const fileContent: MessageContent = {
                                type: 'image_url',
                                image_url: {
                                  url: fileDataUrl
                                }
                              };

                              addFileAttachment(fileContent);
                              console.log('File attached as image_url type');
                            }
                          }
                        } catch (error) {
                          console.error('Error processing file:', error);
                          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                            alert('Storage quota exceeded. Please use a smaller file or clear browser storage.');
                          } else if (error instanceof Error) {
                            alert(error.message);
                          } else {
                            alert('Error processing file. Please try again.');
                          }
                        }
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center justify-center w-8 h-8 text-accent hover:text-accent hover:bg-blue-50 rounded-lg transition-colors z-10 flex-shrink-0"
                  title="Upload File (PDF, Word, Excel, CSV, JSON, YAML, Images, etc.)"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z"/>
                  </svg>
                </button>

              {/* Voice Recording Button with Dropdown */}
              <div className="relative audio-menu-container">
                  {isRecording ? (
                    // Stop Recording Button
                    <button
                      onClick={toggleRecording}
                      className="flex items-center justify-center w-8 h-8 bg-red-500 text-white animate-pulse rounded-lg transition-colors z-10 flex-shrink-0"
                      title="Click to Stop Recording"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z"/>
                      </svg>
                    </button>
                  ) : (
                    // Audio Options Button
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Audio button clicked! Current showAudioMenu:', showAudioMenu);
                        setShowAudioMenu(!showAudioMenu);
                      }}
                      className="flex items-center justify-center w-8 h-8 text-accent hover:text-accent hover:bg-blue-50 rounded-lg transition-colors z-10 flex-shrink-0"
                      title="Audio Options"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z"/>
                        <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z"/>
                      </svg>
                    </button>
                  )}

                  {/* Audio Options Dropdown */}
                  {showAudioMenu && !isRecording && (
                    <div
                      className={
                        // If we're in the sidebar iframe, keep it anchored to the button.
                        new URLSearchParams(location.search).get('mode') === 'sidebar'
                          ? "absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[180px]"
                          // In the browser-action popup, use fixed + ultra-high z-index so it never gets clipped.
                          : "fixed bottom-24 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-[2147483647] min-w-[180px]"
                      }
                    >
                      <button
                        onClick={handleAudioRecord}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 rounded-t-lg"
                      >
                        <span>🎙️</span>
                        <span className="text-sm">Record Audio</span>
                      </button>
                      <button
                        onClick={handleAudioUpload}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 rounded-b-lg"
                      >
                        <span>📁</span>
                        <span className="text-sm">Upload Audio</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback Mail Icon */}
                <button
                  onClick={() => {
                    const subject = encodeURIComponent('ByteChat Feedback - Earn 3 Months Premium');
                    const body = encodeURIComponent('Hi Saurav,\n\nI would like to provide feedback about ByteChat:\n\n[Please share your feedback here]\n\nBest regards');
                    window.open(`mailto:saurav@bytebell.ai?subject=${subject}&body=${body}`, '_blank');
                  }}
                  className="flex items-center justify-center w-8 h-8 text-accent hover:text-accent hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 group relative"
                  title="Provide feedback and earn 3 months free premium!"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z"/>
                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z"/>
                  </svg>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    <div className="text-center">
                      <div className="font-medium">💎 Earn 3 Months Premium!</div>
                      <div className="text-gray-300 mt-1">Share feedback & get free premium access</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </button>
            </div>

            {/* Text Input Area - Right Side */}
            <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={handleTextareaResize}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={selectedTool ? "Enter text to process..." : "Ask anything..."}
                  disabled={isLoading}
                  className="w-full h-[148px] max-h-[240px] rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-accent focus:border-transparent pr-10 disabled:bg-gray-50"
                />

                {/* Submit Button - Positioned in bottom right of textarea */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !input.trim()}
                  className="absolute bottom-2 right-2 flex items-center justify-center w-8 h-8 gradient-primary hover:opacity-90 disabled:bg-gray-300 text-black rounded-lg transition-all"
                  title={isLoading ? "Processing..." : "Send message"}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Tools Dropdown */}
            {showTools && (
              <div
                className="absolute bottom-12 left-3 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 tools-dropdown"
              >
                  <div className="p-3">
                    <div className="text-xs font-bold text-gray-600 mb-3 px-2">SELECT TOOL</div>

                    <button
                      onClick={() => {
                        setSelectedTool(null);
                        setShowTools(false);
                      }}
                      className={`w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                        !selectedTool ? 'bg-blue-50 text-accent' : 'text-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-accent">
                          <Icon name="chat" className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs">Chat</div>
                          <div className="text-xs text-gray-600 mt-0.5">Ask anything directly</div>
                        </div>
                      </div>
                    </button>

                    {tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          handleToolSelect(tool);
                          setShowTools(false);
                        }}
                        className={`w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                          selectedTool?.id === tool.id ? 'bg-blue-50 text-accent' : 'text-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={selectedTool?.id === tool.id ? 'text-accent' : 'text-gray-600'}>
                            <Icon name={tool.icon} className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs">{tool.name}</div>
                            <div className="text-xs text-gray-600 mt-0.5 leading-tight">{tool.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
  );
};

export default MainInterface;
