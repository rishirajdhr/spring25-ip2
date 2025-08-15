import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    if (selectedChat?._id !== undefined && newMessage.trim() !== '') {
      try {
        const updatedChat = await sendMessage(
          { msg: newMessage, msgFrom: user.username, msgDateTime: new Date() },
          selectedChat._id,
        );
        setSelectedChat(updatedChat);
        setNewMessage('');
      } catch (error) {
        throw new Error(`Error sending message: ${error}`);
      }
    }
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    if (chatID === undefined) return;
    try {
      const chat = await getChatById(chatID);
      setSelectedChat(chat);
      setNewMessage('');
      handleJoinChat(chat._id);
    } catch (error) {
      throw new Error(`Error selecting chat (ID: ${chatID}): ${error}`);
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    if (chatToCreate === '') return;
    try {
      const newChat = await createChat([user.username, chatToCreate]);
      setSelectedChat(newChat);
      setChatToCreate('');
      setNewMessage('');
      setShowCreatePanel(false);
      handleJoinChat(newChat._id);
    } catch (error) {
      throw new Error(`Error creating chat: ${error}`);
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const allChatsWithUser = await getChatsByUser(user.username);
        setChats(allChatsWithUser);
      } catch (error) {
        throw new Error(`Error when fetching all chats with user: ${error}`);
      }
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      switch (chatUpdate.type) {
        case 'created':
          setChats(prevChats => [...prevChats, chatUpdate.chat]);
          break;
        case 'newMessage':
          setSelectedChat(chatUpdate.chat);
          break;
        default:
          throw new Error(`Invalid chat update type: ${chatUpdate.type}`);
      }
    };

    fetchChats();

    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);
      socket.emit('leaveChat', selectedChat?._id);
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
