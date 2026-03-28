import { useState, useMemo } from 'react'

const I18N = {
  zh: {
    title: '🏸 羽毛球轮换排场工具',
    inputPlayers: '输入选手',
    placeholder: '1. 张三\n2. 李四\n3. 王五\n4. 赵六',
    ordered: '顺序',
    random: '随机',
    start: '开始比赛',
    alertMsg: (n) => `请输入4-8名选手，格式：序号. 名字，当前解析到 ${n} 名`,
    playerList: (n) => `选手列表 (${n}人)`,
    showIds: '显示编号',
    hideIds: '隐藏编号',
    reInput: '重新输入',
    round: (n) => `第 ${n} 场`,
    teamA: 'A队',
    teamB: 'B队',
    aWin: 'A队胜',
    bWin: 'B队胜',
    score: '比分：',
    scorePlaceholder: '21-18',
    nextMatch: '下一场',
    history: '历史记录',
    noHistory: '暂无比赛记录',
    colRound: '场次',
    colA: 'A队',
    colB: 'B队',
    colResult: '结果',
    colScore: '比分',
    aWinShort: 'A胜',
    bWinShort: 'B胜',
    stats: '个人统计',
    appearances: '出场',
    wins: '胜场',
    losses: '败场',
    winRate: '胜率',
  },
  ja: {
    title: '🏸 バドミントン ローテーションツール',
    inputPlayers: '選手を入力',
    placeholder: '1. 田中\n2. 鈴木\n3. 佐藤\n4. 山田',
    ordered: '順番',
    random: 'ランダム',
    start: '試合開始',
    alertMsg: (n) => `4〜8名を入力してください。現在 ${n} 名が解析されました`,
    playerList: (n) => `選手一覧 (${n}人)`,
    showIds: '番号表示',
    hideIds: '番号非表示',
    reInput: '再入力',
    round: (n) => `第 ${n} 試合`,
    teamA: 'Aチーム',
    teamB: 'Bチーム',
    aWin: 'A勝利',
    bWin: 'B勝利',
    score: 'スコア：',
    scorePlaceholder: '21-18',
    nextMatch: '次の試合',
    history: '試合履歴',
    noHistory: '試合記録なし',
    colRound: '試合',
    colA: 'Aチーム',
    colB: 'Bチーム',
    colResult: '結果',
    colScore: 'スコア',
    aWinShort: 'A勝',
    bWinShort: 'B勝',
    stats: '個人成績',
    appearances: '出場',
    wins: '勝利',
    losses: '敗北',
    winRate: '勝率',
  },
  en: {
    title: '🏸 Badminton Rotation Tool',
    inputPlayers: 'Enter Players',
    placeholder: '1. Alice\n2. Bob\n3. Carol\n4. Dave',
    ordered: 'Ordered',
    random: 'Random',
    start: 'Start',
    alertMsg: (n) => `Please enter 4-8 players. Currently parsed: ${n}`,
    playerList: (n) => `Players (${n})`,
    showIds: 'Show IDs',
    hideIds: 'Hide IDs',
    reInput: 'Reset',
    round: (n) => `Round ${n}`,
    teamA: 'Team A',
    teamB: 'Team B',
    aWin: 'Team A Wins',
    bWin: 'Team B Wins',
    score: 'Score:',
    scorePlaceholder: '21-18',
    nextMatch: 'Next Match',
    history: 'Match History',
    noHistory: 'No matches yet',
    colRound: 'Round',
    colA: 'Team A',
    colB: 'Team B',
    colResult: 'Result',
    colScore: 'Score',
    aWinShort: 'A Win',
    bWinShort: 'B Win',
    stats: 'Player Stats',
    appearances: 'Played',
    wins: 'Wins',
    losses: 'Losses',
    winRate: 'Win%',
  },
}

function parsePlayers(text) {
  const lines = text.trim().split('\n').filter(line => line.trim())
  const players = []
  for (const line of lines) {
    const match = line.trim().match(/^(\d+)[.．]\s*(.+)$/)
    if (match) {
      players.push({ id: parseInt(match[1]), name: match[2].trim() })
    }
  }
  return players
}

