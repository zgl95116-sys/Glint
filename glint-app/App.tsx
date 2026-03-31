import React, { useState, useCallback, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { LockScreen } from './components/LockScreen';
import { streamPageGeneration } from './services/geminiService';

type Screen = 'home' | 'lockscreen';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleGenerate = useCallback(async (prompt: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setScreen('lockscreen');
    setIsLoading(true);
    setHtmlContent('');

    let fullHtml = '';

    try {
      const stream = streamPageGeneration(prompt, controller.signal);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        fullHtml += chunk;
        setHtmlContent(fullHtml);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Generation failed', e);
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  }, []);

  const handleBack = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setScreen('home');
    setIsLoading(false);
    setHtmlContent('');
  }, []);

  return screen === 'home' ? (
    <HomeScreen onGenerate={handleGenerate} />
  ) : (
    <LockScreen
      htmlContent={htmlContent}
      isLoading={isLoading}
      onBack={handleBack}
    />
  );
};

export default App;
