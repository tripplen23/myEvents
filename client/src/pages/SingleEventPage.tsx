import { useGetEventByIdQuery } from '@/api/eventsSlice';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import defaulEventImage from '../img/defaulEventImage.png';
import { Event } from '../misc/events';
import { Message } from '@/misc/messages';
import { useTheme } from '@/components/contextAPI/ThemeContext';
import { getThemeStyles } from '@/utils/themeUtils';
import { useGetUserByIdQuery } from '@/api/userSlice';


const SingleEventPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useGetEventByIdQuery(id!);
  const { theme } = useTheme();
  const { bgColor, fontColor } = getThemeStyles(theme);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const userId = localStorage.getItem("userId");
  const { data: userData } = useGetUserByIdQuery(userId!);
  console.log('userData', userData)
  const socket = io(import.meta.env.VITE_SOCKET_URL!);

  useEffect(() => {
    if(id) {
      socket.emit("joinEvent", { eventId: id });

      socket.on("message", (message) => {
        setMessages((prevMessages) => {
          if(prevMessages.some((msg) => msg.id === message.id)){
            return prevMessages;
          }
          return [...prevMessages, message];
        });
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [id, socket]);

  useEffect(() => {
    if (data && data.messages) {
      setMessages(data.messages); // Load existing messages from the backend
    }
  }, [data]);

  const handleSendMessage = () => {
    if(newMessage.trim() === '') return;

    //TODO: Implement proper user name

    const message: Message = {
      id: uuidv4(),
      content: newMessage,
      sender: userData!.name,
      timestamp: new Date()
    }
    console.log("Emitting message:", { eventId: id, message });

    socket.emit("message", { eventId: id, message });

    setMessages((prevMessages) => [...prevMessages, message]);
    setNewMessage('');
  }

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString();
  };

  if (isLoading) return <div>Loading...</div>;

  if (error) return <div>Error loading the event</div>;

  if (!data) return <div>No event data available</div>;

  const eventData = data as Event;
  console.log(eventData)

  return (
    <div className={`flex flex-col items-center min-h-screen ${bgColor} ${fontColor} p-8`}>
      <h1 className="text-2xl font-bold mb-4">{eventData?.name}</h1>
      <div className="flex flex-col md:flex-row items-start w-full max-w-4xl">
        <div className="flex-shrink-0 w-full md:w-1/2">
          {eventData?.images && eventData.images.length > 0 ? (
            eventData.images.map((img: string, index: number) => (
              <img key={index} src={img} alt={`Event image ${index + 1}`} className="w-full h-auto mb-4" />
            ))
          ) : (
            <img src={defaulEventImage} alt="Default event" className="w-full h-auto mb-4" />
          )}
        </div>
        <div className="flex-grow mt-4 md:mt-0 md:ml-8">
          <div className="mb-4">{eventData?.description || 'No description available'}</div>
          <div className="mb-4">
            <a href={eventData?.event_link || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              {eventData?.event_link || 'No link available'}
            </a>
          </div>
          <div className="mb-4">
            {eventData?.location ? (
              typeof eventData.location === 'object' && 'country' in eventData.location ? (
                <>
                  <div>Country: {eventData.location.country}</div>
                  <div>City: {eventData.location.city}</div>
                  <div>Post Code: {eventData.location.post_code}</div>
                  <div>Latitude: {eventData.location.latitude}</div>
                  <div>Longitude: {eventData.location.longitude}</div>
                </>
              ) : (
                <div>Location is not available as an object.</div>
              )
            ) : (
              'No location available'
            )}
          </div>

          <div>{eventData?.price !== undefined ? `$${eventData.price}` : 'Price not available'}</div>
        </div>
      </div>
      <div className="w-full max-w-4xl mt-8">
        <h2 className="text-xl font-bold mb-4">Chat</h2>
        <div className="border p-4 mb-4 h-64 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <span className="font-bold">{formatTimestamp(msg.timestamp)} {msg.sender}:</span> {msg.content}
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow border p-2"
            placeholder="Type your message..."
          />
          <button onClick={handleSendMessage} className="ml-2 p-2 bg-blue-500 text-white">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleEventPage;