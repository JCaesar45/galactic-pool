import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, joinGame, applyShot, finishRound } from '../src/game-logic.mjs';

test('two players complete three rounds with scoring and a final winner', () => {
  let game = makeGame({ roomId: 'ABC123', playerId: 'p1', playerName: 'Jordan', mode: '8-Ball' });
  game = joinGame(game, { playerId: 'p2', playerName: 'Opponent' });
  assert.equal(game.status, 'active');
  assert.equal(game.players.length, 2);
  const rounds = [
    [{ playerId: 'p1', points: 3 }, { playerId: 'p2', points: 1 }],
    [{ playerId: 'p1', points: 2 }, { playerId: 'p2', points: 4 }],
    [{ playerId: 'p1', points: 5 }, { playerId: 'p2', points: 2 }]
  ];
  for (const [index, shots] of rounds.entries()) {
    for (const shot of shots) {
      applyShot(game, { ...shot, pocketed: Array.from({ length: shot.points }, (_, i) => i + 1) });
    }
    finishRound(game);
    assert.equal(game.rounds.length, index + 1);
  }
  assert.equal(game.status, 'complete');
  assert.equal(game.rounds.length, 3);
  assert.equal(game.players.find(p => p.id === 'p1').score, 10);
  assert.equal(game.players.find(p => p.id === 'p2').score, 7);
  assert.equal(game.players.find(p => p.id === 'p1').roundsWon, 2);
  assert.equal(game.players.find(p => p.id === 'p2').roundsWon, 1);
  assert.equal(game.winnerId, 'p1');
});

test('turn ownership and conditional game constraints are enforced by game logic', () => {
  let game = makeGame({ roomId: 'XYZ789', playerId: 'p1', playerName: 'One' });
  joinGame(game, { playerId: 'p2', playerName: 'Two' });
  assert.throws(() => finishRound(game), /Both players must take a shot/);
  assert.throws(() => applyShot(game, { playerId: 'p2', points: 2 }), /not your turn/);
  applyShot(game, { playerId: 'p1', points: 2 });
  assert.equal(game.currentPlayerId, 'p2');
});
