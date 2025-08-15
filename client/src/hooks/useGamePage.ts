import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useUserContext from './useUserContext';
import { GameErrorPayload, GameInstance, GameUpdatePayload } from '../types';
import { joinGame, leaveGame } from '../services/gamesService';

/**
 * Custom hook to manage the state and logic for the game page, including joining, leaving the game, and handling game updates.
 * @returns An object containing the following:
 * - `gameState`: The current state of the game, or null if no game is joined.
 * - `error`: A string containing any error messages related to the game, or null if no errors exist.
 * - `handleLeaveGame`: A function to leave the current game and navigate back to the game list.
 */
const useGamePage = () => {
  const { user, socket } = useUserContext();
  const { gameID } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameInstance | null>(null);
  const [joinedGameID, setJoinedGameID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLeaveGame = async () => {
    if (joinedGameID !== null && gameState && gameState.state.status !== 'OVER') {
      try {
        const nextGameState = await leaveGame(joinedGameID, user.username);
        setGameState(nextGameState);
        socket.emit('leaveGame', joinedGameID);
        setJoinedGameID(null);
      } catch (err) {
        setError((err as Error).message);
      }
    }

    // Always navigate back to the games page
    navigate('/games');
  };

  useEffect(() => {
    const handleJoinGame = async (id: string) => {
      try {
        const nextGameState = await joinGame(id, user.username);
        socket.emit('joinGame', nextGameState.gameID);
        setGameState(nextGameState);
        setJoinedGameID(nextGameState.gameID);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    if (gameID) {
      handleJoinGame(gameID);
    }

    const handleGameUpdate = (updatedState: GameUpdatePayload) => {
      setGameState(updatedState.gameState);
    };

    const handleGameError = (gameError: GameErrorPayload) => {
      if (gameError.player === user.username) {
        setError(gameError.error);
      }
    };

    socket.on('gameUpdate', handleGameUpdate);
    socket.on('gameError', handleGameError);

    return () => {
      socket.off('gameUpdate', handleGameUpdate);
      socket.off('gameError', handleGameError);
    };
  }, [gameID, socket, user.username]);

  return {
    gameState,
    error,
    handleLeaveGame,
  };
};

export default useGamePage;
