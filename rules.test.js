import test from 'node:test'
import assert from 'node:assert/strict'
import {createCheckers,checkersMoves,playCheckers} from './checkers.js'
import {createChinese,chineseMoves,playChinese,holes} from './chinese.js'
import {createChess,chessMoves,playChess,chooseChess} from './chess-game.js'
import {createReversi,reversiMoves,playReversi} from './reversi.js'
import {createFour,fourMoves,playFour,chooseFour} from './four.js'

test('the reported b2 position requires b4 to jump c5 and land on d6', () => {
  let state = createCheckers()
  for (const [from, to] of [[40, 33], [19, 26]]) {
    state = playCheckers(state, checkersMoves(state).find(move => move.from === from && move.to === to))
  }
  assert.equal(state.board[49], 1)
  assert.equal(state.board[40], 0)
  assert.deepEqual(checkersMoves(state), [{from:33, to:19, capture:26}])
  state = playCheckers(state, checkersMoves(state)[0])
  assert.equal(state.board[33], 0)
  assert.equal(state.board[26], 0)
  assert.equal(state.board[19], 1)
  assert.equal(state.turn, -1)
})

test('checkers forces a chain and crowns without granting an extra jump', () => {
  let state = createCheckers()
  state.board.fill(0)
  state.board[42] = state.board[55] = 1
  state.board[33] = state.board[17] = state.board[37] = -1
  assert.deepEqual(checkersMoves(state),[{from:42,to:24,capture:33}])
  state = playCheckers(state,checkersMoves(state)[0])
  assert.equal(state.turn,1)
  assert.deepEqual(checkersMoves(state),[{from:24,to:10,capture:17}])
  state = playCheckers(state,checkersMoves(state)[0])
  assert.equal(state.turn,-1)
  assert.equal(state.board[17],0)

  state = createCheckers()
  state.board.fill(0)
  state.board[17] = 1
  state.board[10] = state.board[12] = -1
  const crown = checkersMoves(state).find(move => move.to === 3)
  state = playCheckers(state,crown)
  assert.equal(state.board[3],2)
  assert.equal(state.forced,null)
  assert.equal(state.turn,-1)
})

test('Chinese Checkers keeps jump pieces and traverses chained hops on a 121-hole star', () => {
  assert.equal(holes.length,121)
  const state = createChinese()
  assert.equal(state.board.filter(p=>p===1).length,10)
  assert.equal(state.board.filter(p=>p===-1).length,10)
  const id = (x,y) => holes.findIndex(hole => hole.x===x && hole.y===y)
  const origin = id(4,8), first = id(8,8), target = id(12,8)
  state.board.fill(0)
  state.board[origin] = 1
  state.board[id(6,8)] = state.board[id(10,8)] = -1
  const move = chineseMoves(state,origin).find(move => move.to===target)
  assert.deepEqual(move.path,[origin,first,target])
  const next = playChinese(state,move)
  assert.equal(next.board.filter(p=>p===-1).length,2)
  assert.equal(next.board[origin],0)
  assert.equal(next.board[target],1)
})

test('chess validates mate, offers four promotions, and restores the board after searching', () => {
  let state = createChess()
  assert.equal(chessMoves(state).length,20)
  const fen = state.engine.fen()
  assert.ok(chooseChess(state))
  assert.equal(state.engine.fen(),fen)
  for (const san of ['f3','e5','g4','Qh4#']) {
    state = playChess(state,chessMoves(state).find(action => action.move.san===san))
  }
  assert.deepEqual(state.result,{winner:-1,reason:'Checkmate.'})

  state = createChess()
  state.engine.load('7k/P7/8/8/8/8/8/7K w - - 0 1')
  const promotions = chessMoves(state).filter(action => action.promotion)
  assert.deepEqual(new Set(promotions.map(action => action.promotion)),new Set(['q','r','b','n']))
  state = playChess(state,promotions.find(action => action.promotion==='n'))
  assert.equal(state.engine.get('a8').type,'n')
  assert.equal(state.result.winner,0)
})

test('Othello starts with the standard legal moves, flips discs, and stops when neither side can play', () => {
  let state = createReversi()
  assert.deepEqual(reversiMoves(state).map(move => move.to),[19,26,37,44])
  state = playReversi(state,reversiMoves(state)[0])
  assert.equal(state.board.filter(p=>p===1).length,4)
  assert.equal(state.board.filter(p=>p===-1).length,1)
  state.board = Array(64).fill(-1)
  state.board[0] = 0
  state.board[1] = 1
  state = playReversi(state,reversiMoves(state)[0])
  assert.equal(state.result.winner,-1)
  assert.ok(state.board.every(p=>p===-1))
})

test('Four in a Row detects diagonal wins and the computer takes a winning drop', () => {
  let state = createFour()
  for (const col of [0,1,1,2,3,2,2,3,4,3]) {
    state = playFour(state,fourMoves(state).find(move=>move.col===col))
  }
  assert.equal(state.result,null)
  assert.equal(chooseFour(state).col,3)
  state = playFour(state,fourMoves(state).find(move=>move.col===3))
  assert.equal(state.result.winner,1)
  assert.equal(state.winning.length,4)
})
