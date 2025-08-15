/* eslint-disable @typescript-eslint/no-var-requires */
import mongoose from 'mongoose';

import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../../services/chat.service';
import { Chat, CreateChatPayload } from '../../types/chat';
import { Message } from '../../types/message';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('Chat service', () => {
  beforeEach(() => {
    mockingoose.resetAll();
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------------------
  // 1. saveChat
  // ----------------------------------------------------------------------------
  describe('saveChat', () => {
    const mockChatPayload: CreateChatPayload = {
      participants: ['testUser'],
      messages: [
        {
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
      ],
    };

    it('should successfully save a chat and verify its body (ignore exact IDs)', async () => {
      // 2) Mock message creation
      mockingoose(MessageModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          msg: 'Hello!',
          msgFrom: 'testUser',
          msgDateTime: new Date('2025-01-01T00:00:00Z'),
          type: 'direct',
        },
        'create',
      );

      // 3) Mock chat creation
      mockingoose(ChatModel).toReturn(
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['testUser'],
          messages: [new mongoose.Types.ObjectId()],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'create',
      );

      // 4) Call the service
      const result = await saveChat(mockChatPayload);

      // 5) Verify no error
      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result).toHaveProperty('_id');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.participants[0]?.toString()).toEqual(expect.any(String));
      expect(result.messages[0]?.toString()).toEqual(expect.any(String));
    });

    it('should return an error if any message creation fails', async () => {
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('Error creating message'));

      const result = await saveChat(mockChatPayload);

      expect(result).toHaveProperty('error');
    });

    it('should return an error if the chat creation fails', async () => {
      jest.spyOn(ChatModel, 'create').mockRejectedValueOnce(new Error('Error creating chat'));

      const result = await saveChat(mockChatPayload);

      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 2. createMessage
  // ----------------------------------------------------------------------------
  describe('createMessage', () => {
    const mockMessage: Message = {
      msg: 'Hey!',
      msgFrom: 'userX',
      msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      type: 'direct',
    };

    it('should create a message successfully if user exists', async () => {
      // Mock the user existence check
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'userX' },
        'findOne',
      );

      // Mock the created message
      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...mockMessage,
      };
      mockingoose(MessageModel).toReturn(mockCreatedMsg, 'create');

      const result = await createMessage(mockMessage);

      expect(result).toMatchObject({
        msg: 'Hey!',
        msgFrom: 'userX',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
        type: 'direct',
      });
    });

    it('should return an error if user does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');

      const result = await createMessage(mockMessage);

      expect(result).toHaveProperty('error');
    });

    it('should return an error if the user search fails', async () => {
      mockingoose(UserModel).toReturn(new Error('Error finding user'), 'findOne');

      const result = await createMessage(mockMessage);

      expect(result).toHaveProperty('error');
    });

    it('should return an error if the message creation fails', async () => {
      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('Error creating message'));

      const result = await createMessage(mockMessage);

      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. addMessageToChat
  // ----------------------------------------------------------------------------
  describe('addMessageToChat', () => {
    it('should add a message ID to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      const mockUpdatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Chat;

      // Mock findByIdAndUpdate
      mockingoose(ChatModel).toReturn(mockUpdatedChat, 'findOneAndUpdate');

      const result = await addMessageToChat(chatId, messageId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.messages).toEqual(mockUpdatedChat.messages);
    });

    it('should return an error if message does not exist', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(MessageModel).toReturn(null, 'findOne');
      const result = await addMessageToChat(chatId, messageId);
      expect(result).toHaveProperty('error');
    });

    it('should return an error if chat does not exist', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');
      const result = await addMessageToChat(chatId, messageId);
      expect(result).toHaveProperty('error');
    });

    it('should return an error if message lookup fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(MessageModel).toReturn(new Error('Error finding message'), 'findOne');
      const result = await addMessageToChat(chatId, messageId);
      expect(result).toHaveProperty('error');
    });

    it('should return an error if chat update fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      mockingoose(ChatModel).toReturn(new Error('Error updating chat'), 'findOneAndUpdate');
      const result = await addMessageToChat(chatId, messageId);
      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 4. getChat
  // ----------------------------------------------------------------------------
  describe('getChat', () => {
    it('should return the chat if it exists', async () => {
      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockingoose(ChatModel).toReturn(mockChat, 'findOne');

      const result = await getChat(mockChat._id!.toString());
      if ('error' in result) {
        throw new Error(`Expected a chat, got error: ${result.error}`);
      }

      const chatProperties = ['_id', 'participants', 'messages', 'createdAt', 'updatedAt'];
      chatProperties.forEach(property => expect(result).toHaveProperty(property));
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should return an error if the chat does not exist', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOne');
      const chatId = new mongoose.Types.ObjectId();
      const result = await getChat(chatId.toString());
      expect(result).toHaveProperty('error');
    });

    it('should return an error if the chat lookup fails', async () => {
      mockingoose(ChatModel).toReturn(new Error('Error finding chat'), 'findOne');
      const chatId = new mongoose.Types.ObjectId();
      const result = await getChat(chatId.toString());
      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 5. addParticipantToChat
  // ----------------------------------------------------------------------------
  describe('addParticipantToChat', () => {
    it('should add a participant if user exists', async () => {
      // Mock user
      mockingoose(UserModel).toReturn(
        { _id: new mongoose.Types.ObjectId(), username: 'testUser' },
        'findOne',
      );

      const mockChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Chat;

      mockingoose(ChatModel).toReturn(mockChat, 'findOneAndUpdate');

      const result = await addParticipantToChat(mockChat._id!.toString(), 'newUserId');
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockChat._id);
    });

    it('should return an error if the user does not exist', async () => {
      mockingoose(UserModel).toReturn(null, 'findOne');
      const chatId = new mongoose.Types.ObjectId();
      const result = await addParticipantToChat(chatId.toString(), 'newUserId');
      expect(result).toHaveProperty('error');
    });

    it('should return an error if the chat does not exist', async () => {
      mockingoose(ChatModel).toReturn(null, 'findOneAndUpdate');
      const chatId = new mongoose.Types.ObjectId();
      const result = await addParticipantToChat(chatId.toString(), 'newUserId');
      expect(result).toHaveProperty('error');
    });

    it('should return an error if the user lookup fails', async () => {
      mockingoose(UserModel).toReturn(new Error('Error finding user'), 'findOne');
      const chatId = new mongoose.Types.ObjectId();
      const result = await addParticipantToChat(chatId.toString(), 'newUserId');
      expect(result).toHaveProperty('error');
    });

    it('should return an error if the chat update fails', async () => {
      mockingoose(ChatModel).toReturn(new Error('Error updating chat'), 'findOneAndUpdate');
      const chatId = new mongoose.Types.ObjectId();
      const result = await addParticipantToChat(chatId.toString(), 'newUserId');
      expect(result).toHaveProperty('error');
    });
  });

  // ----------------------------------------------------------------------------
  // 6. getChatsByParticipants
  // ----------------------------------------------------------------------------
  describe('getChatsByParticipants', () => {
    it('should retrieve chats by participants', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0]], 'find');

      const result = await getChatsByParticipants(['user1', 'user2']);
      expect(result).toHaveLength(1);
      expect(result).toEqual([mockChats[0]]);
    });

    it('should retrieve chats by participants where the provided list is a subset', async () => {
      const mockChats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user2', 'user3'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockingoose(ChatModel).toReturn([mockChats[0], mockChats[1]], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(2);
      expect(result).toEqual([mockChats[0], mockChats[1]]);
    });

    it('should return an empty array if no chats are found', async () => {
      mockingoose(ChatModel).toReturn([], 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if chats is null', async () => {
      mockingoose(ChatModel).toReturn(null, 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if a database error occurs', async () => {
      mockingoose(ChatModel).toReturn(new Error('database error'), 'find');

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });
  });
});
