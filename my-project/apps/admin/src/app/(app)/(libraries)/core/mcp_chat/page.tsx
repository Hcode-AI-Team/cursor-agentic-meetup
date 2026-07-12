'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ResizableSheetContent } from '@/components/ui/resizable-sheet-content';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useFormDraft } from '@/hooks/use-form-draft';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApp, useQuery } from '@hed-hog/next-app-provider';
import { Bot, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChatInput, ConversationSidebar, MessageFeed } from './chat-components';
import { Conversation, Message } from './chat-types';

export default function McpChatPage() {
  const { request, currentLocaleCode, refetchUser, accessToken, getSettingValue } = useApp();
  const t = useTranslations('core.McpChatPage');
  const mcpEnabled = getSettingValue('mcp-enabled') !== false;
  const isMobile = useIsMobile();

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isMobileConversationsOpen, setIsMobileConversationsOpen] =
    useState(false);
  const [convToDelete, setConvToDelete] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingTimeoutRef = useRef<number | null>(null);
  const streamingRunRef = useRef(0);
  const streamAbortRef = useRef<AbortController | null>(null);

  const selectedConversationDraft = useFormDraft<number | null>({
    storageKey: 'mcp-chat-selected-conversation-draft',
    value: selectedConvId,
    hasData: selectedConvId !== null,
    debounceMs: 250,
  });

  const {
    clearDraft: clearMessageInputDraft,
    loadDraft: loadMessageInputDraft,
  } = useFormDraft<string>({
    storageKey: `mcp-chat-input-${selectedConvId ?? 'new'}-draft`,
    value: input,
    hasData: input.trim().length > 0,
    debounceMs: 300,
  });

  const {
    data: conversations,
    refetch: refetchConvs,
    isLoading: isLoadingConversations,
  } = useQuery<Conversation[]>({
    queryKey: ['mcp-chat-conversations', currentLocaleCode],
    queryFn: async () => {
      const res = await request<Conversation[]>({
        url: '/mcp-chat',
        method: 'GET',
      });
      return res.data;
    },
    enabled: mcpEnabled,
  });

  const convList = useMemo(() => conversations ?? [], [conversations]);
  const selectedConv = convList.find((c) => c.id === selectedConvId) ?? null;
  const activeMessageConversationId = mcpEnabled ? selectedConvId : null;

  useEffect(() => {
    if (selectedConvId !== null || convList.length === 0) return;
    const draft = selectedConversationDraft.loadDraft();
    const draftConvId = draft?.payload;
    if (typeof draftConvId !== 'number') return;

    if (convList.some((conv) => conv.id === draftConvId)) {
      setSelectedConvId(draftConvId);
      return;
    }

    selectedConversationDraft.clearDraft();
  }, [convList, selectedConvId, selectedConversationDraft]);

  useEffect(() => {
    const draft = loadMessageInputDraft();
    if (typeof draft?.payload === 'string') {
      setInput(draft.payload);
      return;
    }

    setInput('');
  }, [selectedConvId, loadMessageInputDraft]);

  useEffect(() => {
    if (!activeMessageConversationId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    request<Message[]>({
      url: `/mcp-chat/${activeMessageConversationId}/messages`,
      method: 'GET',
    })
      .then((res) => {
        if (isMounted) {
          setMessages(res.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessages([]);
          toast.error(t('loadMessagesError'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [request, activeMessageConversationId, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, isLoadingMessages, isStreamingResponse]);

  function stopStreaming() {
    streamingRunRef.current += 1;
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
    if (streamingTimeoutRef.current !== null) {
      window.clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    setIsStreamingResponse(false);
  }

  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
      if (streamingTimeoutRef.current !== null) {
        window.clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  async function streamAssistantMessage(responseMessages: Message[]) {
    const lastAssistantIdx = [...responseMessages]
      .map((msg, idx) => ({ msg, idx }))
      .reverse()
      .find(({ msg }) => msg.role === 'assistant')?.idx;

    if (lastAssistantIdx === undefined) {
      setMessages(responseMessages);
      return;
    }

    const target = responseMessages[lastAssistantIdx] as Message;
    const fullContent = target.content ?? '';

    if (fullContent.length < 24) {
      setMessages(responseMessages);
      return;
    }

    stopStreaming();
    const runId = ++streamingRunRef.current;
    setIsStreamingResponse(true);

    const baseMessages: Message[] = responseMessages.map(
      (msg, idx): Message =>
        idx === lastAssistantIdx ? { ...msg, content: '' } : msg
    );
    setMessages(baseMessages);

    await new Promise<void>((resolve) => {
      let cursor = 0;
      const chunkSize = Math.max(
        8,
        Math.min(32, Math.ceil(fullContent.length / 80))
      );

      const tick = () => {
        if (streamingRunRef.current !== runId) {
          resolve();
          return;
        }

        cursor = Math.min(fullContent.length, cursor + chunkSize);
        const nextMessages: Message[] = responseMessages.map(
          (msg, idx): Message =>
            idx === lastAssistantIdx
              ? { ...target, content: fullContent.slice(0, cursor) }
              : msg
        );
        setMessages(nextMessages);

        if (cursor >= fullContent.length) {
          resolve();
          return;
        }

        streamingTimeoutRef.current = window.setTimeout(tick, 16);
      };

      tick();
    });

    if (streamingRunRef.current === runId) {
      setMessages(responseMessages);
      setIsStreamingResponse(false);
      streamingTimeoutRef.current = null;
    }
  }

  async function sendMessageViaStream(
    conversationId: number,
    message: string,
    tempAssistantId: number
  ): Promise<Message[] | null> {
    const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
    const apiBase = rawBase.replace(/\/$/, '');
    const url = `${apiBase}/mcp-chat/${conversationId}/messages/stream`;

    const controller = new AbortController();
    streamAbortRef.current = controller;
    setIsStreamingResponse(true);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Accept-Language': currentLocaleCode,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`stream-unavailable:${response.status}`);
    }

    let accumulated = '';
    setMessages((prev) => [
      ...prev,
      {
        id: tempAssistantId,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        tool_name: null,
        tool_call_id: null,
        created_at: new Date().toISOString(),
      },
    ]);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let doneMessages: Message[] | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        const dataLines = eventBlock
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) continue;
        const payloadText = dataLines.join('\n');

        let payload: {
          type?: 'chunk' | 'done' | 'error';
          content?: string;
          message?: string;
          messages?: Message[];
        };
        try {
          payload = JSON.parse(payloadText);
        } catch {
          continue;
        }

        if (payload.type === 'chunk') {
          const chunk = payload.content ?? '';
          if (!chunk) continue;
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantId
                ? { ...msg, content: accumulated }
                : msg
            )
          );
        }

        if (payload.type === 'done' && Array.isArray(payload.messages)) {
          doneMessages = payload.messages;
        }

        if (payload.type === 'error') {
          throw new Error(payload.message || 'stream-error');
        }
      }
    }

    return doneMessages;
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    const maxHeight = isMobile ? 160 : 300;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);

    const frameId = window.requestAnimationFrame(() => {
      textarea.style.height = `${nextHeight}px`;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [input, isMobile]);

  function handleSelectConversation(convId: number) {
    stopStreaming();
    setSelectedConvId(convId);
    setMessages([]);
    if (isMobile) {
      setIsMobileConversationsOpen(false);
    }
  }

  async function handleNewConversation() {
    if (!mcpEnabled) return null;

    try {
      stopStreaming();
      const res = await request<Conversation>({
        url: '/mcp-chat',
        method: 'POST',
        data: {},
      });
      await refetchConvs();
      setSelectedConvId(res.data.id);
      setMessages([]);
      setInput('');
      if (isMobile) {
        setIsMobileConversationsOpen(false);
      }
      return res.data.id;
    } catch {
      toast.error(t('createConversationError'));
      return null;
    }
  }

  async function handleSend() {
    if (
      !mcpEnabled ||
      (!input.trim() && attachments.length === 0) ||
      isSending ||
      isUploadingFile
    )
      return;
    let activeConvId = selectedConvId;
    if (!activeConvId) {
      activeConvId = await handleNewConversation();
      if (!activeConvId) return;
    }
    setIsSending(true);
    const currentInput = input;
    const currentAttachments = attachments;
    const tempId = -Date.now();
    const attachmentsBlock =
      currentAttachments.length > 0
        ? `\n\n${t('attachedFilesPrefix')}\n${currentAttachments
            .map((file) => `- ${file.name} (file_id: ${file.id})`)
            .join('\n')}`
        : '';
    const payloadMessage = `${currentInput.trim()}${attachmentsBlock}`.trim();

    setInput('');
    setAttachments([]);
    clearMessageInputDraft();

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        conversation_id: activeConvId!,
        role: 'user',
        content: payloadMessage,
        tool_name: null,
        tool_call_id: null,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      stopStreaming();
      const tempAssistantId = -(Date.now() + 1);
      let finalMessages: Message[] | null = null;

      try {
        finalMessages = await sendMessageViaStream(
          activeConvId,
          payloadMessage,
          tempAssistantId
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));

        const fallbackRes = await request<Message[]>({
          url: `/mcp-chat/${activeConvId}/messages`,
          method: 'POST',
          data: { message: payloadMessage },
        });
        finalMessages = fallbackRes.data;
        await streamAssistantMessage(finalMessages);
      }

      if (finalMessages) {
        setMessages(finalMessages);
      }

      await refetchConvs();
      const hadToolUse = (finalMessages ?? []).some(
        (m) => m.role === 'tool_call' || m.role === 'tool_result'
      );
      if (hadToolUse) await refetchUser();
    } catch {
      toast.error(t('sendMessageError'));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(currentInput);
      setAttachments(currentAttachments);
    } finally {
      streamAbortRef.current = null;
      setIsStreamingResponse(false);
      setIsSending(false);
    }
  }

  const uploadAttachment = async (file: File) => {
    const existingNames = new Set(attachments.map((item) => item.name));
    if (existingNames.has(file.name)) {
      return;
    }

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('destination', 'mcp-chat/attachments');

      const { data } = await request<{ id: number; filename?: string }>({
        url: '/file',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!data?.id) {
        throw new Error('invalid-file-id');
      }

      setAttachments((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.filename || file.name,
        },
      ]);
    } catch {
      toast.error(t('uploadFileError'));
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleUploadFiles = (files: FileList) => {
    const queue = Array.from(files);
    void (async () => {
      for (const file of queue) {
        await uploadAttachment(file);
      }
    })();
  };

  const handleRemoveAttachment = (id: number) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  async function handleDeleteConversation() {
    if (!convToDelete) return;
    try {
      await request({
        url: '/mcp-chat',
        method: 'DELETE',
        data: { ids: [convToDelete.id] },
      });
      toast.success(t('deleteConversationSuccess'));
      if (selectedConvId === convToDelete.id) {
        setSelectedConvId(null);
        setMessages([]);
        setInput('');
      }
      setConvToDelete(null);
      await refetchConvs();
    } catch {
      toast.error(t('deleteConversationError'));
    }
  }

  const sidebarContent = (
    <ConversationSidebar
      conversations={convList}
      selectedConvId={selectedConvId}
      isLoading={isLoadingConversations}
      emptyLabel={t('emptyConversations')}
      conversationsLabel={t('conversations')}
      newConversationLabel={t('newConversation')}
      onCreate={() => {
        void handleNewConversation();
      }}
      onSelect={handleSelectConversation}
      onDelete={setConvToDelete}
    />
  );

  if (!mcpEnabled) {
    return (
      <div className="flex h-dvh min-h-0 items-center justify-center bg-background px-4">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('mcpDisabled')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-muted/30">
        {sidebarContent}
      </aside>

      <Sheet
        open={isMobileConversationsOpen}
        onOpenChange={setIsMobileConversationsOpen}
      >
        <ResizableSheetContent
          sheetId="core-mcp-chat-mobile-conversations-sheet"
          defaultWidth={320}
          minWidth={280}
          maxWidth={560}
          side="left"
          className="w-[85vw] max-w-[320px] p-0 [&>button]:top-2 [&>button]:right-2 [&>button]:z-20"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t('conversations')}</SheetTitle>
            <SheetDescription>{t('openConversations')}</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col bg-muted/30 pt-11">
            {sidebarContent}
          </div>
        </ResizableSheetContent>
      </Sheet>

      {/* Main area */}
      <main className="flex-1 flex min-h-0 min-w-0 flex-col overflow-hidden">
        {isMobile && (
          <header className="h-12 shrink-0 border-b flex items-center px-3 gap-2 bg-background/90 backdrop-blur-sm md:hidden">
            <SidebarTrigger className="h-8 w-8 cursor-pointer" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => setIsMobileConversationsOpen(true)}
              aria-label={t('openConversations')}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium truncate">
              {selectedConv?.title || t('title')}
            </span>
          </header>
        )}

        {!selectedConvId ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 md:gap-8 md:px-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t('title')}
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('description')}
              </p>
            </div>
            <div className="w-full max-w-2xl px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-0 md:pb-0">
              <ChatInput
                textareaRef={textareaRef}
                submitOnEnter={!isMobile}
                input={input}
                isSending={isSending}
                isUploadingFile={isUploadingFile}
                disabled={!mcpEnabled}
                attachments={attachments}
                placeholder={t('placeholder')}
                sendLabel={t('send')}
                sendingLabel={t('sending')}
                attachLabel={t('attachFile')}
                uploadingFileLabel={t('uploadingFile')}
                removeAttachmentLabel={t('removeAttachment')}
                onInputChange={setInput}
                onSend={() => {
                  void handleSend();
                }}
                onUploadFiles={handleUploadFiles}
                onRemoveAttachment={handleRemoveAttachment}
              />
            </div>
          </div>
        ) : (
          /* Chat state */
          <>
            {/* Header */}
            <header className="h-14 shrink-0 border-b items-center px-4 md:px-6 gap-3 bg-background/80 backdrop-blur-sm hidden md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">
                  {selectedConv?.title || `Chat #${selectedConvId}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('title')}
                </span>
              </div>
            </header>

            {/* Messages */}
            <ScrollArea className="min-h-0 flex-1 px-3 py-4 md:px-4 md:py-6">
              <MessageFeed
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isSending={isSending}
                isStreamingResponse={isStreamingResponse}
                messagesEndRef={messagesEndRef}
              />
            </ScrollArea>

            {/* Input */}
            <div className="shrink-0 border-t bg-background/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:px-6 md:py-4">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  textareaRef={textareaRef}
                  submitOnEnter={!isMobile}
                  input={input}
                  isSending={isSending}
                  isUploadingFile={isUploadingFile}
                  disabled={!mcpEnabled}
                  attachments={attachments}
                  placeholder={t('placeholder')}
                  sendLabel={t('send')}
                  sendingLabel={t('sending')}
                  attachLabel={t('attachFile')}
                  uploadingFileLabel={t('uploadingFile')}
                  removeAttachmentLabel={t('removeAttachment')}
                  onInputChange={setInput}
                  onSend={() => {
                    void handleSend();
                  }}
                  onUploadFiles={handleUploadFiles}
                  onRemoveAttachment={handleRemoveAttachment}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <AlertDialog
        open={Boolean(convToDelete)}
        onOpenChange={(open) => {
          if (!open) setConvToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConversation')}?</AlertDialogTitle>
            <AlertDialogDescription>
              {convToDelete?.title || `#${convToDelete?.id}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation}>
              {t('deleteConversation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