function generateNextMatch(players, history, lastMatch, ordered = false) {
  if (players.length === 0 || players.length < 4) return null

  const allPlayerIds = players.map(p => p.id)

  const playerStats = {}
  for (const p of players) {
    playerStats[p.id] = { appearances: 0, wins: 0, losses: 0 }
  }

  for (const match of history) {
    for (const pid of match.onField) {
      if (playerStats[pid]) {
        playerStats[pid].appearances++
        if (match.result === 'A_win' && match.teamA.includes(pid)) {
          playerStats[pid].wins++
        } else if (match.result === 'B_win' && match.teamB.includes(pid)) {
          playerStats[pid].wins++
        } else if (match.result) {
          playerStats[pid].losses++
        }
      }
    }
  }

  const mustPlay = lastMatch ? [...lastMatch.rested] : []
  const others = allPlayerIds
    .filter(id => !mustPlay.includes(id))
    .sort((a, b) => (playerStats[a]?.appearances || 0) - (playerStats[b]?.appearances || 0))

  let bestGroups = null
  let bestScore = Infinity

  const iterations = ordered ? 1 : 100
  for (let i = 0; i < iterations; i++) {
    const onField = [...mustPlay]
    const pool = [...others]
    while (onField.length < 4 && pool.length > 0) {
      const minApp = playerStats[pool[0]]?.appearances || 0
      const sameMin = pool.filter(id => (playerStats[id]?.appearances || 0) === minApp)
      const pick = ordered
        ? sameMin.reduce((a, b) => a < b ? a : b)
        : sameMin[Math.floor(Math.random() * sameMin.length)]
      onField.push(pick)
      pool.splice(pool.indexOf(pick), 1)
    }

    const candidates = [...onField]
    let found = false
    for (let a1 = 0; a1 < candidates.length && !found; a1++) {
      for (let a2 = a1 + 1; a2 < candidates.length && !found; a2++) {
        const teamA = [candidates[a1], candidates[a2]]
        const teamB = candidates.filter(id => !teamA.includes(id))

        let score = 0
        for (const match of history) {
          const prevA = match.teamA
          const prevB = match.teamB
          if (
            (teamA.includes(prevA[0]) && teamA.includes(prevA[1]) && teamB.includes(prevB[0]) && teamB.includes(prevB[1])) ||
            (teamA.includes(prevB[0]) && teamA.includes(prevB[1]) && teamB.includes(prevA[0]) && teamB.includes(prevA[1]))
          ) {
            score++
          }
        }

        if (score < bestScore) {
          bestScore = score
          bestGroups = { teamA, teamB, onField: [...onField] }
          if (score === 0) found = true
        }
      }
    }
  }

  return bestGroups
}

function getStats(players, history) {
  const stats = {}
  for (const p of players) {
    stats[p.id] = { ...p, appearances: 0, wins: 0, losses: 0 }
  }

  for (const match of history) {
    for (const pid of match.onField) {
      if (stats[pid]) {
        stats[pid].appearances++
        if (match.result === 'A_win' && match.teamA.includes(pid)) {
          stats[pid].wins++
        } else if (match.result === 'B_win' && match.teamB.includes(pid)) {
          stats[pid].wins++
        } else if (match.result) {
          stats[pid].losses++
        }
      }
    }
  }

  return Object.values(stats).sort((a, b) => b.appearances - a.appearances)
}

function InputParser({ onParse, t }) {
  const [text, setText] = useState('')
  const [ordered, setOrdered] = useState(true)

  const handleParse = () => {
    const players = parsePlayers(text)
    if (players.length >= 4 && players.length <= 8) {
      onParse(players, ordered)
    } else {
      alert(t.alertMsg(players.length))
    }
  }

  return (
    <div className="card input-area">
      <h2>{t.inputPlayers}</h2>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t.placeholder}
      />
      <div className="mode-row">
        <label>
          <input type="radio" checked={ordered} onChange={() => setOrdered(true)} /> {t.ordered}
        </label>
        <label>
          <input type="radio" checked={!ordered} onChange={() => setOrdered(false)} /> {t.random}
        </label>
      </div>
      <button className="btn" onClick={handleParse}>{t.start}</button>
    </div>
  )
}

