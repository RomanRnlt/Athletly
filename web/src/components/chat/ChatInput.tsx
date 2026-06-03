'use client';

// Web port of mobile/components/chat/ChatInput.tsx. Multiline TextInput ->
// auto-growing <textarea>; Enter sends, Shift+Enter inserts a newline.
import React, { useRef, useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { Colors } from '@/lib/colors';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MAX_INPUT_LINES = 5;
const LINE_HEIGHT = 20;
const MAX_INPUT_HEIGHT = MAX_INPUT_LINES * LINE_HEIGHT + 16;

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0 || disabled) return;
    onSend(trimmed);
    setText('');
    if (taRef.current) taRef.current.style.height = '36px';
  };

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  };

  const hasText = text.trim().length > 0;

  return (
    <div
      className="bg-white px-4 pt-2 pb-2"
      style={{ boxShadow: '0 -1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex flex-row items-end gap-2">
        <button
          type="button"
          disabled={disabled}
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{ opacity: disabled ? 0.4 : 1 }}
          aria-label="Spracheingabe"
        >
          <Mic size={20} color={Colors.textSecondary} strokeWidth={2} />
        </button>

        <div
          className="flex-1 rounded-2xl px-4 flex items-center"
          style={{ backgroundColor: '#F5F6F8', minHeight: 36, maxHeight: MAX_INPUT_HEIGHT }}
        >
          <textarea
            ref={taRef}
            className="flex-1 w-full bg-transparent outline-none resize-none text-text-primary text-base"
            style={{ lineHeight: `${LINE_HEIGHT}px`, paddingTop: 8, paddingBottom: 8, maxHeight: MAX_INPUT_HEIGHT, height: 36 }}
            placeholder="Nachricht..."
            value={text}
            rows={1}
            disabled={disabled}
            onChange={(e) => {
              setText(e.target.value);
              autosize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {hasText && (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled}
            className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0"
            style={{ opacity: disabled ? 0.5 : 1 }}
            aria-label="Nachricht senden"
          >
            <Send size={18} color="#FFFFFF" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatInput;
