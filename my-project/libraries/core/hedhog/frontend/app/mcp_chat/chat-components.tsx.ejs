'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { RefObject, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Conversation, Message } from './chat-types';

type MarkdownComponentProps = {
  children?: React.ReactNode;
  className?: string;
  href?: string;
};

const markdownComponents: Record<
  string,
  (props: MarkdownComponentProps) => React.ReactNode
> = {
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
  },
  ul({ children }) {
    return <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  code({ children, className }) {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <code className="block rounded-md bg-black/10 dark:bg-white/10 px-3 py-2 text-xs font-mono whitespace-pre-wrap my-2">
        {children}
      </code>
    ) : (
      <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 text-xs font-mono">
        {children}
      </code>
    );
  },
  pre({ children }) {
    return <pre className="my-2 overflow-x-auto rounded-md">{children}</pre>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-current/30 pl-3 italic my-2 text-current/70">
        {children}
      </blockquote>
    );
  },
  h1({ children }) {
    return (
      <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
    );
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="my-3 border-current/20" />;
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="text-xs border-collapse w-full">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-current/20 px-2 py-1 font-semibold text-left bg-current/5">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border border-current/20 px-2 py-1">{children}</td>;
  },
};

export function ToolBadge({
  message,
  variant,
}: {
  message: Message;
  variant: 'call' | 'result';
}) {
  const [expanded, setExpanded] = useState(false);
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    parsed = message.content;
  }

  const colorClass =
    variant === 'call'
      ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';

  const preClass =
    variant === 'call'
      ? 'border-violet-100 bg-violet-50/50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
      : 'border-emerald-100 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200';

  return (
    <div className="my-1 flex flex-col items-start">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 cursor-pointer ${colorClass}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="font-mono">{message.tool_name}</span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
      </button>
      {expanded && (
        <pre
          className={`mt-1.5 w-full max-w-lg rounded-lg border px-3 py-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap ${preClass}`}
        >
          {typeof parsed === 'string'
            ? parsed
            : JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}

const TYPING_STATUSES = [
  'Pensando...',
  'Consultando ferramentas...',
  'Processando informações...',
  'Aguardando resposta...',
];

const TYPING_STATUS_DURATIONS = [3000, 5000, 5000];

export function TypingIndicator() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    setStatusIndex(0);
  }, []);

  useEffect(() => {
    const duration = TYPING_STATUS_DURATIONS[statusIndex];
    if (duration === undefined) return;
    const timer = setTimeout(() => {
      setStatusIndex((i) => Math.min(i + 1, TYPING_STATUSES.length - 1));
    }, duration);
    return () => clearTimeout(timer);
  }, [statusIndex]);

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background">
        <Bot className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-3 shadow-sm">
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
        <AnimatePresence mode="wait">
          <motion.span
            key={statusIndex}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.2 }}
            className="ml-1 text-xs text-muted-foreground select-none"
          >
            {TYPING_STATUSES[statusIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

type ConversationListProps = {
  conversations: Conversation[];
  selectedConvId: number | null;
  isLoading: boolean;
  emptyLabel: string;
  onSelect: (id: number) => void;
  onDelete: (conversation: Conversation) => void;
};

export function ConversationList({
  conversations,
  selectedConvId,
  isLoading,
  emptyLabel,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 pt-2 px-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`conv-skeleton-${index}`}
            className="h-9 rounded-xl bg-muted/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 pt-1">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`group flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors text-sm ${
            selectedConvId === conv.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-foreground'
          }`}
          onClick={() => {
            onSelect(conv.id);
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="truncate text-xs font-medium">
              {conv.title || `#${conv.id}`}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 cursor-pointer transition-opacity ${
              selectedConvId === conv.id
                ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                : 'hover:bg-destructive/10 hover:text-destructive'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

type ChatInputProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  submitOnEnter?: boolean;
  input: string;
  isSending: boolean;
  isUploadingFile: boolean;
  disabled?: boolean;
  attachments: Array<{ id: number; name: string }>;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  attachLabel: string;
  uploadingFileLabel: string;
  removeAttachmentLabel: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onUploadFiles: (files: FileList) => void;
  onRemoveAttachment: (id: number) => void;
};

export function ChatInput({
  textareaRef,
  submitOnEnter = true,
  input,
  isSending,
  isUploadingFile,
  disabled = false,
  attachments,
  placeholder,
  sendLabel,
  sendingLabel,
  attachLabel,
  uploadingFileLabel,
  removeAttachmentLabel,
  onInputChange,
  onSend,
  onUploadFiles,
  onRemoveAttachment,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFile(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      onUploadFiles(files);
    }
  };

  return (
    <div
      className={`relative rounded-[28px] border px-2.5 md:px-3 py-2.5 shadow-sm transition-colors duration-200 ${
        isDraggingFile
          ? 'border-primary/60 bg-primary/5'
          : 'border-border/70 bg-muted/45'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            onUploadFiles(files);
          }
        }}
      />

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            className="mb-2 flex flex-wrap gap-1.5 px-1"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <AnimatePresence initial={false}>
              {attachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.94 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/75 px-2.5 py-1.5 text-[11px]"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-45 truncate" title={attachment.name}>
                    {attachment.name}
                  </span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    aria-label={`${removeAttachmentLabel}: ${attachment.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 h-10 w-10 rounded-full cursor-pointer border border-border/60 bg-background/85 hover:bg-background"
          aria-label={attachLabel}
          onClick={handleOpenFilePicker}
          disabled={disabled || isSending || isUploadingFile}
        >
          {isUploadingFile ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>

        <Textarea
          ref={textareaRef}
          className="resize-none flex-1 border-0! bg-transparent! shadow-none! focus-visible:ring-0! px-2.5 py-2.5 min-h-10 max-h-40 md:max-h-75 overflow-y-auto text-sm text-foreground leading-5 placeholder:text-sm placeholder:leading-5 placeholder:text-muted-foreground transition-[height] duration-150 ease-out"
          placeholder={isUploadingFile ? uploadingFileLabel : placeholder}
          value={input}
          disabled={disabled || isSending}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
        />

        <Button
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full cursor-pointer"
          aria-label={isSending ? sendingLabel : sendLabel}
          disabled={disabled || isSending || (!input.trim() && attachments.length === 0)}
          onClick={onSend}
        >
          {isSending ? (
            <Spinner className="h-4 w-4" aria-label={sendingLabel} />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-[28px] border-2 border-dashed border-primary/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

type MessageFeedProps = {
  messages: Message[];
  isLoadingMessages: boolean;
  isSending: boolean;
  isStreamingResponse: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
};

export function MessageFeed({
  messages,
  isLoadingMessages,
  isSending,
  isStreamingResponse,
  messagesEndRef,
}: MessageFeedProps) {
  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto">
      {isLoadingMessages && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`msg-skeleton-${index}`}
              className="h-14 rounded-2xl bg-muted/60 animate-pulse"
            />
          ))}
        </div>
      )}
      {messages.map((msg, idx) => {
        if (msg.role === 'tool_call') {
          return <ToolBadge key={msg.id ?? idx} message={msg} variant="call" />;
        }
        if (msg.role === 'tool_result') {
          return (
            <ToolBadge key={msg.id ?? idx} message={msg} variant="result" />
          );
        }
        if (msg.role === 'user') {
          return (
            <div key={msg.id ?? idx} className="flex justify-end">
              <div className="max-w-[90%] whitespace-pre-wrap wrap-break-word rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm md:max-w-[75%]">
                {msg.content}
              </div>
            </div>
          );
        }
        return (
          <div key={msg.id ?? idx} className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background shadow-sm">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="max-w-[90%] wrap-break-word rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm shadow-sm prose-sm md:max-w-[75%]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents as never}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
      {isSending && !isStreamingResponse && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  selectedConvId,
  isLoading,
  emptyLabel,
  conversationsLabel,
  newConversationLabel,
  onCreate,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  selectedConvId: number | null;
  isLoading: boolean;
  emptyLabel: string;
  conversationsLabel: string;
  newConversationLabel: string;
  onCreate: () => void;
  onSelect: (id: number) => void;
  onDelete: (conversation: Conversation) => void;
}) {
  return (
    <>
      <div className="p-3 border-b bg-background/50">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 cursor-pointer rounded-xl h-9 text-sm font-medium"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          {newConversationLabel}
        </Button>
      </div>
      <div className="px-4 pt-4 pb-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {conversationsLabel}
        </p>
      </div>
      <ScrollArea className="flex-1 px-2 pb-2">
        <ConversationList
          conversations={conversations}
          selectedConvId={selectedConvId}
          isLoading={isLoading}
          emptyLabel={emptyLabel}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      </ScrollArea>
    </>
  );
}