function CurrentMatch({ players, match, onRecordResult, onNextMatch, showIds, t }) {
  if (!match) return null

  const getName = (id) => {
    const p = players.find(p => p.id === id)
    return p ? (showIds ? `${p.id}.${p.name}` : p.name) : ''
  }

  return (
    <div className="card">
      <div className="match-info">
        <div className="round-number">{t.round(match.round)}</div>

        <div className="teams">
          <div className="team team-a">
            <div className="team-label">{t.teamA}</div>
            <div className="players">
              {match.teamA.map(pid => (
                <div key={pid} className="player">{getName(pid)}</div>
              ))}
            </div>
          </div>
          <div className="team team-b">
            <div className="team-label">{t.teamB}</div>
            <div className="players">
              {match.teamB.map(pid => (
                <div key={pid} className="player">{getName(pid)}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="result-buttons">
          <button
            className={`btn result-btn btn-a-win ${match.result === 'A_win' ? 'selected' : ''}`}
            onClick={() => onRecordResult('A_win')}
          >
            {t.aWin}
          </button>
          <button
            className={`btn result-btn btn-b-win ${match.result === 'B_win' ? 'selected' : ''}`}
            onClick={() => onRecordResult('B_win')}
          >
            {t.bWin}
          </button>
        </div>

        <div className="score-input">
          <span>{t.score}</span>
          <input
            type="text"
            value={match.score || ''}
            onChange={e => onRecordResult(match.result, e.target.value)}
            placeholder={t.scorePlaceholder}
          />
        </div>

        <button className="btn btn-secondary" onClick={onNextMatch} style={{ marginTop: 20 }}>
          {t.nextMatch}
        </button>
      </div>
    </div>
  )
}

function MatchHistory({ players, history, onUpdateHistory, showIds, t }) {
  const [editingRound, setEditingRound] = useState(null)
  const [editValues, setEditValues] = useState({})

  const getName = (id) => {
    const p = players.find(p => p.id === id)
    return p ? (showIds ? `${p.id}.${p.name}` : p.name) : ''
  }

  const startEdit = (match) => {
    setEditingRound(match.round)
    setEditValues({ result: match.result, score: match.score || '' })
  }

  const saveEdit = (round) => {
    onUpdateHistory(round, editValues)
    setEditingRound(null)
  }

  if (history.length === 0) {
    return (
      <div className="card">
        <h2>{t.history}</h2>
        <div className="history-empty">{t.noHistory}</div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{t.history}</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>{t.colRound}</th>
            <th>{t.colA}</th>
            <th>{t.colB}</th>
            <th>{t.colResult}</th>
            <th>{t.colScore}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((match) => (
            <tr key={match.round}>
              <td>{match.round}</td>
              <td>{match.teamA.map(getName).join(' / ')}</td>
              <td>{match.teamB.map(getName).join(' / ')}</td>
              <td>
                {editingRound === match.round ? (
                  <select value={editValues.result || ''} onChange={e => setEditValues(v => ({ ...v, result: e.target.value || null }))}>
                    <option value="">-</option>
                    <option value="A_win">{t.aWinShort}</option>
                    <option value="B_win">{t.bWinShort}</option>
                  </select>
                ) : (
                  match.result === 'A_win' ? t.aWinShort : match.result === 'B_win' ? t.bWinShort : '-'
                )}
              </td>
              <td>
                {editingRound === match.round ? (
                  <input
                    style={{ width: 60 }}
                    value={editValues.score}
                    onChange={e => setEditValues(v => ({ ...v, score: e.target.value }))}
                    placeholder={t.scorePlaceholder}
                  />
                ) : (
                  match.score || '-'
                )}
              </td>
              <td>
                {editingRound === match.round ? (
                  <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => saveEdit(match.round)}>✓</button>
                ) : (
                  <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => startEdit(match)}>✎</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlayerStats({ stats, showIds, t }) {
  return (
    <div className="card">
      <h2>{t.stats}</h2>
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.id} className="stat-card">
            <div className="stat-name">{showIds ? `${s.id}.${s.name}` : s.name}</div>
            <div className="stat-row">
              <span className="stat-label">{t.appearances}</span>
              <span className="stat-value">{s.appearances}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{t.wins}</span>
              <span className="stat-value">{s.wins}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{t.losses}</span>
              <span className="stat-value">{s.losses}</span>
            </div>
            {s.appearances > 0 && (
              <div className="stat-row">
                <span className="stat-label">{t.winRate}</span>
                <span className="stat-value win-rate">
                  {Math.round(s.wins / s.appearances * 100)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [players, setPlayers] = useState([])
  const [history, setHistory] = useState([])
  const [currentMatch, setCurrentMatch] = useState(null)
  const [round, setRound] = useState(0)
  const [showIds, setShowIds] = useState(false)
  const [ordered, setOrdered] = useState(true)
  const [lang, setLang] = useState('zh')

  const t = I18N[lang]

  const handleParse = (parsedPlayers, isOrdered) => {
    setOrdered(isOrdered)
    setPlayers(parsedPlayers)
    setHistory([])
    setRound(0)
    setCurrentMatch(null)

    const firstMatch = generateNextMatch(parsedPlayers, [], null, isOrdered)
    if (firstMatch) {
      setRound(1)
      setCurrentMatch({ round: 1, ...firstMatch, result: null, score: '' })
    }
  }

  const handleRecordResult = (result, score) => {
    if (!currentMatch) return
    setCurrentMatch(prev => ({
      ...prev,
      result: result !== undefined ? result : prev.result,
      score: score !== undefined ? score : prev.score,
    }))
  }

  const handleUpdateHistory = (round, { result, score }) => {
    setHistory(prev => prev.map(m => m.round === round ? { ...m, result: result || null, score } : m))
  }

  const handleNextMatch = () => {
    if (!currentMatch) return

    const rested = players.map(p => p.id).filter(id => !currentMatch.onField.includes(id))
    const newHistory = [...history, { ...currentMatch, rested }]
    setHistory(newHistory)

    const nextMatch = generateNextMatch(players, newHistory, { onField: currentMatch.onField, rested }, ordered)
    if (nextMatch) {
      setRound(round + 1)
      setCurrentMatch({ round: round + 1, ...nextMatch, result: null, score: '' })
    }
  }

  const stats = useMemo(() => getStats(players, history), [players, history])

  return (
    <div className="container">
      <header className="app-header">
        <h1>{t.title}</h1>
        <div className="lang-switcher">
          {['zh', 'ja', 'en'].map(l => (
            <button
              key={l}
              className={`lang-btn ${lang === l ? 'active' : ''}`}
              onClick={() => setLang(l)}
            >
              {l === 'zh' ? '中文' : l === 'ja' ? '日本語' : 'EN'}
            </button>
          ))}
        </div>
      </header>

      {players.length === 0 && (
        <InputParser onParse={handleParse} t={t} />
      )}

      {players.length > 0 && (
        <>
          <div className="card">
            <div className="card-header">
              <h2>{t.playerList(players.length)}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowIds(v => !v)}>
                {showIds ? t.hideIds : t.showIds}
              </button>
            </div>
            <div className="player-list">
              {players.map(p => (
                <span key={p.id} className="player-tag">
                  {showIds && <span className="player-id">{p.id}.</span>}{p.name}
                </span>
              ))}
            </div>
            <button className="btn btn-reset" onClick={() => { setPlayers([]); setHistory([]); setCurrentMatch(null) }}>
              {t.reInput}
            </button>
          </div>

          <CurrentMatch
            players={players}
            match={currentMatch}
            onRecordResult={handleRecordResult}
            onNextMatch={handleNextMatch}
            showIds={showIds}
            t={t}
          />

          <MatchHistory players={players} history={history} onUpdateHistory={handleUpdateHistory} showIds={showIds} t={t} />

          <PlayerStats stats={stats} showIds={showIds} t={t} />
        </>
      )}
    </div>
  )
}
