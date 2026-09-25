import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import type {
  FamilyMember,
  ProviderProfile,
  ChatSessionItem,
  ChatMessageItem as ChatMessageType,
  DocumentItem,
  ChatStreamEvent,
} from '../../../shared/types';
import { ChatComposer } from './ChatComposer';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatSessionSidebar } from './ChatSessionSidebar';
import { EmptyChatState } from './EmptyChatState';
import { ProvenancePill } from '../common/ProvenancePill';
import { DisclaimerBar } from '../common/DisclaimerBar';

interface ChatAssistantViewProps {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember) => void;
  providers: ProviderProfile[];
  onOpenDocumentPreview?: (document: DocumentItem) => void;
  onUploadDocument?: (folderId: string) => void;
  onOpenSettings?: () => void;
}

export const ChatAssistantView: React.FC<ChatAssistantViewProps> = ({
  members,
  selectedMember,
  onSelectMember,
  providers,
  onOpenDocumentPreview,
  onUploadDocument,
  onOpenSettings,
}) => {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [memberDocCounts, setMemberDocCounts] = useState<Record<string, number>>({});
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as messages stream
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Load document counts per member
  const loadDocCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      try {
        const folders = await window.medbuddy.listFolders(m.id);
        let total = 0;
        for (const f of folders) {
          const docs = await window.medbuddy.listDocuments(f.id);
          total += docs.length;
        }
        counts[m.id] = total;
      } catch {
        counts[m.id] = 0;
      }
    }
    setMemberDocCounts(counts);
  }, [members]);

  useEffect(() => {
    loadDocCounts();
  }, [loadDocCounts]);

  // Load chat sessions
  const loadSessions = useCallback(async () => {
    try {
      const list = await window.medbuddy.listChatSessions();
      setSessions(list);
      // Auto-select latest session if activeSessionId is not set
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      }
    } catch {
      // Ignore
    }
  }, [activeSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Load messages when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    let isSubscribed = true;
    window.medbuddy.getChatSession(activeSessionId).then((result) => {
      if (isSubscribed && result) {
        setMessages(result.messages);
        // If session is bound to a member, synchronize selected member
        if (result.session.memberId) {
          const matchingMember = members.find((m) => m.id === result.session.memberId);
          if (matchingMember && selectedMember?.id !== matchingMember.id) {
            onSelectMember(matchingMember);
          }
        }
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [activeSessionId, members, onSelectMember, selectedMember?.id]);

  // Listen to live streaming IPC events
  useEffect(() => {
    const cleanup = window.medbuddy.onChatStream((event: ChatStreamEvent) => {
      if (event.sessionId !== activeSessionId) return;

      setMessages((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === event.messageId);

        if (existingIdx !== -1) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            content: (curr.content || '') + (event.tokenDelta || ''),
            reasoningContent: (curr.reasoningContent || '') + (event.reasoningDelta || ''),
            citedChunks: event.citedChunks || curr.citedChunks || [],
          };
          return updated;
        } else {
          // New assistant message incoming
          const newMsg: ChatMessageType = {
            id: event.messageId,
            sessionId: event.sessionId,
            role: 'assistant',
            content: event.tokenDelta || '',
            reasoningContent: event.reasoningDelta || undefined,
            scopedMemberId: selectedMember?.id,
            citedChunks: event.citedChunks || [],
            createdAt: new Date().toISOString(),
          };
          return [...prev, newMsg];
        }
      });

      if (event.done) {
        setIsStreaming(false);
        loadSessions(); // update session message count & title
      }
    });

    return () => {
      cleanup();
    };
  }, [activeSessionId, selectedMember?.id, loadSessions]);

  // Start a new chat session
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  // Delete chat session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await window.medbuddy.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch {
      // Ignore
    }
  };

  // Send a message with profile scope
  const handleSendMessage = async (text: string, memberId: string) => {
    if (!text.trim() || isStreaming) return;

    const activeProfile = providers.find((p) => p.is_default === 1) || providers[0];

    // Optimistically insert user message
    const tempUserMsg: ChatMessageType = {
      id: 'tmp_user_' + Date.now(),
      sessionId: activeSessionId || 'new',
      role: 'user',
      content: text,
      scopedMemberId: memberId,
      citedChunks: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);

    try {
      const response = await window.medbuddy.sendMessage({
        sessionId: activeSessionId || undefined,
        memberId,
        prompt: text,
        providerProfileId: activeProfile?.id,
      });

      if (!activeSessionId) {
        setActiveSessionId(response.sessionId);
        loadSessions();
      }
    } catch (err: any) {
      setIsStreaming(false);
      const errMsg: ChatMessageType = {
        id: 'tmp_err_' + Date.now(),
        sessionId: activeSessionId || 'new',
        role: 'assistant',
        content: `⚠️ Failed to send message: ${err.message}`,
        scopedMemberId: memberId,
        citedChunks: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  // Stop current streaming
  const handleStopStreaming = async () => {
    if (activeSessionId) {
      await window.medbuddy.abortStream(activeSessionId);
    }
    setIsStreaming(false);
  };

  // Handle citation click to open preview drawer
  const handleOpenCitation = async (documentId: string) => {
    if (!onOpenDocumentPreview) return;
    try {
      const data = await window.medbuddy.readDocumentData(documentId);
      const mockDoc: DocumentItem = {
        id: documentId,
        folder_id: '',
        filename: data.filename,
        file_type: data.mimeType,
        file_size: 0,
        storage_path: '',
        content_hash: '',
        extracted_text: data.text,
        ocr_status: 'done',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onOpenDocumentPreview(mockDoc);
    } catch {
      // Ignore
    }
  };

  const activeProvider = providers.find((p) => p.is_default === 1) || providers[0];
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeDocCount = selectedMember ? memberDocCounts[selectedMember.id] || 0 : 0;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-surface">
      {/* Sessions Left Sidebar */}
      {isHistorySidebarOpen && (
        <ChatSessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          members={members}
          filterMemberId={filterMemberId}
          onFilterMemberChange={setFilterMemberId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="h-14 px-4 border-b border-border bg-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsHistorySidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-tertiary hover:text-secondary hover:bg-surface-recessed transition-colors cursor-pointer"
              title={isHistorySidebarOpen ? 'Hide consultation history' : 'Show consultation history'}
            >
              {isHistorySidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-sm text-primary truncate">
                {activeSession ? activeSession.title : 'New Consultation'}
              </span>

              {selectedMember && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-recessed border border-border text-xs text-secondary shrink-0">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedMember.avatar_color || '#14b8a6' }}
                  />
                  <span>{selectedMember.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Metadata */}
          <div className="flex items-center gap-2 shrink-0">
            {activeProvider ? (
              <ProvenancePill
                kind={activeProvider.kind}
                providerName={activeProvider.name}
                modelName={activeProvider.model}
              />
            ) : (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs text-red-500 hover:underline"
              >
                No AI Provider Configured
              </button>
            )}

            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-recessed hover:bg-surface-raised border border-border text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Message Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyChatState
              selectedMember={selectedMember}
              docCount={activeDocCount}
              onSelectChipPrompt={(prompt) => {
                if (selectedMember) {
                  handleSendMessage(prompt, selectedMember.id);
                }
              }}
              onUploadDocument={() => {
                if (selectedMember && onUploadDocument) {
                  // Find medical documents folder
                  window.medbuddy.listFolders(selectedMember.id).then((folders) => {
                    const target = folders[0];
                    if (target) onUploadDocument(target.id);
                  });
                }
              }}
            />
          ) : (
            <div className="max-w-4xl mx-auto py-4">
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  members={members}
                  onOpenDocumentPreview={handleOpenCitation}
                  isStreamingActive={isStreaming && msg.role === 'assistant'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Message Composer */}
        <div className="shrink-0 bg-gradient-to-t from-surface via-surface to-transparent pt-2">
          <ChatComposer
            selectedMember={selectedMember}
            members={members}
            memberDocCounts={memberDocCounts}
            onSelectMember={onSelectMember}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            isStreaming={isStreaming}
          />
          <DisclaimerBar />
        </div>
      </div>
    </div>
  );
};
