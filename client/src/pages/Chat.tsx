import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Channel, Message, User } from "@shared/schema";
import { Send, Paperclip, SmilePlus, Hash, Video, Phone } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import ChatMessage from "@/components/ChatMessage";
import VideoCall from "@/components/VideoCall";

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState<any[]>([]);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const webSocketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch channels
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["/api/channels", { projectId: 1 }], // Default to project ID 1
    onSuccess: (data) => {
      if (data.length > 0 && !activeChannel) {
        setActiveChannel(data[0]);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load channels. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch messages for active channel
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/channels", activeChannel?.id, "messages"],
    enabled: !!activeChannel,
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch users for displaying in messages
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set up WebSocket connection
  useEffect(() => {
    if (!activeChannel || !user) return;

    // Use direct user information for simplified authentication
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}&username=${user.username}&channelId=${activeChannel.id}`;
    console.log("Connecting to WebSocket:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setReceivedMessages((prev) => [...prev, data]);
        refetchMessages();
      }
    };

    // Clean up WebSocket connection
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [activeChannel, user, refetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, receivedMessages]);

  // Send message
  const sendMessage = () => {
    if (!message.trim() || !activeChannel || !isConnected) return;

    // Send via WebSocket
    if (webSocketRef.current) {
      webSocketRef.current.send(
        JSON.stringify({
          type: "message",
          channelId: activeChannel.id,
          content: message,
        })
      );
    }

    setMessage("");
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper to find user by ID
  const findUser = (userId: number) => {
    return users.find(u => u.id === userId);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Team Chat</h2>
      </div>
      
      {/* Video Call Modal */}
      {isVideoCallActive && activeChannel && (
        <VideoCall 
          channelId={activeChannel.id} 
          onClose={() => setIsVideoCallActive(false)}
        />
      )}
      
      {/* Chat interface */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Channels and Direct Messages sidebar */}
        <Card className="md:col-span-1">
          <CardContent className="p-4">
            <div className="mb-6">
              <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">Channels</h3>
              
              <div className="space-y-1">
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`flex items-center px-2 py-1.5 rounded w-full text-left ${
                      activeChannel?.id === channel.id 
                        ? "bg-primary text-white" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Hash className="mr-2 h-4 w-4" />
                    {channel.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">Direct Messages</h3>
              
              <div className="space-y-1">
                {users.slice(0, 4).map(user => (
                  <button
                    key={user.id}
                    className="flex items-center px-2 py-1.5 rounded w-full text-left text-gray-700 hover:bg-gray-100"
                  >
                    <UserAvatar user={user} size="sm" className="mr-2" />
                    {user.firstName} {user.lastName}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Chat area */}
        <Card className="md:col-span-3">
          <CardContent className="p-4 flex flex-col h-[calc(100vh-200px)]">
            {/* Chat header */}
            <div className="border-b pb-3 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Hash className="mr-2 text-gray-500 h-5 w-5" />
                  <h3 className="font-semibold">{activeChannel?.name || "Select a channel"}</h3>
                </div>
                
                {activeChannel && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center text-primary" 
                      onClick={() => setIsVideoCallActive(true)}
                    >
                      <Video className="h-4 w-4 mr-1" /> Video Call
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {activeChannel ? "Team-wide announcements and discussions" : "Please select a channel to start chatting"}
              </p>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {activeChannel ? (
                <>
                  {messages.map(msg => (
                    <ChatMessage 
                      key={msg.id} 
                      message={msg} 
                      user={findUser(msg.userId)} 
                    />
                  ))}
                  
                  {/* Real-time messages that might not be in the API response yet */}
                  {receivedMessages
                    .filter(msg => msg.channelId === activeChannel.id)
                    .map((msg, index) => (
                      <ChatMessage 
                        key={`realtime-${index}`} 
                        message={{
                          id: 0, // Temporary ID
                          content: msg.content,
                          userId: msg.userId,
                          channelId: msg.channelId,
                          createdAt: new Date().toISOString()
                        }} 
                        user={findUser(msg.userId)} 
                      />
                    ))
                  }
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Select a channel to start chatting</p>
                </div>
              )}
            </div>
            
            {/* Chat input */}
            {activeChannel && (
              <div className="border-t pt-3">
                <div className="flex items-end">
                  <div className="flex-1 relative">
                    <textarea
                      placeholder="Type your message..."
                      className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                    />
                    <div className="absolute right-2 bottom-2 flex space-x-1">
                      <button type="button" className="text-gray-500 hover:text-primary">
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button type="button" className="text-gray-500 hover:text-primary">
                        <SmilePlus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <Button
                    onClick={sendMessage}
                    className="ml-3 bg-primary hover:bg-secondary text-white rounded-lg p-3"
                    disabled={!isConnected}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                {!isConnected && (
                  <p className="text-red-500 text-xs mt-1">
                    Disconnected. Please refresh the page.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
