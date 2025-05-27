import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import UserAvatar from './UserAvatar';

interface VideoCallProps {
  channelId: number;
  onClose: () => void;
}

interface Peer {
  userId: number;
  username: string;
  profileImageUrl?: string;
  stream?: MediaStream;
  peer: SimplePeer.Instance;
}

export default function VideoCall({ channelId, onClose }: VideoCallProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<number, Peer>>({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const normalStreamRef = useRef<MediaStream | null>(null);

  // Initialize socket connection and media stream
  useEffect(() => {
    if (!user) return;

    // Create socket connection with authentication
    const socketUrl = `${window.location.protocol}//${window.location.host}`;
    console.log("Connecting to video socket at:", socketUrl);
    
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        // Simplified authentication with userId only for development
        userId: user.id,
        username: user.username
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Add socket event listeners for connection status
    newSocket.on('connect', () => {
      console.log('Socket.IO connected successfully');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      toast({
        title: 'Connection error',
        description: 'Unable to connect to video call service. Please try again.',
        variant: 'destructive'
      });
    });

    setSocket(newSocket);

    // Define fallback constraints if initial ones fail
    const constraints = {
      video: true,
      audio: true
    };

    const fallbackConstraints = {
      video: { width: 320, height: 240 },
      audio: true
    };

    // Try to get user media with error handling and fallbacks
    const getMedia = async () => {
      try {
        // First try with standard constraints
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        normalStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Join the call room after we have our media
        newSocket.emit('join-room', channelId);
        
      } catch (initialError) {
        console.error('Error accessing media devices with standard constraints:', initialError);
        
        try {
          // Try with fallback constraints
          console.log('Trying fallback constraints...');
          const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          setLocalStream(fallbackStream);
          normalStreamRef.current = fallbackStream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = fallbackStream;
          }
          
          // Join the call room after we have our media
          newSocket.emit('join-room', channelId);
          
        } catch (fallbackError) {
          console.error('Error accessing media devices with fallback constraints:', fallbackError);
          toast({
            title: 'Camera or microphone error',
            description: 'Unable to access your camera or microphone. Please check your browser permissions.',
            variant: 'destructive'
          });
          
          // Still join the room to at least hear others
          newSocket.emit('join-room', channelId);
        }
      }
    };
    
    getMedia();

    // Clean up
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (newSocket) {
        newSocket.emit('leave-room', channelId);
        newSocket.disconnect();
      }
      
      // Close all peer connections
      Object.values(peers).forEach(peer => {
        peer.peer.destroy();
      });
    };
  }, [channelId, user]);

  // Handle socket events for signaling
  useEffect(() => {
    if (!socket || !localStream) return;

    // When a new user joins the call
    socket.on('user-joined', (userData: { userId: number, username: string, profileImageUrl?: string }) => {
      console.log('User joined:', userData.username);
      
      // Create a new peer connection
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: localStream
      });

      // Handle the signal from our end
      peer.on('signal', (data) => {
        socket.emit('signal', {
          type: 'offer',
          sdp: JSON.stringify(data),
          userId: user!.id,
          targetUserId: userData.userId,
          roomId: channelId
        });
      });

      // When we receive the remote stream
      peer.on('stream', (remoteStream) => {
        setPeers(prev => ({
          ...prev,
          [userData.userId]: {
            ...prev[userData.userId],
            stream: remoteStream
          }
        }));
      });

      // Add the peer to our list
      setPeers(prev => ({
        ...prev,
        [userData.userId]: {
          userId: userData.userId,
          username: userData.username,
          profileImageUrl: userData.profileImageUrl,
          peer
        }
      }));
    });

    // Receiving a signal from another user
    socket.on('signal', (data: { type: string, sdp: string, userId: number }) => {
      const signal = JSON.parse(data.sdp);

      // If we already have a peer connection with this user
      if (peers[data.userId]) {
        peers[data.userId].peer.signal(signal);
      } else {
        // Create a new peer connection
        const peer = new SimplePeer({
          initiator: false,
          trickle: false,
          stream: localStream
        });

        // Handle the signal from our end
        peer.on('signal', (signalData) => {
          socket.emit('signal', {
            type: 'answer',
            sdp: JSON.stringify(signalData),
            userId: user!.id,
            targetUserId: data.userId,
            roomId: channelId
          });
        });

        // When we receive the remote stream
        peer.on('stream', (remoteStream) => {
          setPeers(prev => ({
            ...prev,
            [data.userId]: {
              ...prev[data.userId],
              stream: remoteStream
            }
          }));
        });

        // Add the peer to our list and signal
        peer.signal(signal);
        
        // Get user info for this peer
        socket.emit('get-user-info', data.userId);
      }
    });

    // When a user leaves the call
    socket.on('user-left', (data: { userId: number }) => {
      console.log('User left:', data.userId);
      
      // Close the peer connection
      if (peers[data.userId]) {
        peers[data.userId].peer.destroy();
        
        // Remove the peer from our list
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[data.userId];
          return newPeers;
        });
      }
    });

    // Get info about users in the room
    socket.on('user-info', (userData: { userId: number, username: string, profileImageUrl?: string }) => {
      if (peers[userData.userId]) {
        setPeers(prev => ({
          ...prev,
          [userData.userId]: {
            ...prev[userData.userId],
            username: userData.username,
            profileImageUrl: userData.profileImageUrl
          }
        }));
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('signal');
      socket.off('user-left');
      socket.off('user-info');
    };
  }, [socket, localStream, peers, channelId, user]);

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Switch back to camera
      if (normalStreamRef.current && localVideoRef.current) {
        setLocalStream(normalStreamRef.current);
        localVideoRef.current.srcObject = normalStreamRef.current;
        
        // Update all peers with the camera stream
        Object.values(peers).forEach(peer => {
          normalStreamRef.current!.getTracks().forEach(track => {
            peer.peer.replaceTrack(
              peer.peer.streams[0].getVideoTracks()[0],
              track,
              peer.peer.streams[0]
            );
          });
        });
        
        // Stop screen sharing tracks
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
      }
    } else {
      try {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        screenStreamRef.current = screenStream;
        
        // Display screen sharing stream locally
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          setLocalStream(screenStream);
        }
        
        // Replace video track for all peers
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        
        Object.values(peers).forEach(peer => {
          peer.peer.replaceTrack(
            peer.peer.streams[0].getVideoTracks()[0],
            screenVideoTrack,
            peer.peer.streams[0]
          );
        });
        
        // Handle when user stops screen sharing via browser UI
        screenVideoTrack.onended = () => {
          setIsScreenSharing(false);
          if (normalStreamRef.current && localVideoRef.current) {
            setLocalStream(normalStreamRef.current);
            localVideoRef.current.srcObject = normalStreamRef.current;
            
            // Update all peers with the camera stream
            Object.values(peers).forEach(peer => {
              normalStreamRef.current!.getTracks().forEach(track => {
                if (track.kind === 'video') {
                  peer.peer.replaceTrack(
                    peer.peer.streams[0].getVideoTracks()[0],
                    track,
                    peer.peer.streams[0]
                  );
                }
              });
            });
          }
        };
      } catch (error) {
        console.error('Error sharing screen:', error);
        return;
      }
    }
    
    setIsScreenSharing(!isScreenSharing);
  };

  // End the call
  const endCall = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-50">
        <h2 className="text-white text-xl font-semibold">Video Call</h2>
        <Button variant="ghost" onClick={onClose} className="text-white">
          Close
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <UserAvatar user={user} size="lg" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
              You {isScreenSharing && '(Screen)'}
            </div>
          </div>
          
          {/* Remote videos */}
          {Object.values(peers).map((peer) => (
            <div key={peer.userId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              {peer.stream ? (
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(element) => {
                    if (element && peer.stream) {
                      element.srcObject = peer.stream;
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <UserAvatar userId={peer.userId} size="lg" />
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                {peer.username}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 bg-black bg-opacity-50 flex justify-center items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full ${isAudioEnabled ? 'bg-transparent' : 'bg-red-600'}`}
          onClick={toggleAudio}
        >
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full ${isVideoEnabled ? 'bg-transparent' : 'bg-red-600'}`}
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <Video /> : <VideoOff />}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full ${isScreenSharing ? 'bg-green-600' : 'bg-transparent'}`}
          onClick={toggleScreenShare}
        >
          <MonitorUp />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-red-600 hover:bg-red-700"
          onClick={endCall}
        >
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
}