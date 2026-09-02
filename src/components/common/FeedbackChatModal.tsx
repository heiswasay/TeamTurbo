import React from 'react';
import { ItemChatMessage, UserRole } from '../../types';
import { ItemFeedbackChat } from './ItemFeedbackChat';
import { X, MessageSquare } from 'lucide-react';

interface FeedbackChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'work_entry' | 'assigned_task';
  targetTitle: string;
  targetSubtitle?: string;
  messages: ItemChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: UserRole;
  onSendMessage: (targetId: string, targetType: 'work_entry' | 'assigned_task', text: string) => Promise<any>;
  onDeleteMessage?: (messageId: string) => Promise<any>;
}

export const FeedbackChatModal: React.FC<FeedbackChatModalProps> = ({
  isOpen,
  onClose,
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
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0B0F1A]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#161B27] border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <ItemFeedbackChat
          targetId={targetId}
          targetType={targetType}
          targetTitle={targetTitle}
          targetSubtitle={targetSubtitle}
          messages={messages}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          onSendMessage={onSendMessage}
          onDeleteMessage={onDeleteMessage}
          isInline={false}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
