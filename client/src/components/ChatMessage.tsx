import { Message, User } from "@shared/schema";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/utils/formatDate";
import { PaperclipIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: Message;
  user?: User;
}

export default function ChatMessage({ message, user }: ChatMessageProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Function to check for links in message content
  const renderMessageContent = (content: string) => {
    // URL regex pattern
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Split the content by URLs
    const parts = content.split(urlRegex);
    
    // Find all URLs in the content
    const urls = content.match(urlRegex) || [];
    
    // Combine parts and URLs
    return parts.map((part, index) => {
      // If this part is a URL (matches with a URL at the same index)
      if (urls.includes(part)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {part}
          </a>
        );
      }
      
      // Regular text
      return part;
    });
  };
  
  // Helper to check for file attachment
  const hasAttachment = message.content?.includes("file:") || false;
  
  return (
    <div className="flex items-start mb-4">
      <UserAvatar 
        user={user} 
        userId={message.userId} 
        className="mr-3 flex-shrink-0" 
      />
      
      <div className="flex-1">
        <div className="flex items-center">
          <p className="font-medium">
            {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : `User ${message.userId}`}
          </p>
          <span className="text-xs text-gray-500 ml-2">
            {formatTime(message.createdAt)}
          </span>
        </div>
        
        <div className="text-gray-700 mt-1">
          {hasAttachment ? (
            <div className="flex items-center mt-2 p-2 bg-gray-100 rounded-lg">
              <PaperclipIcon className="text-gray-500 mr-2 h-5 w-5" />
              <div>
                <p className="text-sm font-medium">
                  {message.content.replace("file:", "")}
                </p>
                <p className="text-xs text-gray-500">Attachment</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto text-primary">
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p>{renderMessageContent(message.content)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
