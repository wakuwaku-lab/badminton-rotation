import { useState, useMemo, useEffect, useRef } from 'react'

const API_URL = 'https://exia-lion-dev-ed.my.site.com/api/services/apexrest/exia/booking'
const API_TOKEN = '0a26af12a8e2dff9ba4309390683f478'

async function apiPost(payload) {
  const res = await fetch(`${API_URL}?token=${API_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

async function apiGet(hash) {
  const res = await fetch(`${API_URL}?token=${API_TOKEN}&hash=${hash}`)
  return res.json()
}

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
    confirmReset: '确定要重新输入吗？所有比赛记录将被清除。',
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
    confirmReset: 'リセットしますか？試合記録がすべて削除されます。',
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
    confirmReset: 'Reset all data? All match records will be lost.',
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

function InputParser({ onParse, loading, t }) {
  const [text, setText] = useState('')
  const [ordered, setOrdered] = useState(true)

  const handleParse = () => {
    const players = parsePlayers(text)
    if (players.length >= 4 && players.length <= 8) {
      const extra = text.trim().split('\n')
        .filter(line => line.trim() && !line.trim().match(/^(\d+)[.．]\s*.+$/))
        .join('\n')
      onParse(players, ordered, text, extra)
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
      <button className="btn" onClick={handleParse} disabled={loading}>{loading ? '...' : t.start}</button>
    </div>
  )
}

function CurrentMatch({ players, match, nextMatch, onRecordResult, onNextMatch, showIds, loading, t }) {
  if (!match) return null
  const [slide, setSlide] = useState(0) // 0=current, 1=next

  const getName = (id) => {
    const p = players.find(p => p.id === id)
    return p ? (showIds ? `${p.id}.${p.name}` : p.name) : ''
  }

  const displayed = slide === 1 && nextMatch ? nextMatch : match
  const isPreview = slide === 1 && nextMatch

  return (
    <div className="card">
      <div className="match-info">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSlide(0)} disabled={slide === 0}>‹</button>
          <div className="round-number" style={{ margin: 0 }}>
            {isPreview ? `${t.round(displayed.round)} (preview)` : t.round(displayed.round)}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSlide(1)} disabled={slide === 1 || !nextMatch}>›</button>
        </div>

        <div className="teams">
          <div className="team team-a">
            <div className="team-label">{t.teamA}</div>
            <div className="players">
              {displayed.teamA.map(pid => (
                <div key={pid} className="player">{getName(pid)}</div>
              ))}
            </div>
          </div>
          <div className="team team-b">
            <div className="team-label">{t.teamB}</div>
            <div className="players">
              {displayed.teamB.map(pid => (
                <div key={pid} className="player">{getName(pid)}</div>
              ))}
            </div>
          </div>
        </div>

        {!isPreview && <>
          <div className="result-buttons">
            <button
              className={`btn result-btn btn-a-win ${match.result === 'A_win' ? 'selected' : ''}`}
              onClick={() => onRecordResult('A_win')}
            >{t.aWin}</button>
            <button
              className={`btn result-btn btn-b-win ${match.result === 'B_win' ? 'selected' : ''}`}
              onClick={() => onRecordResult('B_win')}
            >{t.bWin}</button>
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
          <button className="btn btn-secondary" onClick={() => { onNextMatch(); setSlide(0) }} style={{ marginTop: 20 }} disabled={loading}>
            {loading ? '...' : t.nextMatch}
          </button>
        </>}
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
  const [viewMode, setViewMode] = useState('table')
  const getName = s => showIds ? `${s.id}.${s.name}` : s.name

  return (
    <div className="card">
      <div className="card-header">
        <h2>{t.stats}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}>
          {viewMode === 'table' ? '☰' : '⊞'}
        </button>
      </div>

      {viewMode === 'table' ? (
        <table className="history-table">
          <thead>
            <tr>
              <th>名前</th>
              <th>{t.appearances}</th>
              <th>{t.wins}</th>
              <th>{t.losses}</th>
              <th>{t.winRate}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.id}>
                <td>{getName(s)}</td>
                <td>{s.appearances}</td>
                <td>{s.wins}</td>
                <td>{s.losses}</td>
                <td>{s.appearances > 0 ? `${Math.round(s.wins / s.appearances * 100)}%` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.id} className="stat-card">
              <div className="stat-name">{getName(s)}</div>
              <div className="stat-row"><span className="stat-label">{t.appearances}</span><span className="stat-value">{s.appearances}</span></div>
              <div className="stat-row"><span className="stat-label">{t.wins}</span><span className="stat-value">{s.wins}</span></div>
              <div className="stat-row"><span className="stat-label">{t.losses}</span><span className="stat-value">{s.losses}</span></div>
              {s.appearances > 0 && (
                <div className="stat-row"><span className="stat-label">{t.winRate}</span><span className="stat-value win-rate">{Math.round(s.wins / s.appearances * 100)}%</span></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [players, setPlayers] = useState([])
  const [history, setHistory] = useState([])
  const [currentMatch, setCurrentMatch] = useState(null)
  const [round, setRound] = useState(0)
  const [showIds, setShowIds] = useState(true)
  const [ordered, setOrdered] = useState(true)
  const [lang, setLang] = useState('zh')
  const [bookingHash, setBookingHash] = useState(null)
  const [bookingUpdatedAt, setBookingUpdatedAt] = useState(null)
  const [bookingData0, setBookingData0] = useState(null)
  const [extra, setExtra] = useState('')
  const [playerTab, setPlayerTab] = useState('players')
  const [loading, setLoading] = useState(false)
  const bookingUpdatedAtRef = useRef(null)

  const t = I18N[lang]

  const restoreFromResp = (resp, isOrdered) => {
    if (!resp.hash) return false
    let restoredHistory = []
    let restoredPlayers = []
    try {
      const saved = JSON.parse(resp.data)
      if (Array.isArray(saved.history)) restoredHistory = saved.history
      if (Array.isArray(saved.players)) restoredPlayers = saved.players
      if (saved.type) setOrdered(saved.type === 'ordered')
      if (saved.extra) setExtra(saved.extra)
    } catch (_) {}
    setPlayers(restoredPlayers)
    setHistory(restoredHistory)
    setBookingHash(resp.hash)
    setBookingUpdatedAt(resp.updatedAt)
    setBookingData0(resp.data0 || null)
    const lastMatch = restoredHistory.length > 0 ? restoredHistory[restoredHistory.length - 1] : null
    const nextMatch = generateNextMatch(
      restoredPlayers, restoredHistory,
      lastMatch ? { onField: lastMatch.onField, rested: lastMatch.rested } : null,
      isOrdered
    )
    if (nextMatch) {
      const newRound = restoredHistory.length + 1
      setRound(newRound)
      setCurrentMatch({ round: newRound, ...nextMatch, result: null, score: '' })
    }
    return true
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = params.get('hash')
    if (!hash) return
    apiGet(hash).then(resp => restoreFromResp(resp, true))
  }, [])

  // keep ref in sync so polling can read latest value without stale closure
  useEffect(() => { bookingUpdatedAtRef.current = bookingUpdatedAt }, [bookingUpdatedAt])

  // auto-polling: refresh when another client updates the record
  useEffect(() => {
    if (!bookingHash) return
    const id = setInterval(async () => {
      if (loading) return
      const resp = await apiGet(bookingHash)
      if (resp.updatedAt && resp.updatedAt !== bookingUpdatedAtRef.current) {
        restoreFromResp(resp, ordered)
      }
    }, 10000)
    return () => clearInterval(id)
  }, [bookingHash, ordered])

  const handleParse = async (parsedPlayers, isOrdered, rawText, extraText) => {
    if (loading) return
    setLoading(true)
    setOrdered(isOrdered)
    setHistory([])
    setRound(0)
    setCurrentMatch(null)
    setBookingHash(null)
    setBookingUpdatedAt(null)
    setBookingData0(null)
    setExtra(extraText || '')

    const data0 = JSON.stringify({ players: rawText.trim(), type: isOrdered ? 'ordered' : 'random' })

    const resp = await apiPost({
      type: 'badminton-rotation',
      data0,
      data: JSON.stringify({ players: parsedPlayers, type: isOrdered ? 'ordered' : 'random', history: [], extra: extraText || '' }),
      ua: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fingerprint: navigator.userAgent + screen.width + screen.height,
    })

    if (restoreFromResp(resp, isOrdered)) {
      // update URL
      const url = new URL(window.location)
      url.searchParams.set('hash', resp.hash)
      window.history.replaceState({}, '', url)
    }
    setLoading(false)
  }

  const handleRecordResult = (result, score) => {
    if (!currentMatch) return
    setCurrentMatch(prev => ({
      ...prev,
      result: result !== undefined ? result : prev.result,
      score: score !== undefined ? score : prev.score,
    }))
  }

  const handleUpdateHistory = async (round, { result, score }) => {
    if (loading) return
    setLoading(true)
    const newHistory = history.map(m => m.round === round ? { ...m, result: result || null, score } : m)
    setHistory(newHistory)
    if (bookingHash && bookingUpdatedAt) {
      const data = JSON.stringify({ players, type: ordered ? 'ordered' : 'random', history: newHistory, extra })
      const resp = await apiPost({
        type: 'badminton-rotation',
        data0: bookingData0,
        data,
        ua: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        fingerprint: navigator.userAgent + screen.width + screen.height,
        hash: bookingHash,
        updatedAt: bookingUpdatedAt,
      })
      if (resp.updatedAt) setBookingUpdatedAt(resp.updatedAt)
    }
    setLoading(false)
  }

  const handleNextMatch = async () => {
    if (!currentMatch || loading) return
    setLoading(true)

    const rested = players.map(p => p.id).filter(id => !currentMatch.onField.includes(id))
    const newHistory = [...history, { ...currentMatch, rested }]
    setHistory(newHistory)

    const nextMatch = generateNextMatch(players, newHistory, { onField: currentMatch.onField, rested }, ordered)
    if (nextMatch) {
      const newRound = round + 1
      setRound(newRound)
      setCurrentMatch({ round: newRound, ...nextMatch, result: null, score: '' })
    }

    if (bookingHash && bookingUpdatedAt) {
      const data = JSON.stringify({ players, type: ordered ? 'ordered' : 'random', history: newHistory, extra })
      const resp = await apiPost({
        type: 'badminton-rotation',
        data0: bookingData0,
        data,
        ua: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        fingerprint: navigator.userAgent + screen.width + screen.height,
        hash: bookingHash,
        updatedAt: bookingUpdatedAt,
      })
      if (resp.updatedAt) setBookingUpdatedAt(resp.updatedAt)
    }
    setLoading(false)
  }

  const stats = useMemo(() => getStats(players, history), [players, history])

  const previewNextMatch = useMemo(() => {
    if (!currentMatch || players.length === 0) return null
    const rested = players.map(p => p.id).filter(id => !currentMatch.onField.includes(id))
    const tempHistory = [...history, { ...currentMatch, rested }]
    const nm = generateNextMatch(players, tempHistory, { onField: currentMatch.onField, rested }, ordered)
    return nm ? { round: round + 1, ...nm } : null
  }, [currentMatch, history, players, ordered, round])

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
        <InputParser onParse={handleParse} loading={loading} t={t} />
      )}

      {players.length > 0 && (
        <>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className={`btn btn-sm ${playerTab === 'players' ? '' : 'btn-secondary'}`}
                  onClick={() => setPlayerTab('players')}
                >{t.playerList(players.length)}</button>
                {extra && (
                  <button
                    className={`btn btn-sm ${playerTab === 'extra' ? '' : 'btn-secondary'}`}
                    onClick={() => setPlayerTab('extra')}
                  >📋</button>
                )}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowIds(v => !v)}>
                {showIds ? t.hideIds : t.showIds}
              </button>
            </div>
            {playerTab === 'players' ? (
              <div className="player-list">
                {players.map(p => (
                  <span key={p.id} className="player-tag">
                    {showIds && <span className="player-id">{p.id}.</span>}{p.name}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-line', padding: '8px 0', color: '#444' }}>{extra}</div>
            )}
            <button className="btn btn-reset" onClick={() => { if (window.confirm(t.confirmReset)) { setPlayers([]); setHistory([]); setCurrentMatch(null) } }}>
              {t.reInput}
            </button>
          </div>

          <CurrentMatch
            players={players}
            match={currentMatch}
            nextMatch={previewNextMatch}
            onRecordResult={handleRecordResult}
            onNextMatch={handleNextMatch}
            showIds={showIds}
            loading={loading}
            t={t}
          />

          <MatchHistory players={players} history={history} onUpdateHistory={handleUpdateHistory} showIds={showIds} t={t} />

          <PlayerStats stats={stats} showIds={showIds} t={t} />
        </>
      )}
    </div>
  )
}
