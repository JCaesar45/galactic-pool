export const MODES = ['8-Ball', '9-Ball', '10-Ball', 'Straight Pool', 'One Pocket', '9-Ball Bank'];
export const MAX_ROUNDS = 3;

export function makeGame({ roomId, playerId, playerName, mode = '8-Ball' }) {
  if (!MODES.includes(mode)) throw new Error('Unsupported game mode');
  return {
    roomId, mode, status: 'waiting', round: 1, maxRounds: MAX_ROUNDS,
    players: [{ id: playerId, name: cleanName(playerName), score: 0, roundsWon: 0 }],
    currentPlayerId: playerId, turn: 1, shots: [], rounds: [],
    createdAt: Date.now(), updatedAt: Date.now(), winnerId: null
  };
}

export function cleanName(value) {
  const name = String(value ?? '').trim().replace(/[<>]/g, '').slice(0, 18);
  if (!name) throw new Error('Enter a player name');
  return name;
}

export function joinGame(game, { playerId, playerName }) {
  if (game.status !== 'waiting') throw new Error('This room has already started');
  if (game.players.length >= 2) throw new Error('This room is full');
  if (game.players.some(p => p.id === playerId)) return game;
  game.players.push({ id: playerId, name: cleanName(playerName), score: 0, roundsWon: 0 });
  game.status = 'active';
  game.currentPlayerId = game.players[0].id;
  game.updatedAt = Date.now();
  return game;
}

export function applyShot(game, { playerId, points, pocketed = [], foul = false, note = '' }) {
  if (game.status !== 'active') throw new Error('The match is not active');
  if (game.currentPlayerId !== playerId) throw new Error('It is not your turn');
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('Player is not in this room');
  const score = Math.max(0, Math.min(15, Math.floor(Number(points) || 0)));
  const awarded = foul ? 0 : score;
  player.score += awarded;
  game.shots.push({ playerId, round: game.round, points: awarded, pocketed: Array.isArray(pocketed) ? pocketed.slice(0, 15).map(n => String(n).slice(0, 8)) : [], foul: Boolean(foul), note: String(note).slice(0, 80), at: Date.now() });
  game.turn += 1;
  game.currentPlayerId = game.players.find(p => p.id !== playerId).id;
  game.updatedAt = Date.now();
  return game;
}

export function finishRound(game) {
  if (game.status !== 'active') throw new Error('The match is not active');
  const [a, b] = game.players;
  const roundShots = game.shots.filter(s => s.round === game.round);
  if (new Set(roundShots.map(s => s.playerId)).size !== 2) throw new Error('Both players must take a shot before the round can end');
  const totals = game.players.map(p => ({ id: p.id, points: roundShots.filter(s => s.playerId === p.id).reduce((n, s) => n + s.points, 0) }));
  const winner = totals[0].points === totals[1].points ? null : totals[0].points > totals[1].points ? a : b;
  if (winner) winner.roundsWon += 1;
  game.rounds.push({ round: game.round, totals, winnerId: winner?.id ?? null });
  if (game.round >= game.maxRounds) {
    game.status = 'complete';
    const sorted = [...game.players].sort((x, y) => y.roundsWon - x.roundsWon || y.score - x.score);
    game.winnerId = sorted[0].roundsWon === sorted[1].roundsWon && sorted[0].score === sorted[1].score ? null : sorted[0].id;
  } else {
    game.round += 1;
    game.updatedAt = Date.now();
  }
  return game;
}
