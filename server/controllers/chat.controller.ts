import express, { Response } from 'express';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
  ChatUpdatePayload,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';
import { Message } from '../types/message';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean =>
    !!req.body &&
    req.body.participants !== undefined &&
    Array.isArray(req.body.participants) &&
    req.body.messages !== undefined &&
    Array.isArray(req.body.messages);

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean =>
    !!req.body &&
    req.body.msg !== undefined &&
    req.body.msg !== '' &&
    req.body.msgFrom !== undefined &&
    req.body.msgFrom !== '' &&
    req.body.msgDateTime !== null;

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean =>
    !!req.body && req.body.userId !== undefined && req.body.userId !== '';

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    if (!isCreateChatRequestValid(req)) {
      res.status(400).send('Invalid request body');
      return;
    }
    try {
      const result = await saveChat(req.body);
      if ('error' in result) {
        throw new Error(result.error);
      }
      res.status(200).json(result);
    } catch (err) {
      res.status(500).send(`Error when creating chat: ${err}`);
    }
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    if (!isAddMessageRequestValid(req)) {
      res.status(400).send('Invalid request body');
    }
    try {
      const messageData: Message = {
        msg: req.body.msg,
        msgFrom: req.body.msgFrom,
        msgDateTime: req.body.msgDateTime ?? new Date(),
        type: 'direct',
      };
      const message = await createMessage(messageData);
      if ('error' in message) {
        throw new Error(message.error);
      } else if (message._id === undefined) {
        throw new Error('Message ID is not defined');
      }
      const result = await addMessageToChat(req.params.chatId, message._id.toString());
      if ('error' in result) {
        throw new Error(result.error);
      }

      const payload: ChatUpdatePayload = { chat: result, type: 'newMessage' };
      socket.to(req.params.chatId).emit('chatUpdate', payload);

      res.status(200).json(result);
    } catch (err) {
      res.status(500).send(`Error when adding message to chat: ${err}`);
    }
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    try {
      const result = await getChat(req.params.chatId);
      if ('error' in result) {
        throw new Error(result.error);
      }
      res.status(200).json(result);
    } catch (err) {
      res.status(500).send(`Error retrieving chat: ${err}`);
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    const result = await getChatsByParticipants([req.params.username]);
    res.status(200).json(result);
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    if (!isAddParticipantRequestValid(req)) {
      res.status(400).send('Invalid request body');
      return;
    }
    try {
      const result = await addParticipantToChat(req.params.chatId, req.body.userId);
      if ('error' in result) {
        throw new Error(result.error);
      }
      res.status(200).json(result);
    } catch (err) {
      res.status(500).send(`Error adding participant to chat: ${err}`);
    }
  };

  socket.on('connection', conn => {
    conn.on('joinChat', (chatId: string) => {
      conn.join(chatId);
    });
    conn.on('leaveChat', (chatId: string | undefined) => {
      if (chatId !== undefined) {
        conn.leave(chatId);
      }
    });
  });

  // Register the routes
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.get('/:chatId', getChatRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);
  router.get('/getChatsByUser/:username', getChatsByUserRoute);

  return router;
};

export default chatController;
