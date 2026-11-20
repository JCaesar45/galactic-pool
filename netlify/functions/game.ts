import { getStore } from '@netlify/blobs';
import { applyShot, finishRound, joinGame, makeGame } from '../../src/game-logic.mjs';

const store = getStore({ name: 'galactic-pool-rooms', consistency: 'strong' });
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, if-match', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const roomKey = (id) => `rooms/${id}`;
const idPattern = /^[A-Z0-9]{6}$/;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    if (event.httpMethod === 'GET') {
      const id = String(event.queryStringParameters?.room ?? '').toUpperCase();
      if (!idPattern.test(id)) return reply(400, { error: 'A valid six-character room code is required.' });
      const entry = await store.getWithMetadata(roomKey(id), { consistency: 'strong', type: 'json' });
      if (!entry) return reply(404, { error: 'Room not found.' });
      return { ...reply(200, { game: entry.data, etag: entry.etag }), headers: { ...headers, etag: entry.etag ?? '' } };
    }
    if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed.' });
    const body = JSON.parse(event.body || '{}');
    const action = String(body.action ?? '');
    if (action === 'create') {
      const playerId = String(body.playerId ?? '').slice(0, 64);
      const roomId = String(body.roomId ?? '').toUpperCase();
      if (!idPattern.test(roomId) || !playerId) return reply(400, { error: 'Invalid room or player identifier.' });
      const game = makeGame({ roomId, playerId, playerName: body.playerName, mode: body.mode });
      const result = await store.setJSON(roomKey(roomId), game, { onlyIfNew: true });
      if (!result.modified) return reply(409, { error: 'Room code already exists. Create another room.' });
      return reply(201, { game, etag: result.etag });
    }
    const roomId = String(body.roomId ?? '').toUpperCase();
    if (!idPattern.test(roomId)) return reply(400, { error: 'A valid room code is required.' });
    const key = roomKey(roomId);
    const entry = await store.getWithMetadata(key, { consistency: 'strong', type: 'json' });
    if (!entry || !entry.data) return reply(404, { error: 'Room not found.' });
    const game = entry.data;
    if (action === 'join') joinGame(game, { playerId: String(body.playerId ?? '').slice(0, 64), playerName: body.playerName });
    else if (action === 'shot') applyShot(game, body);
    else if (action === 'finish-round') {
      if (!game.players.some((p) => p.id === body.playerId)) return reply(403, { error: 'Player is not in this room.' });
      finishRound(game);
    } else return reply(400, { error: 'Unknown action.' });
    const write = await store.setJSON(key, game, { onlyIfMatch: entry.etag });
    if (!write.modified) return reply(409, { error: 'The room changed during your move. Refresh the match and try again.' });
    return reply(200, { game, etag: write.etag });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const status = /not your turn|not active|full|already started|not in this room|Unsupported|player name/i.test(message) ? 409 : 400;
    return reply(status, { error: message });
  }
};
