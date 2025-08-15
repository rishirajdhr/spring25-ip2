import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';

/**
 * Creates and saves a new chat document in the database, saving messages dynamically.
 *
 * @param chat - The chat object to be saved, including full message objects.
 * @returns {Promise<ChatResponse>} - Resolves with the saved chat or an error message.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  try {
    const messages = await Promise.all(chatPayload.messages.map(m => MessageModel.create(m)));
    const chat = {
      participants: chatPayload.participants,
      messages: messages.map(m => m._id),
    };

    const result = await ChatModel.create(chat);
    return result;
  } catch (error) {
    return { error: `Error when creating new chat: ${error}` };
  }
};

/**
 * Creates and saves a new message document in the database.
 * @param messageData - The message data to be created.
 * @returns {Promise<MessageResponse>} - Resolves with the created message or an error message.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> => {
  try {
    const user = await UserModel.findOne({ username: messageData.msgFrom });
    if (user === null) {
      return { error: `No user found with username: ${messageData.msgFrom}` };
    }
    const result = await MessageModel.create(messageData);
    return result;
  } catch (error) {
    return { error: `Error when creating new message: ${error}` };
  }
};

/**
 * Adds a message ID to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addMessageToChat = async (
  chatId: string,
  messageId: string,
): Promise<ChatResponse> => {
  try {
    const message = await MessageModel.findById(messageId);
    if (message === null) {
      return { error: `No message found with ID: ${messageId}` };
    }

    const chat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: messageId } },
      { new: true },
    );
    if (chat === null) {
      return { error: `No chat found with ID: ${chatId}` };
    }

    return chat;
  } catch (error) {
    return { error: `Error when adding message to chat: ${error}` };
  }
};

/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - Resolves with the found chat object or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  try {
    const chat = await ChatModel.findById(chatId);
    if (chat === null) {
      return { error: `No chat found with ID: ${chatId}` };
    }
    return chat;
  } catch (error) {
    return { error: `Error when retrieving chat: ${error}` };
  }
};

/**
 * Retrieves chats that include all the provided participants.
 * @param p An array of participant usernames to match in the chat's participants.
 * @returns {Promise<Chat[]>} A promise that resolves to an array of chats where the participants match.
 * If no chats are found or an error occurs, the promise resolves to an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<Chat[]> => {
  try {
    const chats = await ChatModel.find({ participants: { $all: p } }).lean();
    return chats ?? [];
  } catch (error) {
    return [];
  }
};

/**
 * Adds a participant to an existing chat.
 *
 * @param chatId - The ID of the chat to update.
 * @param userId - The ID of the user to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addParticipantToChat = async (
  chatId: string,
  userId: string,
): Promise<ChatResponse> => {
  try {
    const user = await UserModel.findById(userId);
    if (user === null) {
      return { error: `No user found with ID: ${userId}` };
    }

    const result = await ChatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { participants: userId } },
      { new: true },
    );
    if (result === null) {
      return { error: `No chat found with ID: ${chatId}` };
    }

    return result;
  } catch (error) {
    return { error: `Error when adding participant to chat: ${error}` };
  }
};
