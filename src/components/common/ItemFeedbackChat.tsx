import React, { useState, useRef, useEffect } from 'react';
import { ItemChatMessage, UserRole } from '../../types';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  ShieldCheck, 
  User, 
  Clock, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  CornerDownLeft
} from 'lucide-react';

interface ItemFeedbackChatProps {
  targetId: string;
  targetType: 'work_entry' | 'assigned_task';
  targetTitle?: string;
  targetSubtitle?: string;
  messages: ItemChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  onSendMessage: (targetId: string, targetType: 'work_entry' | 'assigned_task', text: string) => Promise<any>;
  onDeleteMessage?: (messageId: string) => Promise<any>;
  isInline?: boolean;
  onClose?: () => void;
}

export const ItemFeedbackChat: React.FC<ItemFeedbackChatProps> = ({
  targetId,
  targetType,
  targetTitle,
  targetSubtitle,
  messages,
  currentUserId,
  currentUserName,
  currentUserRole,
  onSendMessage,
  onDeleteMessage,
  isInline = false,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Filter messages for this specific target
  const itemMessages = messages.filter(
    (m) => m.targetId === targetId && m.targetType === targetType
  );

  // Auto-scroll to bottom of chat on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [itemMessages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSendMessage(targetId, targetType, text);
      setInputText('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send feedback message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick suggestions for fast admin feedback or member response
  const quickChips = currentUserRole === 'admin' 
    ? [
        'Approved 👍', 
        'Please review remarks 📝', 
        'Re-opened for changes 🔄', 
        'Great work! ⭐', 
        'High priority 🚨'
      ]
    : [
        'Done & verified ✅', 
        'Working on this ⏳', 
        'Need clarification ❓', 
        'Updated per feedback 🚀'
      ];

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col ${isInline ? 'w-full pt-3 mt-3 border-t border-slate-800/80' : 'h-full max-h-[85vh] flex-1'}`}>
      {/* Header bar if not inline */}
      {!isInline && (
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#161B27]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {targetType === 'work_entry' ? 'Work Entry Discussion' : 'Task Discussion & Feedback'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {itemMessages.length} {itemMessages.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
              {targetTitle && (
                <p className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                  {targetTitle} {targetSubtitle ? `• ${targetSubtitle}` : ''}
                </p>
              )}
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1F2636] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Messages List Area */}
      <div 
        className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${
          isInline ? 'max-h-60 bg-[#121622] rounded-2xl border border-slate-800/80 p-3.5 my-2' : 'min-h-[220px] max-h-[380px] bg-[#0E121E]/60'
        }`}
      >
        {itemMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#1F2636] text-slate-500 flex items-center justify-center border border-slate-800">
              <MessageSquare className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">No feedback or messages yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                {currentUserRole === 'admin' 
                  ? 'Add direct feedback, instructions, or reviews for the team member.' 
                  : 'Post updates, request clarifications, or respond to admin remarks.'}
              </p>
            </div>
          </div>
        ) : (
          itemMessages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isAdminSender = msg.senderRole === 'admin';

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Sender metadata bar */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-300">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  {isAdminSender ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Lead
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60">
                      Member
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono ml-1">
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>

                {/* Bubble */}
                <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words shadow-sm ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-xs shadow-indigo-600/20'
                        : isAdminSender
                        ? 'bg-[#1F2636] border border-amber-500/30 text-slate-200 rounded-tl-xs'
                        : 'bg-[#1A202C] border border-slate-700/70 text-slate-200 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {/* Delete button if author or admin */}
                  {onDeleteMessage && (isMe || currentUserRole === 'admin') && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all shrink-0"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-4 pt-2 flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" /> Quick:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInputText((prev) => (prev ? `${prev} ${chip}` : chip))}
            className="px-2.5 py-1 rounded-lg bg-[#1F2636] hover:bg-indigo-600/20 hover:text-indigo-300 hover:border-indigo-500/30 text-slate-300 text-[11px] font-medium border border-slate-700/60 shrink-0 transition-colors whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box and Action */}
      <div className={`p-3 ${isInline ? 'bg-transparent' : 'bg-[#161B27] border-t border-slate-800'}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative bg-[#1F2636] rounded-2xl border border-slate-700/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentUserRole === 'admin'
                  ? 'Add admin feedback or instruction (Enter to send)...'
                  : 'Write a response or question (Enter to send)...'
              }
              rows={isInline ? 1 : 2}
              className="w-full px-3.5 py-2.5 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none resize-none min-h-[38px] max-h-32"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all shrink-0 flex items-center justify-center font-bold"
            title="Send Feedback (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
