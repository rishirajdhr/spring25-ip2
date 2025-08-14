import { useState } from 'react';
import useUserContext from './useUserContext';
import { GameInstance, GameMove } from '../types';

/** Minimum number of objects that can be moved. */
const MOVE_MIN_OBJECTS = 1;

/** Maximum number of objects that can be moved. */
const MOVE_MAX_OBJECTS = 3;

/**
 * Custom hook to manage the state and logic for the "Nim" game page,
 * including making a move and handling input changes.
 * @param gameState The current state of the Nim game.
 * @returns An object containing the following:
 * - `user`: The current user from the context.
 * - `move`: The current move entered by the player.
 * - `handleMakeMove`: A function to send the player's move to the server via a socket event.
 * - `handleInputChange`: A function to update the move state based on user input (1 to 3 objects).
 */

const useNimGamePage = (gameState: GameInstance) => {
  const { user, socket } = useUserContext();

  const [move, setMove] = useState<GameMove | null>(null);

  const handleMakeMove = async () => {
    if (move) {
      socket.emit('makeMove', move);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const numObjects = Number.parseInt(value, 10);
    if (numObjects < MOVE_MIN_OBJECTS || numObjects > MOVE_MAX_OBJECTS) {
      return;
    }

    const nextMove: GameMove = {
      gameID: gameState.gameID,
      move: {
        playerID: user.username,
        gameID: gameState.gameID,
        move: {
          numObjects,
        },
      },
    };
    setMove(nextMove);
  };

  return {
    user,
    move,
    handleMakeMove,
    handleInputChange,
  };
};

export default useNimGamePage;
